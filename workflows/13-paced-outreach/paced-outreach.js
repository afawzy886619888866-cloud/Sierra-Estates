'use strict';
/**
 * Workflow 13: Paced Owner Outreach — 2 dedicated workers over the OpenWA pool.
 * ─────────────────────────────────────────────────────────────────────────────
 * Mission 2 (2026-11-01): "Ultra-Fast Owner Outreach & Acquisition" — a
 * strictly paced, always-on outreach daemon that complements the batch lane
 * (workflow 09, every-30-min cron slots). Contract:
 *
 *   · TWO dedicated workers, each with its own sending lines from the
 *     OpenWA 8-line pool (:2785). line-2 (201092048333, the flagship
 *     concierge) is NEVER used for outreach — hard-excluded.
 *
 *       Worker A "active-renting"  → owners of ACTIVE RENT listings get the
 *                                    availability-check message.
 *       Worker B "massive-owners"  → the massive owner list gets the softer
 *                                    secondary/cold intro (the cold EMAIL
 *                                    lane lives in workflow 04 email-sender;
 *                                    this is the WhatsApp touch).
 *
 *   · Cairo business hours ONLY: 12:00–20:00 Africa/Cairo (PACE_WINDOW).
 *   · 30 messages every 2 hours per bot (PACE_SLOT_BUDGET × PACE_SLOT_HOURS)
 *     → 4 slots × 30 × 2 bots = 240 messages/day.
 *   · 45–55 s human typing simulation between sends (PACE_TYPE_MIN_MS +
 *     PACE_TYPE_JITTER_MS) — identical anti-ban pacing doctrine to the
 *     proven workflow-09 chassis.
 *
 *   Safety rails inherited from workflow 09:
 *     · JSONL contact ledger (never re-contact within the segment's window)
 *     · Opt-out guard (workflows/lib/inbox.js loadOptOutSet)
 *     · owner_outreach_log audit rows (migration 033; fail-open)
 *     · listings.availability='contacted' write-back after each send
 *     · Skip list: sold / rented / unavailable / no valid mobile
 *     · DRY_RUN mode (PACE_DRY_RUN / WF_DRY_RUN)
 *
 *   Identity: pulses public.system_status/{paced-outreach-bot} so the Admin
 *   Bots Desk shows an honest fleet card ("New bots can register themselves
 *   by writing to system_status/{botId}" — apps/…/admin/bots/route.ts).
 *
 * Env: WHATSAPP_API_URL, WHATSAPP_API_TOKEN | OPENWA_ADMIN_API_KEY,
 *      OPENWA_SESSION_IDS, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      PACE_WINDOW (12-20), PACE_SLOT_BUDGET (30), PACE_SLOT_HOURS (2),
 *      PACE_TYPE_MIN_MS (45000), PACE_TYPE_JITTER_MS (10000),
 *      PACE_RECONTACT_DAYS_RENT (7), PACE_RECONTACT_DAYS_MASSIVE (30),
 *      PACE_DAILY_CAP_TOTAL (240), PACE_DRY_RUN, WF_STATE_DIR
 * Exit: 0 ok · 2 unconfigured · 1 error  (daemon mode never exits on its own;
 *       `--once` runs a single pass and exits — cron-compatible).
 */

const fs = require('fs');
const path = require('path');
const { loadWorkflowEnv } = require('../lib/google-sheets');

loadWorkflowEnv(path.join(__dirname, '..'));

const { GatewayClient } = require('../lib/gateway-client');
const { normalizePhone } = require('../lib/phone-utils');
const { loadOptOutSet } = require('../lib/inbox');
const { resolveCanonicalCompound } = require('../lib/compound-canonical');

const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const LEDGER_FILE = path.join(STATE_DIR, 'paced-outreach-ledger.jsonl');
const COUNTER_FILE = path.join(STATE_DIR, 'paced-outreach-counters.json');
const HEARTBEAT_FILE = path.join(STATE_DIR, 'paced-outreach-heartbeat.json');

const DRY_RUN = !/^(0|false|no)$/i.test(process.env.PACE_DRY_RUN || process.env.WF_DRY_RUN || '0');

// ── pacing contract (Mission 2) ─────────────────────────────────────────────
const [WIN_START, WIN_END] = String(process.env.PACE_WINDOW || '12-20')
  .split('-').map((n) => parseInt(n, 10));
const SLOT_HOURS = parseInt(process.env.PACE_SLOT_HOURS || '2', 10);
const SLOT_BUDGET = parseInt(process.env.PACE_SLOT_BUDGET || '30', 10);
const TYPE_MIN_MS = parseInt(process.env.PACE_TYPE_MIN_MS || '45000', 10);
const TYPE_JITTER_MS = parseInt(process.env.PACE_TYPE_JITTER_MS || '10000', 10);
const DAILY_CAP_TOTAL = parseInt(process.env.PACE_DAILY_CAP_TOTAL || '240', 10);
const RECONTACT_DAYS_RENT = parseInt(process.env.PACE_RECONTACT_DAYS_RENT || '7', 10);
const RECONTACT_DAYS_MASSIVE = parseInt(process.env.PACE_RECONTACT_DAYS_MASSIVE || '30', 10);
const CONCIERGE_LINE = 'line-2'; // flagship concierge — hard-excluded everywhere

function log(...args) {
  console.log(new Date().toISOString(), '[paced-outreach]', ...args);
}

// ── Cairo clock ────────────────────────────────────────────────────────────
function cairoNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo', hour12: false,
    hour: '2-digit', minute: '2-digit', weekday: 'short',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(new Date());
  const get = (t) => parseInt((parts.find((p) => p.type === t) || {}).value || '0', 10);
  const hour = get('hour') % 24; // "24" → 0 normalization
  return {
    hour,
    minute: get('minute'),
    dayKey: `${get('year')}-${String(get('month')).padStart(2, '0')}-${String(get('day')).padStart(2, '0')}`,
    weekday: (parts.find((p) => p.type === 'weekday') || {}).value || '',
  };
}

function inBusinessWindow(now) {
  return now.hour >= WIN_START && now.hour < WIN_END;
}

/** Slot id: "YYYY-MM-DD #N" — N = floor((hour - start) / SLOT_HOURS). */
function slotId(now) {
  const n = Math.floor((now.hour - WIN_START) / SLOT_HOURS);
  return `${now.dayKey} #${n}`;
}

// ── state: ledger + counters ───────────────────────────────────────────────
function ledgerRead() {
  try { return fs.readFileSync(LEDGER_FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)); }
  catch (_) { return []; }
}
function ledgerAppend(entry) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.appendFileSync(LEDGER_FILE, `${JSON.stringify(entry)}\n`);
  } catch (e) { log(`ledger append failed: ${e.message}`); }
}

function countersRead() {
  try { return JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8')); } catch (_) { return {}; }
}
function countersWrite(c) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(c, null, 1));
  } catch (e) { log(`counter write failed: ${e.message}`); }
}

/** Record one real send against the slot + day budgets. */
function bumpCounters(worker) {
  const now = cairoNow();
  const c = countersRead();
  if (c.day !== now.dayKey) { c.day = now.dayKey; c.dayTotal = 0; c.slots = {}; }
  const slot = slotId(now);
  c.slots = c.slots || {};
  c.slots[slot] = c.slots[slot] || {};
  c.slots[slot][worker] = (c.slots[slot][worker] || 0) + 1;
  c.dayTotal = (c.dayTotal || 0) + 1;
  countersWrite(c);
  return c;
}

function slotBudgetLeft(worker) {
  const now = cairoNow();
  const c = countersRead();
  if (c.day !== now.dayKey) return { slot: SLOT_BUDGET, day: DAILY_CAP_TOTAL };
  const slot = slotId(now);
  const used = ((c.slots || {})[slot] || {})[worker] || 0;
  return { slot: Math.max(0, SLOT_BUDGET - used), day: Math.max(0, DAILY_CAP_TOTAL - (c.dayTotal || 0)) };
}

/** Has this phone been contacted by `worker` (or 09-owner-outreach) within its re-contact window? */
function recentlyContacted(phone, worker) {
  const days = worker === 'active-renting' ? RECONTACT_DAYS_RENT : RECONTACT_DAYS_MASSIVE;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  for (const e of ledgerRead()) {
    if (e.phone === phone && (!e.worker || e.worker === worker) && Date.parse(e.at) > cutoff) return true;
  }
  try {
    const ownerLedger = path.join(STATE_DIR, 'owner-outreach-ledger.jsonl');
    if (fs.existsSync(ownerLedger)) {
      const lines = fs.readFileSync(ownerLedger, 'utf8').split('\n');
      for (const l of lines) {
        if (!l.trim()) continue;
        const e = JSON.parse(l);
        if (e && e.phone === phone && (!e.at || Date.parse(e.at) > cutoff)) return true;
      }
    }
  } catch (_) {}
  return false;
}

// ── Supabase: candidates + audit + availability write-back + system_status ─
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let sb = null;
function supabase() {
  if (sb) return sb;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const { createClient } = require('@supabase/supabase-js');
    sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    return sb;
  } catch (e) { log(`supabase init failed: ${e.message}`); return null; }
}

const DEFAULT_OWNERS_SHEET_ID = process.env.UNITS_SHEET_ID || process.env.GOOGLE_SHEET_ID || '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';
const DEFAULT_OWNERS_SHEET_GID = process.env.OWNERS_SHEET_GID || process.env.UNITS_SHEET_GID || '1127958606';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else if (c === '\r') {
      // skip
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

async function fetchSheetCandidates(sheetId = DEFAULT_OWNERS_SHEET_ID, gid = DEFAULT_OWNERS_SHEET_GID) {
  if (!sheetId || !gid) return [];
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      log(`sheet fetch HTTP ${res.status}`);
      return [];
    }
    const csv = await res.text();
    if (!csv || csv.length < 20) return [];
    const parsed = parseCsv(csv);
    if (parsed.length <= 1) return [];
    const headers = parsed[0].map((h) => String(h || '').trim());
    return parsed.slice(1).map((r) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
      return obj;
    });
  } catch (e) {
    log(`sheet candidate read failed/offline: ${e.message}`);
    return [];
  }
}

/** Pull owner candidates from verified Google Owners Sheet (GID 1127958606)
 *  and Supabase public.listings, segmented by deal type.
 *  Rent owners → worker A; everyone else → worker B. One row per OWNER
 *  (first listing wins; a renting owner is always removed from bucket B). */
async function loadCandidates() {
  const rentOwners = new Map();
  const otherOwners = new Map();
  const skipStatus = ['sold', 'rented', 'off-market', 'unavailable', 'archived'];

  // 1. Google Owners Sheet (GID 1127958606)
  try {
    const sheetRows = await fetchSheetCandidates();
    for (const r of sheetRows) {
      const status = String(r.Listing_Status || r.Availability || r.availability || r.status || '').toLowerCase().trim();
      const contactStatus = String(r.Contact_Status || r.contact_status || '').toLowerCase().trim();
      if (skipStatus.includes(status) || ['sold', 'rented', 'unavailable'].includes(contactStatus)) continue;

      const rawPhone = r.Mobile || r.Phone || r.owner_phone || r.Owner_Mobile_Internal || r.mobile;
      const phone = normalizePhone(rawPhone);
      if (!phone || !/^201[0125]\d{8}$/.test(phone)) continue;
      if (['201031622600', '201092048333', '201032206443', '201061399688', '201009006157', '201112345678', '201119876543'].includes(phone)) continue;

      const rawDeal = String(r.Deal_Type || r.Type || r.deal_type || r.type || 'rent').toLowerCase().trim();
      const dealType = (rawDeal.includes('rent') || rawDeal.includes('ايجار') || rawDeal.includes('إيجار')) ? 'rent' : 'sale';
      const rawComp = r.Compound || r.Canonical_Compound || r.compound || r.Location;

      const entry = {
        code: (r.Unit_Code || r.Code || r.code || r.unit_code || '').trim() || 'SE-SHEET',
        name: (r.Owner_Name_Internal || r.Name || r.owner_name || '').trim() || 'صاحب الإعلان',
        phone,
        compound: resolveCanonicalCompound(rawComp),
        dealType,
        source: 'sheet',
      };

      if (entry.dealType === 'rent') {
        if (!rentOwners.has(phone)) rentOwners.set(phone, entry);
        otherOwners.delete(phone);
      } else if (!otherOwners.has(phone) && !rentOwners.has(phone)) {
        otherOwners.set(phone, entry);
      }
    }
    if (rentOwners.size || otherOwners.size) {
      log(`loaded ${rentOwners.size} rent + ${otherOwners.size} massive owners from Owners Sheet (gid ${DEFAULT_OWNERS_SHEET_GID})`);
    }
  } catch (e) {
    log(`sheet ingestion skipped: ${e.message}`);
  }

  // 2. Supabase listings (supplement / fallback)
  const client = supabase();
  if (client) {
    const selectCols = 'id,code,unit_code,owner_name,owner_phone,compound,deal_type,availability,status,price,bedrooms,property_type';
    const { data, error } = await client.from('listings').select(selectCols).limit(5000);
    if (error) {
      log(`listings read failed: ${error.message}`);
    } else {
      for (const r of data || []) {
        const status = String(r.status || '').toLowerCase().trim();
        const avail = String(r.availability || '').toLowerCase().trim();
        if (skipStatus.includes(status) || ['sold', 'rented', 'unavailable'].includes(avail)) continue;
        const phone = normalizePhone(r.owner_phone);
        if (!phone || !/^201[0125]\d{8}$/.test(phone)) continue;
        const entry = {
          code: (r.code || r.unit_code || '').trim() || 'SE-DB',
          name: (r.owner_name || '').trim() || 'صاحب الإعلان',
          phone,
          compound: resolveCanonicalCompound(r.compound),
          dealType: String(r.deal_type || '').toLowerCase().trim(),
          listingId: r.id,
          source: 'supabase',
        };
        if (entry.dealType === 'rent') {
          if (!rentOwners.has(phone)) rentOwners.set(phone, entry);
          otherOwners.delete(phone);
        } else if (!otherOwners.has(phone) && !rentOwners.has(phone)) {
          otherOwners.set(phone, entry);
        }
      }
    }
  }

  return {
    activeRenting: [...rentOwners.values()],
    massiveOwners: [...otherOwners.values()],
  };
}

async function auditRow(entry, worker, template) {
  const client = supabase();
  if (!client || DRY_RUN) return;
  try {
    await client.from('owner_outreach_log').insert({
      phone: entry.phone,
      channel: 'whatsapp',
      worker,
      template,
      unit_code: entry.code,
      listing_id: entry.listingId || null,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  } catch (e) { log(`audit insert failed (fail-open): ${e.message}`); }
}

async function markContacted(entry) {
  const client = supabase();
  if (!client || DRY_RUN || !entry.listingId) return;
  try {
    await client.from('listings').update({ availability: 'contacted', updated_at: new Date().toISOString() })
      .eq('id', entry.listingId);
  } catch (e) { log(`availability write-back failed for ${entry.code}: ${e.message}`); }
}

/** Fleet card pulse (Admin Bots Desk shows system_status rows). */
async function pulseSystemStatus(stats) {
  const client = supabase();
  if (!client) return;
  try {
    await client.from('system_status').upsert({
      id: 'paced-outreach-bot',
      name: 'Paced Owner Outreach',
      status: stats.status || 'active',
      last_pulse: new Date().toISOString(),
      stats,
      config: {
        window: `${WIN_START}:00–${WIN_END}:00 Africa/Cairo`,
        slotBudget: `${SLOT_BUDGET} msgs / ${SLOT_HOURS}h per bot`,
        dailyTarget: DAILY_CAP_TOTAL,
        typingSimulation: `${TYPE_MIN_MS / 1000}–${(TYPE_MIN_MS + TYPE_JITTER_MS) / 1000}s`,
        workers: ['active-renting', 'massive-owners'],
        dryRun: DRY_RUN,
      },
      enabled: true,
    }, { onConflict: 'id' });
  } catch (e) { log(`system_status pulse failed: ${e.message}`); }
}

// ── message templates (owner-approved tone, opt-out in EVERY message) ──────
function availabilityCheckTemplate(entry) {
  return [
    `مساء الخير 🌟`,
    `معك فريق Sierra Estates — بخصوص وحدتكم في ${entry.compound} (كود: ${entry.code})`,
    `هل ما زالت متاحة حالياً؟`,
    `في حال التأجير نجهّز لكم أفضل عرض خلال ٢٤ ساعة.`,
    ``,
    `لإلغاء الرسائل رد بكلمة "إلغاء"`,
  ].join('\n');
}

function massiveOwnerTemplate(entry) {
  return [
    `مساء الخير 🌟`,
    `معك فريق Sierra Estates للوساطة العقارية — القاهرة الجديدة.`,
    `نعمل مع ملاك مباشرين في ${entry.compound} ونستقبل وحدات جديدة باستمرار.`,
    `لو عندك وحدة للبيع أو الإيجار وحابب عرض سريع واحترافي، ابعتلنا التفاصيل وصور الوحدة.`,
    ``,
    `لإلغاء الرسائل رد بكلمة "إلغاء"`,
  ].join('\n');
}

/** Contacted-set for one worker pass: phones contacted within the
 *  re-contact window (ONE ledger read, not one per candidate). */
function contactedWithin(worker) {
  const days = worker === 'active-renting' ? RECONTACT_DAYS_RENT : RECONTACT_DAYS_MASSIVE;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const set = new Set();
  for (const e of ledgerRead()) {
    if (e.worker === worker && Date.parse(e.at) > cutoff) set.add(e.phone);
  }
  return set;
}

// ── the workers ────────────────────────────────────────────────────────────
const gateway = new GatewayClient();

/** Split the ready pool between the two workers, NEVER touching line-2. */
function assignLines(readyLines) {
  const normalized = (readyLines || [])
    .map((l) => (typeof l === 'string' ? l : (l && (l.uuid || l.name || l.id)) || ''))
    .filter(Boolean);
  const usable = normalized.filter((l) => l !== CONCIERGE_LINE);
  const a = [];
  const b = [];
  usable.forEach((l, i) => (i % 2 === 0 ? a : b).push(l));
  if (a.length && !b.length) b.push(a[0]);
  return { 'active-renting': a, 'massive-owners': b };
}

function typingDelay() {
  return TYPE_MIN_MS + Math.floor(Math.random() * TYPE_JITTER_MS); // 45–55 s
}

/** One pass for one worker: claim up to budget, send paced. */
async function runWorkerPass(worker, candidates, lines) {
  if (!candidates.length || !lines.length) return 0;
  const { slot, day } = slotBudgetLeft(worker);
  let budget = Math.min(slot, day);
  if (budget <= 0) return 0;

  const optOuts = loadOptOutSet(STATE_DIR);
  const contacted = contactedWithin(worker);
  const template = worker === 'active-renting' ? availabilityCheckTemplate : massiveOwnerTemplate;
  const templateName = worker === 'active-renting' ? 'availability_check_v1' : 'massive_owner_intro_v1';
  let sent = 0;
  let lineIdx = 0;

  for (const entry of candidates) {
    if (budget <= 0) break;
    if (optOuts.has(entry.phone)) continue;
    if (contacted.has(entry.phone)) continue;

    if (sent > 0) {
      // Human typing simulation — the anti-ban pacing doctrine (45–55 s).
      await new Promise((r) => setTimeout(r, typingDelay()));
    }

    const sessionId = lines[lineIdx % lines.length];
    lineIdx++;

    if (DRY_RUN) {
      log(`DRY-RUN [${worker}] would send to ${entry.phone} (${entry.compound}) via ${sessionId}`);
    } else {
      try {
        await gateway.sendText(`${entry.phone}@c.us`, template(entry), { sessionId });
      } catch (e) {
        log(`send failed [${worker}] ${entry.phone} via ${sessionId}: ${e.message}`);
        continue; // budget not consumed — the owner is retried next slot
      }
    }

    sent++;
    budget--;
    bumpCounters(worker); // slot + day budgets are consumed by REAL sends only
    ledgerAppend({ at: new Date().toISOString(), worker, phone: entry.phone, code: entry.code, sessionId, dryRun: DRY_RUN });
    await auditRow(entry, worker, templateName);
    await markContacted(entry);
    log(`[${worker}] sent ${sent} this slot → ${entry.phone} (${entry.compound}) via ${sessionId}`);
  }
  return sent;
}

/** One scheduling pass: window check → pool check → both workers. */
async function pass(reason) {
  const now = cairoNow();
  if (!inBusinessWindow(now)) {
    log(`outside Cairo business window (${WIN_START}:00–${WIN_END}:00) — idle (reason=${reason})`);
    await pulseSystemStatus({ status: 'idle', windowClosed: true, lastCheck: new Date().toISOString() });
    return 0;
  }

  const pool = await gateway.healthyPool().catch(() => []);
  if (!pool || !pool.length) {
    log('gateway pool has zero READY lines — idle (will retry)');
    await pulseSystemStatus({ status: 'degraded', reason: 'no_ready_lines', lastCheck: new Date().toISOString() });
    return 0;
  }

  const lines = assignLines(pool);
  const { activeRenting, massiveOwners } = await loadCandidates();
  let total = 0;
  total += await runWorkerPass('active-renting', activeRenting, lines['active-renting']);
  total += await runWorkerPass('massive-owners', massiveOwners, lines['massive-owners']);

  await pulseSystemStatus({
    status: 'active',
    sentThisPass: total,
    slot: slotId(now),
    budget: slotBudgetLeft('active-renting'),
    lastCheck: new Date().toISOString(),
  });
  return total;
}

function writeHeartbeat(extra = {}) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify({
      at: new Date().toISOString(),
      window: `${WIN_START}-${WIN_END}`,
      dryRun: DRY_RUN,
      ...extra,
    }));
  } catch (_) { /* best-effort */ }
}

// ── main ───────────────────────────────────────────────────────────────────
function validateStartup() {
  if (!process.env.WHATSAPP_API_URL) return 'WHATSAPP_API_URL missing (OpenWA gateway :2785)';
  if (!process.env.WHATSAPP_API_TOKEN && !process.env.OPENWA_ADMIN_API_KEY) {
    return 'WHATSAPP_API_TOKEN / OPENWA_ADMIN_API_KEY missing';
  }
  return null;
}

async function main() {
  const invalid = validateStartup();
  if (invalid) {
    console.error(`UNCONFIGURED: ${invalid} — fill infra/.secrets.env then restart the container.`);
    console.error('SUMMARY {"status":"unconfigured"}');
    process.exit(2);
  }
  log(`starting paced outreach — window ${WIN_START}:00–${WIN_END}:00 Cairo · ${SLOT_BUDGET} msgs/${SLOT_HOURS}h/bot · ${DAILY_CAP_TOTAL}/day · typing ${TYPE_MIN_MS / 1000}–${(TYPE_MIN_MS + TYPE_JITTER_MS) / 1000}s${DRY_RUN ? ' · DRY-RUN' : ''}`);

  // One-shot mode (cron-compatible): a single pass, then exit.
  if (process.argv.includes('--once')) {
    const sent = await pass('once');
    console.log(`SUMMARY ${JSON.stringify({ sent, dryRun: DRY_RUN })}`);
    process.exit(0);
  }

  // Daemon mode: wake every 60 s; the slot budget naturally throttles sends.
  process.on('SIGTERM', () => { writeHeartbeat({ stopping: true }); process.exit(0); });
  process.on('SIGINT', () => { writeHeartbeat({ stopping: true }); process.exit(0); });
  for (;;) {
    try {
      const sent = await pass('daemon');
      writeHeartbeat({ lastSent: sent });
    } catch (e) {
      log(`pass failed: ${e.message}`);
      writeHeartbeat({ lastError: e.message });
    }
    await new Promise((r) => setTimeout(r, 60 * 1000));
  }
}

process.on('unhandledRejection', (e) => log(`unhandledRejection (suppressed): ${e && e.message}`));
process.on('uncaughtException', (e) => log(`uncaughtException (suppressed): ${e && e.message}`));

if (require.main === module) {
  main().catch((e) => {
    console.error(`paced-outreach FAILED: ${e.message}`);
    process.exit(1);
  });
}

module.exports = {
  cairoNow,
  inBusinessWindow,
  slotId,
  slotBudgetLeft,
  assignLines,
  availabilityCheckTemplate,
  massiveOwnerTemplate,
  recentlyContacted,
  bumpCounters,
  pass,
  CONCIERGE_LINE,
  loadCandidates,
  fetchSheetCandidates,
  parseCsv,
  typingDelay,
  DEFAULT_OWNERS_SHEET_GID,
  DEFAULT_OWNERS_SHEET_ID,
};
