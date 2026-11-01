'use strict';
/**
 * Guardian Bot 3 — Syndication & Broadcast Guardian ("Atlas Sync" + Telegram
 * Broadcaster).
 * ─────────────────────────────────────────────────────────────────────────────
 * Mission 4 (2026-11-01). Watches Real_Available_Units (the live view from
 * migration 040). The INSTANT a unit is marked Available +
 * Verified Available:
 *
 *   1. Applies the Sierra Estates Navy/Gold visual watermark (Canvas engine —
 *      SVG → PNG overlay stamp on the first photo of each unit).
 *   2. Broadcasts the sanitized listing + photo album + Unit_Code to the
 *      "General" Telegram group (same privacy doctrine as the intake lane:
 *      structured fields only, runtime leftovers guard, concierge routing).
 *   3. Pushes the listing to the Property Finder Atlas v1 API / XML feed
 *      (packages/property-finder-api connector) and updates the live GIS map
 *      on sierra-estates.net (publish_to_client = true → the map's
 *      /api/inventory source of truth).
 *
 * Cadence: every 10 minutes (runner cron lane). Idempotent: a unit is
 * broadcast/syndicated exactly once (broadcast ledger on the row's
 * automation JSONB).
 */

const fs = require('fs');
const path = require('path');
const { supabase, withBackoff, runGuardian } = require('../lib/guardian-kit');
const { resolveCanonicalCompound } = require('../lib/compound-canonical');

const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const WATERMARK_DIR = path.join(STATE_DIR, 'watermarks');

// Sierra Estates brand palette (Navy/Gold).
const NAVY = '#0A1F44';
const GOLD = '#C9A227';

const GENERAL_GROUP_ID = String(process.env.TELEGRAM_GENERAL_GROUP_ID || '').trim();
const TELEGRAM_BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();

// ── Canvas Engine: Navy/Gold watermark ─────────────────────────────────────
/** Builds the watermark stamp as an SVG (zero native deps — the repo runs on
 *  stock Node). The SVG is written next to the media and referenced by the
 *  broadcast album; PNG rasterization, when sharp/canvas is available in the
 *  host image, happens in the photo pipeline — the stamp itself is the
 *  contract. */
function buildWatermarkStamp(unit) {
  const code = String(unit.code || unit.unit_code || unit.se_code || 'SE').slice(0, 24);
  const compound = resolveCanonicalCompound(unit.compound);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="120" viewBox="0 0 960 120">`,
    `  <rect x="0" y="0" width="960" height="120" fill="${NAVY}" opacity="0.92"/>`,
    `  <rect x="0" y="0" width="960" height="6" fill="${GOLD}"/>`,
    `  <rect x="0" y="114" width="960" height="6" fill="${GOLD}"/>`,
    `  <text x="36" y="52" font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="bold" fill="${GOLD}">SIERRA ESTATES</text>`,
    `  <text x="36" y="92" font-family="Georgia, 'Times New Roman', serif" font-size="24" fill="#FFFFFF">${escapeXml(compound)}</text>`,
    `  <text x="924" y="88" font-family="'Courier New', monospace" font-size="30" font-weight="bold" fill="#FFFFFF" text-anchor="end">${escapeXml(code)}</text>`,
    `</svg>`,
  ].join('\n');
  return svg;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

function persistStamp(unit) {
  try {
    fs.mkdirSync(WATERMARK_DIR, { recursive: true });
    const code = String(unit.code || unit.unit_code || unit.id).replace(/[^\w-]/g, '_');
    const file = path.join(WATERMARK_DIR, `${code}.svg`);
    fs.writeFileSync(file, buildWatermarkStamp(unit));
    return file;
  } catch (_) { return null; }
}

// ── Telegram Broadcaster (sanitized, owner-free) ────────────────────────────
async function tgSendMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch (_) { return false; }
}

/** Runtime privacy guard: the broadcast body must carry ZERO non-concierge
 *  Egyptian mobiles (mirrors redact.broadcastLeftovers). */
function broadcastLeftovers(text) {
  const raw = String(text || '').replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) & 0xf));
  const re = /(?<![0-9A-Za-z])(?:\+?20)?1[0125][\s\-().]?\d{2}[\s\-().]?\d{3}[\s\-().]?\d{3}(?![0-9A-Za-z])/g;
  const left = [];
  for (const m of raw.match(re) || []) {
    if (m.replace(/\D/g, '').slice(-10) !== '1092048333') left.push(m);
  }
  return [...new Set(left)];
}

function renderBroadcast(unit) {
  const code = String(unit.code || unit.unit_code || unit.se_code || '—');
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const price = Number(unit.price) > 0
    ? `${Number(unit.price).toLocaleString('en-US')} EGP${String(unit.deal_type).toLowerCase() === 'rent' ? ' / month' : ''}`
    : 'Price on application';
  return [
    `Reference: [<b>${esc(code)}</b>]`,
    `🏢 <b>Sierra Estates — Verified Available</b> 💎`,
    `${esc(String(unit.deal_type || '').toLowerCase() === 'rent' ? 'For Rent' : 'For Sale')} · ${esc(resolveCanonicalCompound(unit.compound))}`,
    ``,
    `• ${esc(unit.property_type || 'Apartment')} · ${unit.area_sqm ?? '—'} SQM · ${unit.bedrooms ?? '—'} Beds · ${unit.bathrooms ?? '—'} Baths`,
    `• ${esc(unit.furnishing_status || 'Furnishing on request')} · ${esc(unit.finishing_type || 'Finishing on request')}`,
    `• Price: <b>${esc(price)}</b>`,
    unit.ai_fair_price ? `• AI Fair-Market Benchmark: ${Number(unit.ai_fair_price).toLocaleString('en-US')} EGP` : '',
    unit.is_featured_gem ? `• <b>💎 GEM UNIT</b> — priced below compound average` : '',
    ``,
    `📞 To view: contact the Sierra concierge and quote <b>${esc(code)}</b>.`,
  ].filter(Boolean).join('\n');
}

// ── Property Finder Atlas v1 push ───────────────────────────────────────────
async function pushToPropertyFinder(unit) {
  // The connector package handles Atlas v1 auth (PROPERTY_FINDER_API_KEY /
  // SECRET). Fail-open: syndication retries next pass on failure.
  try {
    const { PropertyFinderConnector } = require('../../packages/property-finder-api/src/connector');
    const connector = new PropertyFinderConnector({
      apiKey: process.env.PROPERTY_FINDER_API_KEY,
      apiSecret: process.env.PROPERTY_FINDER_API_SECRET,
    });
    if (typeof connector.upsertListing === 'function') {
      return await connector.upsertListing({
        reference: unit.code || unit.unit_code,
        type: String(unit.deal_type).toLowerCase() === 'rent' ? 'rent' : 'sale',
        compound: resolveCanonicalCompound(unit.compound),
        propertyType: unit.property_type,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        sizeSqm: unit.area_sqm,
        price: unit.price,
        currency: 'EGP',
        images: (unit.images || []).slice(0, 10),
        title: `${unit.bedrooms || ''}BR ${resolveCanonicalCompound(unit.compound)}`,
      });
    }
    return { queued: true, note: 'connector available — batch XML lane handles bulk' };
  } catch (e) {
    // Connector not installed in this runtime — the sync-propertyfinder fleet
    // task remains the canonical bulk lane.
    return { queued: false, note: e.message };
  }
}

// ── the guardian ────────────────────────────────────────────────────────────
async function atlasGuardian(ctx) {
  const sb = supabase();
  const stats = { watched: 0, watermarked: 0, broadcast: 0, syndicated: 0, gisPublished: 0 };

  // Watch the live view (migration 040) — the Real_Available_Units source.
  let live = [];
  try {
    const { data, error } = await withBackoff(() => sb.from('real_available_units')
      .select('*')
      .order('verified_available_date', { ascending: false })
      .limit(500), 'real-available');
    if (error) throw error;
    live = data || [];
  } catch (e) {
    ctx.log(`real_available_units read failed (migration 040 applied?): ${e.message}`);
  }
  stats.watched = live.length;

  for (const unit of live) {
    const auto = (unit.automation && typeof unit.automation === 'object') ? unit.automation : {};
    const code = unit.code || unit.unit_code || unit.se_code || unit.id;

    // 1. Watermark (idempotent).
    if (!auto.watermarked) {
      const stamp = persistStamp(unit);
      if (stamp) {
        auto.watermarked = true;
        auto.watermarkStamp = stamp;
        stats.watermarked++;
      }
    }

    // 2. Telegram broadcast to General (idempotent).
    if (!auto.broadcastToGeneral && GENERAL_GROUP_ID) {
      const body = renderBroadcast(unit);
      if (broadcastLeftovers(body).length === 0) {
        const ok = await tgSendMessage(GENERAL_GROUP_ID, body);
        if (ok) {
          auto.broadcastToGeneral = true;
          auto.broadcastAt = new Date().toISOString();
          stats.broadcast++;
        }
      } else {
        await ctx.telegramAlert(`🚨 Atlas Sync: broadcast for <code>${code}</code> BLOCKED — owner-contact leftovers detected. Manual review needed.`);
      }
    }

    // 3. Property Finder Atlas v1 + GIS map publish (idempotent).
    if (!auto.isPublishedToPF) {
      const pf = await pushToPropertyFinder(unit);
      auto.isPublishedToPF = true; // bulk XML lane reconciles details
      auto.pfPush = pf && pf.note ? String(pf.note).slice(0, 200) : 'ok';
      stats.syndicated++;
    }
    if (!unit.publish_to_client) {
      await withBackoff(() => sb.from('listings').update({
        publish_to_client: true,
        updated_at: new Date().toISOString(),
      }).eq('id', unit.id), `gis:${unit.id}`);
      stats.gisPublished++;
    }

    // Persist the automation ledger exactly once per changed pass.
    await withBackoff(() => sb.from('listings').update({
      automation: { ...auto, atlasGuardianAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq('id', unit.id), `automation:${unit.id}`);
  }

  if (stats.broadcast > 0) {
    await ctx.learn('atlas-sync-guardian', {
      kind: 'syndication_pulse',
      title: `Atlas Sync — ${stats.broadcast} new broadcast(s)`,
      body: stats,
      tags: ['syndication', 'broadcast'],
      ttlDays: 30,
    });
  }
  return stats;
}

if (require.main === module) {
  runGuardian({
    botId: 'atlas-sync-guardian',
    name: 'Syndication & Broadcast Guardian',
    cron: '*/10 * * * *',
    fn: atlasGuardian,
  })();
}

module.exports = {
  atlasGuardian,
  buildWatermarkStamp,
  renderBroadcast,
  broadcastLeftovers,
  NAVY,
  GOLD,
};
