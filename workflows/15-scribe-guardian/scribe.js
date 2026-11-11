'use strict';
/**
 * Guardian Bot 1 — Supply & Harvester Guardian ("Scribe" + OpenClaw Harvester).
 * ─────────────────────────────────────────────────────────────────────────────
 * Mission 4 (2026-11-01). Monitors the supply lifecycle end-to-end:
 *
 *   · Agent Telegram groups + WhatsApp broker groups + owner responses —
 *     watches the intake ledger (bot.js .state) and the Supabase intake
 *     tables for fresh units, verifying the S1/S2 supply contract.
 *   · Flags Featured / Gem units (💎 GEM): priced ≥ 15 % below the compound
 *     average (deal-type aware) or carrying prime views (sea/landscape/pool/
 *     garden/open) — sets listings.is_featured_gem + tag.
 *   · Missing-photo queue: a Featured / Direct-Owner unit with zero photos
 *     gets a WhatsApp photo-request job enqueued to the owner/broker; if the
 *     request is unanswered for 12 h, the Admin OS (Telegram) is alerted.
 *
 * Cadence: every 30 minutes (runner cron lane). Exit 0 ok · 1 error · 2
 * unconfigured (SUMMARY line contract).
 */

const { supabase, withBackoff, runGuardian } = require('../lib/guardian-kit');
const { resolveCanonicalCompound } = require('../lib/compound-canonical');

const GEM_DISCOUNT_THRESHOLD = 0.15; // ≥ 15 % below compound average
const PHOTO_REQUEST_TIMEOUT_H = 12;

const PRIME_VIEW_WORDS = [
  'sea view', 'landscape', 'garden view', 'pool view', 'open view',
  'فيو بحر', 'لاند سكيب', 'لاندسكيب', 'جاردن', 'حمام سباحة', 'فيو مفتوح', 'إطلالة',
];

function hasPrimeView(text) {
  const low = String(text || '').toLowerCase();
  return PRIME_VIEW_WORDS.some((w) => low.includes(w));
}

async function scribeGuardian(ctx) {
  const sb = supabase();
  const stats = { scanned: 0, gems: 0, photoRequests: 0, alerts12h: 0, supplyDelta: 0 };

  // ── 1. Supply watch: last-30-minute intake volume (agent groups + WA) ──
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  let fresh = [];
  try {
    const { data, error } = await withBackoff(() => sb.from('listings')
      .select('id,code,compound,deal_type,price,area_sqm,images,photo_count,source_channel,owner_phone,description,tag,is_featured_gem,created_at')
      .gte('created_at', since), 'fresh-units');
    if (error) throw error;
    fresh = data || [];
  } catch (e) {
    ctx.log(`supply watch read failed: ${e.message}`);
  }
  stats.supplyDelta = fresh.length;
  stats.scanned = fresh.length;

  // ── 2. Gem detection: price ≥ 15 % below compound average (same deal
  //      type) or prime view. Works on the fresh batch + today's backlog.
  let candidates = fresh;
  if (!candidates.length) {
    const today = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    try {
      const { data } = await withBackoff(() => sb.from('listings')
        .select('id,code,compound,deal_type,price,area_sqm,images,photo_count,source_channel,owner_phone,description,tag,is_featured_gem,created_at')
        .gte('created_at', today), 'backlog-units');
      candidates = data || [];
      stats.scanned = candidates.length;
    } catch (e) { ctx.log(`backlog read failed: ${e.message}`); }
  }

  if (candidates.length) {
    // Compound averages per deal type (computed over the wider market set).
    const avgByCompound = new Map();
    try {
      const { data } = await withBackoff(() => sb.from('listings')
        .select('compound,deal_type,price')
        .gte('price', 1)
        .limit(20000), 'market-set');
      const buckets = new Map();
      for (const r of data || []) {
        const key = `${resolveCanonicalCompound(r.compound)}|${String(r.deal_type || '').toLowerCase()}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(Number(r.price));
      }
      for (const [key, prices] of buckets) {
        avgByCompound.set(key, prices.reduce((a, b) => a + b, 0) / prices.length);
      }
    } catch (e) { ctx.log(`market average read failed: ${e.message}`); }

    for (const unit of candidates) {
      const compound = resolveCanonicalCompound(unit.compound);
      const avg = avgByCompound.get(`${compound}|${String(unit.deal_type || '').toLowerCase()}`);
      const price = Number(unit.price);
      let gemReason = null;
      if (avg && avg > 0 && price > 0 && (avg - price) / avg >= GEM_DISCOUNT_THRESHOLD) {
        gemReason = `price ${Math.round(((avg - price) / avg) * 100)}% below ${compound} average (${Math.round(avg).toLocaleString()} EGP)`;
      } else if (hasPrimeView(unit.description)) {
        gemReason = 'prime view';
      }
      if (gemReason && !unit.is_featured_gem) {
        try {
          await withBackoff(() => sb.from('listings').update({
            is_featured_gem: true,
            tag: '💎 GEM',
            updated_at: new Date().toISOString(),
          }).eq('id', unit.id), `gem:${unit.id}`);
          stats.gems++;
          await ctx.activity('scribe-guardian', `💎 GEM flagged: ${unit.code || unit.id} — ${gemReason}`, { unit: unit.code });
          await ctx.learn('scribe-guardian', {
            kind: 'gem_detected',
            title: `GEM ${unit.code || unit.id} — ${compound}`,
            body: { reason: gemReason, price, average: avg || null, dealType: unit.deal_type },
            tags: ['gem', 'pricing', compound.toLowerCase().replace(/\s+/g, '-')],
          });
        } catch (e) { ctx.log(`gem flag failed ${unit.id}: ${e.message}`); }
      }
    }
  }

  // ── 3. Missing-photo queue on Featured / Direct-Owner units ────────────
  try {
    const { data: photoless } = await withBackoff(() => sb.from('listings')
      .select('id,code,compound,owner_phone,owner_name,created_at,is_featured_gem,source_channel')
      .or('photo_count.eq.0,photo_count.is.null')
      .in('source_channel', ['Direct Owner', 'sheets_new_units', 'owner_direct', 'sheets', 'direct'])
      .limit(200), 'photoless-units');

    // Batch query existing photo requests in one network roundtrip
    const { data: existingQueue } = await sb.from('whatsapp_queue')
      .select('status,created_at,metadata')
      .not('metadata', 'is', null)
      .limit(1000);

    const existingMap = new Map();
    for (const q of existingQueue || []) {
      const ref = q.metadata?.reference;
      if (ref) existingMap.set(ref, q);
    }

    const toInsert = [];
    for (const unit of photoless || []) {
      if (!unit.owner_phone) continue;
      const ref = `photo-request:${unit.code || unit.id}`;
      const existing = existingMap.get(ref);

      if (existing) {
        // 12h unanswered → alert the Admin OS once.
        const queuedAt = Date.parse(existing.created_at || 0);
        if (existing.status !== 'sent' && Date.now() - queuedAt > PHOTO_REQUEST_TIMEOUT_H * 3600000) {
          await ctx.telegramAlert(
            `📸 <b>Photo request unanswered ${Math.round((Date.now() - queuedAt) / 3600000)}h</b> — ` +
            `unit <code>${unit.code || unit.id}</code> (${resolveCanonicalCompound(unit.compound)}), ` +
            `featured=${unit.is_featured_gem ? 'YES 💎' : 'no'}. Owner follow-up needed.`);
          stats.alerts12h++;
        }
        continue;
      }

      toInsert.push({
        recipient_phone: unit.owner_phone,
        message_body: [
          `مساء الخير 🌟 معك فريق Sierra Estates.`,
          `بخصوص وحدتكم ${resolveCanonicalCompound(unit.compound)}${unit.code ? ` (كود ${unit.code})` : ''} —`,
          `ممكن صور الوحدة؟ الصور بتزود فرص العرض بشكل كبير.`,
          `لإلغاء الرسائل رد بكلمة "إلغاء"`,
        ].join('\n'),
        status: 'pending',
        metadata: {
          reference: ref,
          priority: unit.is_featured_gem ? 'high' : 'normal',
        },
        created_at: new Date().toISOString(),
      });
      existingMap.set(ref, { status: 'pending', created_at: new Date().toISOString() });
      stats.photoRequests++;
    }

    if (toInsert.length) {
      // Chunked insert for efficiency
      for (let i = 0; i < toInsert.length; i += 50) {
        const chunk = toInsert.slice(i, i + 50);
        await withBackoff(() => sb.from('whatsapp_queue').insert(chunk), `photo-requests-chunk-${i}`);
      }
    }
  } catch (e) { ctx.log(`photo queue failed: ${e.message}`); }

  // ── 4. Learning: supply trend checkpoint ────────────────────────────────
  await ctx.learn('scribe-guardian', {
    kind: 'supply_pulse',
    title: `Supply pulse ${new Date().toISOString().slice(0, 16)}`,
    body: { freshUnits30m: stats.supplyDelta, scanned: stats.scanned, gems: stats.gems },
    tags: ['supply', 'pulse'],
    ttlDays: 30,
  });

  return stats;
}

if (require.main === module) {
  runGuardian({
    botId: 'scribe-guardian',
    name: 'Supply & Harvester Guardian',
    cron: '*/30 * * * *',
    fn: scribeGuardian,
  })();
}

module.exports = { scribeGuardian, hasPrimeView, GEM_DISCOUNT_THRESHOLD };
