'use strict';
/**
 * Guardian Bot 2 — Data Quality, Pricing & Sanitizer Guardian ("Curator" + AVM).
 * ─────────────────────────────────────────────────────────────────────────────
 * Mission 4 (2026-11-01). Continuously studies daily incoming prices per
 * compound in New Cairo, updates the AI Fair-Market Price benchmark
 * (listings.ai_fair_price ↔ the AI_Fair_Price_Benchmark column) on every
 * unit card, and learns price trends into unified_memory.
 *
 * Also enforces Sanitizer v3 on PUBLIC descriptions: every 10/11-digit
 * Egyptian owner mobile is redacted from descriptions, and public inquiries
 * are routed to the Sierra concierge +201092048333 (never a raw owner
 * number).
 *
 * Cadence: hourly at :05 (runner cron lane).
 */

const { supabase, withBackoff, runGuardian } = require('../lib/guardian-kit');
const { resolveCanonicalCompound } = require('../lib/compound-canonical');

const CONCIERGE = '+201092048333';
const CONCIERGE_LAST10 = '1092048333';

// Sanitizer v3 — separator-tolerant Egyptian mobiles (mirrors
// workflows/12-telegram-intake/redact.js; one doctrine, two enforcement
// points) plus labeled-context malformed digits.
const SEP = String.raw`[\s\-().\u00a0\u202f]?`;
const PHONE_RE = new RegExp(
  String.raw`(?<![0-9A-Za-z])` +
    String.raw`(?:\+${SEP}2${SEP}0${SEP}|0${SEP}0${SEP}2${SEP}0${SEP}|0${SEP}2${SEP}0${SEP}|0${SEP}|2${SEP}0${SEP})?` +
    `1${SEP}[0125]${SEP}` +
    Array.from({ length: 8 }, () => String.raw`\d`).join(SEP) +
    String.raw`(?![0-9A-Za-z])`,
  'g',
);

function toWesternDigits(s) {
  return String(s || '').replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) & 0xf));
}

/** Sanitize a public description: owner mobiles → concierge routing line. */
function sanitizePublicDescription(raw) {
  let out = toWesternDigits(String(raw || ''));
  let redacted = 0;
  // wa.me deep links — with or without protocol — always route to the concierge.
  out = out.replace(/(?:https?:\/\/)?(?:www\.)?wa\.me\/\+?[0-9][0-9\s\-().]*/gi, `https://wa.me/201092048333`);
  out = out.replace(PHONE_RE, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.slice(-10) === CONCIERGE_LAST10) return match; // idempotent
    redacted++;
    return `[Contact Sierra Estates concierge ${CONCIERGE} — reference the unit code]`;
  });
  return { text: out.trim(), redacted };
}

async function curatorGuardian(ctx) {
  const sb = supabase();
  const stats = { compoundsStudied: 0, benchmarksUpdated: 0, sanitized: 0, redactions: 0, trends: 0 };

  // ── 1. Study daily incoming prices per compound (New Cairo focus) ──────
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let fresh = [];
  try {
    const { data, error } = await withBackoff(() => sb.from('listings')
      .select('id,compound,deal_type,price,area_sqm,created_at,ai_fair_price')
      .gte('created_at', dayAgo)
      .gte('price', 1)
      .limit(10000), 'fresh-prices');
    if (error) throw error;
    fresh = data || [];
  } catch (e) { ctx.log(`price study read failed: ${e.message}`); }

  // Per (compound, deal_type): price-per-SQM statistics + a market-wide set
  // for units without fresh comps.
  const buckets = new Map(); // key → [pricePerSqm…]
  const marketWide = new Map(); // dealType → [pricePerSqm…]
  const perCompoundDeal = new Map(); // key → units (fresh)
  for (const u of fresh) {
    const compound = resolveCanonicalCompound(u.compound);
    const deal = String(u.deal_type || '').toLowerCase() || 'sale';
    const sqm = Number(u.area_sqm);
    const price = Number(u.price);
    if (!(sqm > 0) || !(price > 0)) continue;
    const pps = price / sqm;
    const key = `${compound}|${deal}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(pps);
    if (!perCompoundDeal.has(key)) perCompoundDeal.set(key, []);
    perCompoundDeal.get(key).push(u);
    if (!marketWide.has(deal)) marketWide.set(deal, []);
    marketWide.get(deal).push(pps);
  }

  const median = (arr) => {
    if (!arr || !arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  // ── 2. Update the AI Fair-Price benchmark on every unit card ────────────
  try {
    const { data: cards } = await withBackoff(() => sb.from('listings')
      .select('id,compound,deal_type,price,area_sqm,ai_fair_price,updated_at')
      .limit(20000), 'unit-cards');
    for (const card of cards || []) {
      const compound = resolveCanonicalCompound(card.compound);
      const deal = String(card.deal_type || '').toLowerCase() || 'sale';
      const sqm = Number(card.area_sqm);
      if (!(sqm > 0)) continue;
      const key = `${compound}|${deal}`;
      const med = median(buckets.get(key)) || median(marketWide.get(deal));
      if (!med || !Number.isFinite(med)) continue;
      const fair = Math.round(med * sqm);
      // Skip no-op writes (idempotence keeps API usage low).
      if (Number(card.ai_fair_price) === fair) continue;
      try {
        await withBackoff(() => sb.from('listings').update({
          ai_fair_price: fair,
          updated_at: new Date().toISOString(),
        }).eq('id', card.id), `fair:${card.id}`);
        stats.benchmarksUpdated++;
      } catch (e) { ctx.log(`fair price update failed ${card.id}: ${e.message}`); }
    }
  } catch (e) { ctx.log(`unit cards read failed: ${e.message}`); }

  stats.compoundsStudied = buckets.size;

  // ── 3. Learn price trends into unified_memory (per compound, per day) ───
  for (const [key, ppsList] of buckets) {
    const [compound, deal] = key.split('|');
    const med = median(ppsList);
    const count = ppsList.length;
    if (!med || count < 3) continue; // too thin to call a trend
    await ctx.learn('curator-guardian', {
      kind: 'price_trend',
      title: `${compound} — ${deal} — EGP ${Math.round(med).toLocaleString()}/SQM (${count} comps)`,
      body: {
        compound, dealType: deal,
        medianPricePerSqm: Math.round(med),
        sampleSize: count,
        asOf: new Date().toISOString(),
      },
      tags: ['pricing', 'avm', 'trend', compound.toLowerCase().replace(/\s+/g, '-')],
      ttlDays: 180,
    });
    stats.trends++;
  }

  // ── 4. Sanitizer v3 sweep on PUBLIC descriptions ─────────────────────────
  try {
    const { data: publicUnits } = await withBackoff(() => sb.from('listings')
      .select('id,code,description')
      .eq('publish_to_client', true)
      .limit(5000), 'public-descriptions');
    for (const unit of publicUnits || []) {
      if (!unit.description) continue;
      const { text, redacted } = sanitizePublicDescription(unit.description);
      if (redacted > 0) {
        await withBackoff(() => sb.from('listings').update({
          description: text,
          updated_at: new Date().toISOString(),
        }).eq('id', unit.id), `sanitize:${unit.id}`);
        stats.sanitized++;
        stats.redactions += redacted;
        await ctx.activity('curator-guardian',
          `🔒 Sanitizer v3: ${redacted} owner mobile(s) redacted from public description of ${unit.code || unit.id} — inquiries route to ${CONCIERGE}.`,
          { unit: unit.code });
      }
    }
  } catch (e) { ctx.log(`sanitizer sweep failed: ${e.message}`); }

  return stats;
}

if (require.main === module) {
  runGuardian({
    botId: 'curator-guardian',
    name: 'Data Quality, Pricing & Sanitizer Guardian',
    cron: '5 * * * *',
    fn: curatorGuardian,
  })();
}

module.exports = { curatorGuardian, sanitizePublicDescription, CONCIERGE };
