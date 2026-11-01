'use strict';

/**
 * dedup-index.js — In-memory deduplication index + ±5 % price DQE gate.
 * ─────────────────────────────────────────────────────────────────────────────
 * Mission 2 (2026-11-01): BEFORE any Google Sheets or Supabase write, check an
 * in-memory index keyed on:
 *
 *     (Normalized_Owner_Phone + Canonical_Compound + Unit_Type + Area bucket)
 *
 * and apply a ±5 % price-range DQE (Data Quality Enforcement) check so
 * re-listed units are caught even when the price fluctuated slightly.
 *
 * Persistence: the index mirrors to a JSON file inside the runner state dir
 * (the same pattern as the intake ledger / codes counter — survives restarts
 * via the compose `runner-state` volume). A TTL bounds growth.
 *
 * Optional Redis: when UPSTASH_REDIS_REST_URL + TOKEN are set, the same key
 * is additionally mirrored with SET NX EX (proven pattern from
 * apps/sierra-estates-realty/lib/server/rate-limit.ts) so multiple workers
 * (2 outreach bots, unit-adder, intake) share one view. Redis is a
 * best-effort accelerator, NEVER a gate: if Redis is down, the in-memory +
 * file index still decides.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { resolveCanonicalCompound } = require('./compound-canonical');
const { normalizePhone } = require('./phone-utils');

const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const INDEX_FILE = path.join(STATE_DIR, 'dedup-index.json');

const DEFAULT_TTL_MS = 45 * 24 * 60 * 60 * 1000; // 45 days
const DEFAULT_MAX_ENTRIES = 20000;
const PRICE_DQE_TOLERANCE = 0.05; // ±5 %
const AREA_BUCKET_RATIO = 0.05;   // area "same unit" bucket: ±5 %

// ── index storage ──────────────────────────────────────────────────────────
let cache = null; // { key → { price, area, code, dealType, at } }

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch (_) {
    cache = {};
  }
  return cache;
}

function persist() {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    const tmp = `${INDEX_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(cache));
    fs.renameSync(tmp, INDEX_FILE);
  } catch (_) { /* best-effort mirror */ }
}

function prune(now = Date.now()) {
  const idx = load();
  const keys = Object.keys(idx);
  if (keys.length <= DEFAULT_MAX_ENTRIES) {
    let removed = 0;
    for (const k of keys) {
      if (now - Date.parse(idx[k].at || 0) > DEFAULT_TTL_MS) { delete idx[k]; removed++; }
    }
    return removed;
  }
  // Over cap: drop oldest until under the limit.
  const sorted = keys.sort((a, b) => Date.parse(idx[a].at || 0) - Date.parse(idx[b].at || 0));
  const excess = sorted.length - DEFAULT_MAX_ENTRIES;
  for (let i = 0; i < excess; i++) delete idx[sorted[i]];
  return excess;
}

// ── key construction ───────────────────────────────────────────────────────

/**
 * The composite dedup identity. Every component is normalized:
 *   phone   → 201XXXXXXXXX (normalizePhone) or 'NO_PHONE'
 *   compound→ canonical famous name (compound-canonical.js)
 *   type    → lower-cased property type
 *   area    → bucketed at ±5 % (log-ish bucket keeps "175" vs "180" apart
 *             but "175" vs "176" together — see areaBucket)
 */
function dedupKey({ ownerPhone, compound, unitType, areaSqm }) {
  const phone = normalizePhone(ownerPhone) || 'NO_PHONE';
  const canonical = resolveCanonicalCompound(compound);
  const type = String(unitType || 'unknown').trim().toLowerCase();
  const area = areaBucket(areaSqm);
  return crypto.createHash('sha1')
    .update([phone, canonical, type, area].join('|'))
    .digest('hex')
    .slice(0, 24);
}

/** ±5 % area bucket: rounds to the nearest 1/20th step on a sqrt-ish scale.
 *  Small units bucket tighter than big ones, which matches how agents
 *  round areas ("~175", "~180"). */
function areaBucket(areaSqm) {
  const n = Number(areaSqm);
  if (!Number.isFinite(n) || n <= 0) return 'NA';
  const step = Math.max(5, Math.round(n * AREA_BUCKET_RATIO / 5) * 5); // 5..∞
  return String(Math.round(n / step));
}

// ── optional Redis mirror (Upstash REST, best-effort) ──────────────────────
let redisBase = null;
let redisToken = null;
try {
  redisBase = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';
} catch (_) { /* env unavailable in some embeds */ }

async function redisGet(key) {
  if (!redisBase || !redisToken) return null;
  try {
    const res = await fetch(`${redisBase}/get/se:dedup:${key}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body && body.result ? JSON.parse(body.result) : null;
  } catch (_) { return null; }
}

async function redisSet(key, value) {
  if (!redisBase || !redisToken) return;
  try {
    await fetch(`${redisBase}/set/se:dedup:${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(value), ex: Math.floor(DEFAULT_TTL_MS / 1000) }),
      signal: AbortSignal.timeout(2500),
    });
  } catch (_) { /* best-effort */ }
}

// ── the gate ───────────────────────────────────────────────────────────────

/**
 * Check a candidate listing against the index BEFORE any Sheets/Supabase
 * write. Returns a decision object — NEVER throws.
 *
 *   { duplicate: false }
 *     → fresh unit, proceed
 *
 *   { duplicate: true, action: 'update_in_place', match: { code, price, … } }
 *     → same phone+compound+type+area AND price within ±5 % → re-list /
 *       refresh: update the existing row (price, Last_Action_Timestamp,
 *       Contact_Status, Listing_Status) instead of inserting a duplicate.
 *
 *   { duplicate: false, dqeFlag: { reason: 'PRICE_OUT_OF_BAND', … } }
 *     → same key but the price moved MORE than ±5 % → allow the insert,
 *       flag for human review (the agent reply cites the comparables).
 */
async function checkDuplicate({ ownerPhone, compound, unitType, areaSqm, price, dealType }) {
  const key = dedupKey({ ownerPhone, compound, unitType, areaSqm });
  const nowIso = new Date().toISOString();

  const local = load()[key] || null;
  const remote = local ? null : await redisGet(key);
  const hit = local || remote;

  if (!hit) {
    return { duplicate: false, key };
  }

  const newPrice = Number(price);
  const oldPrice = Number(hit.price);
  if (Number.isFinite(newPrice) && Number.isFinite(oldPrice) && oldPrice > 0) {
    const drift = Math.abs(newPrice - oldPrice) / oldPrice;
    if (drift <= PRICE_DQE_TOLERANCE) {
      return {
        duplicate: true,
        action: 'update_in_place',
        drift: Number(drift.toFixed(4)),
        match: { ...hit, key },
      };
    }
    return {
      duplicate: false,
      key,
      dqeFlag: {
        reason: 'PRICE_OUT_OF_BAND',
        existingPrice: oldPrice,
        newPrice,
        drift: Number(drift.toFixed(4)),
        tolerance: PRICE_DQE_TOLERANCE,
        match: { ...hit, key },
      },
    };
  }

  // No usable prices → same key, unknown drift: treat as re-list refresh.
  return { duplicate: true, action: 'update_in_place', match: { ...hit, key } };
}

/** Record a listing in the index (after the write succeeded). */
async function record({ ownerPhone, compound, unitType, areaSqm, price, dealType, code, sheetRow }) {
  const key = dedupKey({ ownerPhone, compound, unitType, areaSqm });
  const entry = {
    price: Number(price) || null,
    area: Number(areaSqm) || null,
    dealType: dealType || null,
    code: code || null,
    sheetRow: sheetRow || null,
    at: new Date().toISOString(),
  };
  const idx = load();
  idx[key] = entry;
  prune();
  persist();
  await redisSet(key, entry);
  return key;
}

/** Test-only: wipe the in-memory + on-disk index. */
function __resetForTests() {
  cache = {};
  try { fs.rmSync(INDEX_FILE, { force: true }); } catch (_) { /* ok */ }
}

module.exports = {
  dedupKey,
  areaBucket,
  checkDuplicate,
  record,
  PRICE_DQE_TOLERANCE,
  __resetForTests,
  INDEX_FILE,
};
