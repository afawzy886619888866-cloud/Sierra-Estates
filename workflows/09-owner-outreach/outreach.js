'use strict';
/**
 * Workflow 09: Owner Outreach — scheduled owner connection from the inventory sheet
 * ──────────────────────────────────────────────────────────────────────────────────
 * Runs on the EC2 se-workflow-runner cron, Africa/Cairo time.
 *
 * PARALLEL SENDER ("2 lines here + 2 lines on the other side", Oct 2026):
 *   Up to WF_PARALLEL_LINES (default 4) READY pool lines send SIMULTANEOUSLY,
 *   each lane with its own 45–55 s pacing clock — the per-LINE rate is
 *   unchanged (anti-ban), the slot simply finishes in a fraction of the time.
 *   The sheet is partitioned by direction so lines never collide:
 *
 *     WF_HOST_SIDE=split (default)
 *         lane 1+3 walk the sheet front→back, lane 2+4 walk back→front —
 *         "2 lines here and 2 lines on the other side" — the cursors meet
 *         in the middle. With 2 lanes: 1 top + 1 bottom. With 1: top only.
 *     WF_HOST_SIDE=top      all lanes walk front→back (host A of a 2-host setup)
 *     WF_HOST_SIDE=bottom   all lanes walk back→front  (host B of a 2-host setup)
 *
 *   Two runner hosts can therefore work the SAME sheet in parallel: host A
 *   (top) + host B (bottom) converge in the middle from opposite ends.
 *
 * Data flow (zero-credential, same as 08-units-sync):
 *   Google Sheet (public gviz CSV, owner inventory tab gid 1127958606 —
 *   the gid 341562911 default was WRONG: that tab is the broker inbox
 *   and has no Mobile column, so outreach exited UNCONFIGURED with zero
 *   sends; fixed 2026-10-17)
 *     → rows with Code + Mobile + outreach-able Availability
 *     → personalized Arabic intro via the OpenWA gateway (session pool)
 *     → local JSONL ledger (one line per contacted phone, never re-contacted)
 *     → sheet contact-date column (تاريخ اخر تواصل) ALSO dedupes: a row
 *       whose last-contact cell is non-empty is skipped, so a fresh
 *       runner host never re-texts owners contacted elsewhere
 *       (WF_SHEET_DEDUPE=0 disables — re-contact campaigns only)
 *
 * Safety rails:
 *   • Daily cap (WF_OWNER_CONTACT_DAILY_CAP, default 40 PER LINE) counted per
 *     CAIRO day; with a pool the cap becomes per-line × pool size unless set
 *     explicitly (then it is a TOTAL, honored as-is)
 *   • Active hours 10:00–20:00 Cairo only; outside the window the run exits 0
 *   • Slot batch cap WF_SLOT_BATCH (default 30) — exact even with parallel
 *     lanes (synchronous ticket reservation; a claimed-but-unsent row is
 *     rewound so no candidate is ever lost)
 *   • Graceful slot deadline WF_SLOT_DEADLINE_MS (default 23 min): lanes stop
 *     claiming new rows in time to exit cleanly before the runner's kill —
 *     batches are never cut mid-send again
 *   • 45–55 s jittered pacing PER LANE between sends
 *   • Permanent-4xx aborts the batch; a benched line's rows are picked up by
 *     the surviving lanes
 *   • Gateway pre-flight: only `ready` lines join the slot; zero ready lines
 *     exits 0 (retry next cron)
 *   • Skip list: Not available / Sold / rows without Mobile
 *   • Opt-out line in EVERY message (Arabic disclaimer + "إلغاء" unsubscribe)
 *   • Ledger dedupe: a phone is contacted at most once EVER (across reruns)
 *   • WF_DRY_RUN=1 → prints would-send lines, touches nothing
 *
 * Env: UNITS_SHEET_ID / UNITS_SHEET_GID (defaults = owner inventory sheet),
 *      WHATSAPP_API_TOKEN, OPENWA_SESSION_ID, WHATSAPP_API_URL,
 *      OPENWA_SESSION_IDS (pool: 'line1,line2,line3,line4' — overrides
 *      OPENWA_SESSION_ID when set), WF_HOST_SIDE (split|top|bottom),
 *      WF_PARALLEL_LINES (4), WF_SLOT_BATCH (30), WF_SLOT_DEADLINE_MS
 *      (1380000 = 23 min),
 *      WF_OWNER_CONTACT_DAILY_CAP (40 per line), WF_DRY_RUN,
 *      WF_OUTREACH_AVAILABILITIES, WF_OUTREACH_ACTIVE_HOURS (10-20)
 * Exit: 0 ok · 2 unconfigured · 1 error
 */
const fs = require('fs');
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch {}
const { GatewayClient } = require('../lib/gateway-client');

const WRITE_URL = process.env.WF_SHEET_WRITE_URL;
const WRITE_SECRET = process.env.WF_SHEET_WRITE_SECRET;

function formatCairoDate(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  } catch {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
}

async function writeSheetDate(phone, rawMobile, dateStr) {
  if (!WRITE_URL || !WRITE_SECRET || DRY_RUN) return;
  const rows = [];
  if (rawMobile) rows.push({ phone: rawMobile, date: dateStr });
  if (phone && phone !== rawMobile) rows.push({ phone, date: dateStr });
  if (!rows.length) return;
  try {
    const res = await fetch(WRITE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: WRITE_SECRET,
        rows
      }),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (json.ok) {
      console.log(`[outreach] sheet write-back ok for ${phone} (updated: ${json.updated || 0})`);
    } else {
      console.warn(`[outreach] sheet write-back non-ok for ${phone}: ${json.error || res.status}`);
    }
  } catch (err) {
    console.warn(`[outreach] sheet write-back failed for ${phone}: ${err.message}`);
  }
}

const SHEET_ID = process.env.UNITS_SHEET_ID || '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';
const SHEET_GID = process.env.UNITS_SHEET_GID || '1127958606';
const PER_LINE_DAILY_CAP = parseInt(process.env.WF_OWNER_CONTACT_DAILY_CAP || '40', 10);
// Pool-aware: recomputed in main() as per-line × pool unless the operator set
// WF_OWNER_CONTACT_DAILY_CAP explicitly (then it is a TOTAL, honored as-is).
const CAP_EXPLICIT = process.env.WF_OWNER_CONTACT_DAILY_CAP != null && process.env.WF_OWNER_CONTACT_DAILY_CAP !== '';
let DAILY_CAP = PER_LINE_DAILY_CAP;
const BATCH_CAP = parseInt(process.env.WF_SLOT_BATCH || '30', 10);
// Graceful slot deadline: lanes stop claiming NEW rows after this many ms so
// a slot ALWAYS ends cleanly (checkpoint saved, exit 0) well before the
// runner's SIGKILL backstop — the message cap alone cannot bound slot time
// when a line degrades to a slow crawl. Default 23 min < the 25-min runner
// kill < the 30-min slot cadence. Anything already mid-send finishes first.
const SLOT_DEADLINE_MS = parseInt(process.env.WF_SLOT_DEADLINE_MS || '1380000', 10);
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.WF_DRY_RUN || '');
const AVAIL_OK = String(process.env.WF_OUTREACH_AVAILABILITIES || 'available,follow up,no answer')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const AH_ENV = String(process.env.WF_OUTREACH_ACTIVE_HOURS || '10-20').split('-');
const ACTIVE_HOURS = [parseInt(AH_ENV[0], 10) || 0, AH_ENV[1] === undefined || AH_ENV[1] === '' || parseInt(AH_ENV[1], 10) > 23 ? 24 : parseInt(AH_ENV[1], 10)];
// ── Parallel sender configuration ──────────────────────────────────
// Host side: split (lanes alternate top/bottom — "2 lines here + 2 lines on
// the other side"), or top/bottom (two-host setup: each host walks one end).
const HOST_SIDE_RAW = String(process.env.WF_HOST_SIDE || 'split').trim().toLowerCase();
const HOST_SIDE = (HOST_SIDE_RAW === 'bottom' || HOST_SIDE_RAW === 'b' || HOST_SIDE_RAW === 'other') ? 'bottom'
  : (HOST_SIDE_RAW === 'top' || HOST_SIDE_RAW === 'a') ? 'top' : 'split';
const PARALLEL_LINES = Math.max(1, parseInt(process.env.WF_PARALLEL_LINES || '4', 10));

const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const LEDGER = path.join(STATE_DIR, 'owner-outreach-ledger.jsonl');
const DAILY = path.join(STATE_DIR, 'owner-outreach-daily.json');
const CHECKPOINT = path.join(STATE_DIR, 'owner-outreach-checkpoint.json');

const summary = {
  candidates: 0,
  sent: 0,
  skippedDup: 0,
  skippedCap: 0,
  skippedHours: false,
  failed: 0,
  dryRun: DRY_RUN,
  bySession: {},
  byDirection: { top: 0, bottom: 0 },
  metInTheMiddle: false,
  sheetDeduped: 0,
  lanes: 0,
  slotDeadline: false,
  skippedDupRow: 0,
};

/**
 * Checkpoint v2 (direction-aware). Schema:
 *   split:  { side:'split',  topCursor, bottomCursor, totalCount, completed }
 *   top:    { side:'top',    cursor (0→n),            totalCount, completed }
 *   bottom: { side:'bottom', cursor (n-1→0, counts DOWN), totalCount, completed }
 * A legacy rotation checkpoint (no `side`) or a side change resets the walk —
 * safe because the sheet contact-date dedupe skips already-contacted rows.
 */
function freshCheckpoint(totalCount, side) {
  return {
    side,
    ...(side === 'split'
      ? { topCursor: 0, bottomCursor: Math.max(0, totalCount - 1) }
      // top walks UP from 0; bottom walks DOWN from the last row
      : { cursor: side === 'bottom' ? Math.max(0, totalCount - 1) : 0 }),
    totalCount,
    completed: false,
    updatedAt: new Date().toISOString(),
  };
}

function loadCheckpoint(totalCount) {
  try {
    const cp = JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'));
    if (typeof cp.cursor === 'number' || typeof cp.topCursor === 'number') {
      if (cp.side && cp.side === HOST_SIDE) {
        if (totalCount > (cp.totalCount || 0)) {
          console.log(`[outreach] sheet grew from ${cp.totalCount || 0} to ${totalCount} rows`);
          cp.totalCount = totalCount;
          cp.completed = false;
          if (cp.side === 'split') cp.bottomCursor = Math.max(cp.bottomCursor, totalCount - 1);
          if (cp.side === 'bottom') cp.cursor = Math.max(cp.cursor, totalCount - 1);
          saveCheckpoint(cp);
        }
        return cp;
      }
      console.log(`[outreach] checkpoint side '${cp.side || '(legacy rotation)'}' ≠ current '${HOST_SIDE}' — resetting walk for this side (sheet dedupe keeps already-contacted rows safe)`);
    }
  } catch { /* first run */ }
  return freshCheckpoint(totalCount, HOST_SIDE);
}

function saveCheckpoint(cp) {
  if (DRY_RUN) return;
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    cp.updatedAt = new Date().toISOString();
    fs.writeFileSync(CHECKPOINT, JSON.stringify(cp, null, 2));
  } catch (err) {
    console.warn(`[outreach] failed to write checkpoint: ${err.message}`);
  }
}

function parseCsv(text) {
  const rows = []; let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.length > 1 || row[0] !== '') rows.push(row); }
  return rows;
}

function toWesternDigits(str) {
  return String(str || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

/** Egyptian mobile → 201XXXXXXXXX; null when not a plausible mobile. */
function normalizePhone(raw) {
  let d = toWesternDigits(raw).replace(/[^\d]/g, '');
  if (!d) return null;
  if (d.startsWith('0020')) d = d.slice(4);
  else if (d.startsWith('20')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  if (/^1[0125]\d{8}$/.test(d)) return '20' + d; // 10/11/12/15 prefixes, 10 digits
  return null;
}

function cairoNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
}

function loadLedgerPhones() {
  const seen = new Set();
  try {
    const lines = fs.readFileSync(LEDGER, 'utf8').split('\n');
    for (const l of lines) {
      if (!l.trim()) continue;
      try { seen.add(JSON.parse(l).phone); } catch { /* skip bad line */ }
    }
  } catch { /* first run */ }
  return seen;
}

function appendLedger(entry) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.appendFileSync(LEDGER, JSON.stringify(entry) + '\n');
}

function loadDaily() {
  const today = cairoNow().toISOString().slice(0, 10);
  try {
    const d = JSON.parse(fs.readFileSync(DAILY, 'utf8'));
    if (d.date === today) return d;
  } catch { /* new day */ }
  return { date: today, sent: 0 };
}

function saveDaily(d) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(DAILY, JSON.stringify(d));
}

const TEMPLATE = `السلام عليكم ورحمة الله وبركاته {_SALUTATION_}

مع حضرتك فريق Sierra Estates للتسويق العقاري.

شاهدنا وحدتكم {_UNIT_} ونهتم بتسويقها لمحفظة عملائنا الحصرية بالقاهرة الجديدة.
{_DETAILS_}
هل الوحدة ما زالت متاحة ومناسب لحضرتك التعاون معنا في تسويقها؟

إخلاء مسؤولية: هذه رسالة أعمال من Sierra Estates، وإذا لم ترغب في استقبال رسائل أخرى أرسل كلمة "إلغاء" وسنتوقف فوراً.`;

function buildMessage(r) {
  const bits = [];
  if (r.location) bits.push(`الموقع: ${r.location}`);
  if (r.price) bits.push(`السعر التقديري: ${r.price} جنيه`);
  if (r.bedrooms) bits.push(`الغرف: ${r.bedrooms}`);
  if (r.type) bits.push(`النوع: ${r.type}`);
  const unit = [r.code, r.propertyType].filter(Boolean).join(' — ') || 'المعلنة';
  
  let salutation = 'يا فندم،';
  if (r.name && r.name.trim()) {
    const cleanName = r.name.trim().replace(/^أ[\.\/]\s*/, '');
    salutation = `أ/ ${cleanName}،`;
  }

  return TEMPLATE
    .replace('{_SALUTATION_}', salutation)
    .replace('{_UNIT_}', unit)
    .replace('{_DETAILS_}', bits.length ? bits.join('\n') + '\n' : '');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`owner-outreach: starting (dryRun=${DRY_RUN}, cap=${DAILY_CAP}, window=${ACTIVE_HOURS[0]}-${ACTIVE_HOURS[1]} Cairo, side=${HOST_SIDE}, parallelLines=${PARALLEL_LINES})`);
  if (!process.env.WHATSAPP_API_TOKEN && !process.env.WHATSAPP_API_KEY) {
    console.log('UNCONFIGURED: WHATSAPP_API_TOKEN (operator key) missing');
    process.exit(2);
  }
  if (!process.env.OPENWA_SESSION_ID && !process.env.OPENWA_SESSION_IDS) { console.log('UNCONFIGURED: OPENWA_SESSION_ID / OPENWA_SESSION_IDS missing'); process.exit(2); }

  // Active-hours gate (Cairo) — never text owners at night
  const hr = cairoNow().getHours();
  if (hr < ACTIVE_HOURS[0] || hr >= ACTIVE_HOURS[1]) {
    summary.skippedHours = true;
    console.log(`outside active hours (${hr}:00 Cairo, window ${ACTIVE_HOURS[0]}-${ACTIVE_HOURS[1]}) — nothing sent`);
    console.log(`SUMMARY ${JSON.stringify(summary)}`);
    process.exit(0);
  }

  // Gateway pre-flight — resolve the pool, keep only READY lines for this slot.
  const gw = new GatewayClient();
  const poolEntries = await gw.resolvePool().catch(() => []);
  const readyEntries = [];
  if (poolEntries.length) {
    DAILY_CAP = CAP_EXPLICIT ? PER_LINE_DAILY_CAP : PER_LINE_DAILY_CAP * poolEntries.length;
    for (const e of poolEntries) {
      try {
        const one = await gw.statusFor(e.uuid);
        console.log(`pool session ${e.name} (${e.uuid.slice(0, 8)}): ${one.status}${one.phone ? ` ${one.phone}` : ''}`);
        if (one.status === 'ready') readyEntries.push(e);
      } catch (err) {
        console.log(`pool session ${e.name}: unreachable (${err.message})`);
      }
    }
    if (!readyEntries.length && !DRY_RUN) {
      console.log('no pool session ready — retry at next cron tick');
      console.log(`SUMMARY ${JSON.stringify(summary)}`);
      process.exit(0);
    }
  } else {
    const st = await gw.status().catch(() => ({ status: 'offline' }));
    if (st.status !== 'ready' && !DRY_RUN) {
      console.log(`gateway session not ready (${st.status}) — retry at next cron tick`);
      console.log(`SUMMARY ${JSON.stringify(summary)}`);
      process.exit(0);
    }
  }
  console.log(`gateway: ${poolEntries.length ? `${readyEntries.length}/${poolEntries.length} pool line(s) ready` : 'single-session mode'} | cap ${DAILY_CAP}/day | ${HOST_SIDE} walk`);

  // Fetch sheet
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`sheet fetch HTTP ${res.status}`);
  const parsed = parseCsv(await res.text());
  const headers = parsed[0].map((h) => String(h).trim());
  const col = (names) => headers.findIndex((h) => {
    const clean = h.trim().toLowerCase();
    return names.some((n) => clean === n || clean.includes(n));
  });
  const iCode = col(['code', 'كود']),
    iName = col(['name', 'owner', 'الاسم', 'مالك', 'المرسل']),
    iMob = col(['mobile', 'phone', 'موبايل', 'هاتف', 'تليفون', 'المرسل', 'sender']),
    iAvail = col(['availablty', 'availability', 'الحالة']),
    iLoc = col(['location', 'الكمبوند', 'الموقع']),
    iPrice = col(['unit price', 'price', 'السعر']),
    iBed = col(['bedrooms', 'غرف', 'الغرف']),
    iType = col(['property tybe', 'property type', 'نوع العقار', 'النوع']),
    // Last-contact write-back column ("تاريخ اخر تواصل") — the cross-host
    // dedupe source. 'تواصل' uniquely matches it ("تاريخ اخر تحديث" = update
    // date does NOT contain 'تواصل').
    iLastContact = col(['تواصل', 'contacted', 'last_contact', 'last contact']);
  if (iMob < 0) {
    console.log(`UNCONFIGURED: no Mobile column in sheet. Found headers: [${headers.join(', ')}]`);
    process.exit(2);
  }
  const SHEET_DEDUPE = !/^(0|false|no)$/i.test(process.env.WF_SHEET_DEDUPE || '');

  const contacted = loadLedgerPhones();
  const daily = loadDaily();

  const candidates = [];
  const sheetContacted = new Set(); // phones the sheet already shows as contacted
  const phoneFirstIdx = new Map();  // phone → index of its FIRST candidate row
  for (const r of parsed.slice(1)) {
    const code = (iCode >= 0 ? (r[iCode] || '') : '').trim() || `SE-${candidates.length + 1}`;
    const name = (iName >= 0 ? (r[iName] || '') : '').trim() || 'صاحب الإعلان';
    const phone = normalizePhone(iMob >= 0 ? r[iMob] : '');
    // Cross-host dedupe input: a non-empty last-contact date marks the owner
    // as already contacted EVEN IF the local ledger is fresh (new runner
    // host). Collected before the candidate filters so history is never lost.
    if (phone && iLastContact >= 0 && String(r[iLastContact] || '').trim()) {
      sheetContacted.add(phone);
    }
    const avail = (iAvail >= 0 ? (r[iAvail] || '') : 'available').trim().toLowerCase();
    if (!phone) continue; // no usable mobile
    if (iAvail >= 0 && !AVAIL_OK.includes(avail)) continue; // Not available / Sold / unknown
    // FIRST-OCCURRENCE-WINS (two-host parallel, Oct 2026): an owner with
    // several listings must get ONE intro ever — via their FIRST sheet row.
    // Later duplicate rows are skipped by BOTH hosts (dupOf marker), so the
    // top and bottom walkers can never text the same owner in the same slot
    // through two different rows.
    const dupOf = phoneFirstIdx.has(phone) ? phoneFirstIdx.get(phone) : null;
    if (dupOf === null) phoneFirstIdx.set(phone, candidates.length);
    candidates.push({
      code, name, phone, rawMobile: (iMob >= 0 ? (r[iMob] || '') : '').trim(), avail,
      dupOf,
      location: (iLoc >= 0 ? (r[iLoc] || '') : '').trim(),
      price: (iPrice >= 0 ? (r[iPrice] || '') : '').trim().replace(/[^\d]/g, ''),
      bedrooms: (iBed >= 0 ? (r[iBed] || '') : '').trim().replace(/[^\d]/g, ''),
      propertyType: (iType >= 0 ? (r[iType] || '') : '').trim(),
    });
  }
  // Merge the sheet's contact dates into the ledger set BEFORE any send —
  // a fresh .state dir on a new host must never re-text the 63 owners the
  // Windows run already contacted (their dates are in the sheet).
  if (SHEET_DEDUPE) {
    for (const p of sheetContacted) {
      if (!contacted.has(p)) {
        contacted.add(p);
        summary.sheetDeduped++;
      }
    }
  }
  summary.candidates = candidates.length;
  console.log(`candidates: ${candidates.length} valid rows in sheet | already-contacted ledger: ${contacted.size} (local ledger + ${sheetContacted.size} sheet date(s), ${summary.sheetDeduped} newly deduped${SHEET_DEDUPE ? '' : ', sheet dedupe DISABLED'})`);

  const checkpoint = loadCheckpoint(candidates.length);

  // ── Lane construction ─────────────────────────────────────────────
  // Lanes = READY pool lines (dry-run without a reachable gateway falls back
  // to pseudo lanes so the parallel split can be verified offline).
  let laneEntries = readyEntries.length ? readyEntries : [];
  if (!laneEntries.length && !poolEntries.length) {
    // legacy single-session mode: resolve the configured session name → UUID
    laneEntries = await gw.healthyPool().catch(() => []);
  }
  let lanes;
  if (laneEntries.length) {
    const count = Math.max(1, Math.min(PARALLEL_LINES, laneEntries.length));
    lanes = Array.from({ length: count }, (_, i) => {
      const e = laneEntries[i % laneEntries.length];
      return { name: e.name, uuid: e.uuid || null };
    });
  } else if (DRY_RUN) {
    const count = Math.max(1, Math.min(PARALLEL_LINES, 4));
    lanes = Array.from({ length: count }, (_, i) => ({ name: `dry-lane-${i + 1}`, uuid: null }));
  } else {
    lanes = [{ name: 'session-default', uuid: null }];
  }
  // Direction assignment: split → alternate top/bottom ("2 lines here + 2
  // lines on the other side"); top/bottom → every lane walks that one end.
  lanes = lanes.map((lane, i) => ({
    ...lane,
    direction: HOST_SIDE === 'split' ? (i % 2 === 0 ? 'top' : 'bottom') : HOST_SIDE,
  }));
  summary.lanes = lanes.length;

  const dirCount = { top: 0, bottom: 0 };
  for (const l of lanes) dirCount[l.direction]++;

  console.log(`\n======================================================`);
  console.log(`[outreach] 30-MIN SLOT — ${lanes.length} PARALLEL LINE(S):`);
  for (const l of lanes) console.log(`[outreach]   • ${l.name} → walks ${l.direction === 'top' ? 'FRONT→BACK (top)' : 'BACK→FRONT (bottom)'}`);
  console.log(`[outreach] ${dirCount.top} line(s) on the top end + ${dirCount.bottom} line(s) on the other side | slot batch ${BATCH_CAP} msgs | ${HOST_SIDE === 'split' ? `topCursor ${checkpoint.topCursor} / bottomCursor ${checkpoint.bottomCursor}` : `cursor ${checkpoint.cursor}`}/${candidates.length}`);
  console.log(`======================================================\n`);

  const remaining =
    HOST_SIDE === 'split'
      ? (checkpoint.bottomCursor - checkpoint.topCursor + 1)
      : HOST_SIDE === 'bottom'
        ? (checkpoint.cursor + 1)
        : (candidates.length - checkpoint.cursor);
  if (remaining <= 0 || checkpoint.completed) {
    summary.completed = true;
    console.log('🏁 All candidates in the sheet have already been contacted!');
    console.log(`SUMMARY ${JSON.stringify(summary)}`);
    return;
  }

  // ── Direction-aware atomic claim ───────────────────────────────────
  // JS runs single-threaded: cursor++ between awaits is atomic, so two lanes
  // can never hold the same row. A claimed-but-unsent row (cap boundary) is
  // rewound — candidates are never lost.
  function claim(direction) {
    if (HOST_SIDE === 'split') {
      if (direction === 'bottom') {
        if (checkpoint.bottomCursor >= checkpoint.topCursor) {
          const idx = checkpoint.bottomCursor--;
          return { idx, from: 'bottom' };
        }
        return null;
      }
      if (checkpoint.topCursor <= checkpoint.bottomCursor) {
        const idx = checkpoint.topCursor++;
        return { idx, from: 'top' };
      }
      return null;
    }
    if (HOST_SIDE === 'bottom') {
      if (checkpoint.cursor >= 0) {
        const idx = checkpoint.cursor--;
        return { idx, from: 'bottom' };
      }
      return null;
    }
    if (checkpoint.cursor < candidates.length) {
      const idx = checkpoint.cursor++;
      return { idx, from: 'top' };
    }
    return null;
  }

  function rewind(c) {
    if (HOST_SIDE === 'split') {
      if (c.from === 'top') checkpoint.topCursor = Math.min(checkpoint.topCursor, c.idx);
      else checkpoint.bottomCursor = Math.max(checkpoint.bottomCursor, c.idx);
    } else if (HOST_SIDE === 'bottom') {
      checkpoint.cursor = Math.max(checkpoint.cursor, c.idx);
    } else {
      checkpoint.cursor = Math.min(checkpoint.cursor, c.idx);
    }
    saveCheckpoint(checkpoint);
  }

  function walkDone() {
    if (HOST_SIDE === 'split') return checkpoint.topCursor > checkpoint.bottomCursor;
    if (HOST_SIDE === 'bottom') return checkpoint.cursor < 0;
    return checkpoint.cursor >= candidates.length;
  }

  let batchDone = false;
  let abortBatch = false;
  let sendTickets = 0; // synchronous reservation — the slot cap can never overshoot
  const slotStart = Date.now(); // graceful deadline clock (t0 of the send loop)

  // Mid-slot sheet re-sync: re-fetch the contact-date column every 5 minutes
  // and merge freshly-marked phones into `contacted`, so the OTHER host's
  // writes (1–5 min gviz cache lag) are picked up WITHOUT waiting for the
  // next slot. This is what keeps the meeting-in-the-middle region race-free.
  let lastSheetSync = Date.now();
  async function resyncSheetContacted() {
    if (DRY_RUN) return; // dry-run touches nothing — the sheet cannot change
    try {
      const res2 = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (!res2.ok) return;
      const parsed2 = parseCsv(await res2.text());
      let pickedUp = 0;
      for (const r of parsed2.slice(1)) {
        const phone2 = normalizePhone(iMob >= 0 ? r[iMob] : '');
        if (phone2 && iLastContact >= 0 && String(r[iLastContact] || '').trim()) {
          if (!contacted.has(phone2)) { contacted.add(phone2); pickedUp++; }
        }
      }
      if (pickedUp) {
        summary.sheetDeduped += pickedUp;
        console.log(`[outreach] mid-slot re-sync: ${pickedUp} phone(s) newly marked by the other host — skipped`);
      }
    } catch (e) {
      console.warn(`[outreach] sheet re-sync failed (continuing): ${e.message}`);
    }
  }

  async function laneLoop(lane) {
    while (!batchDone && !abortBatch) {
      // Graceful slot deadline — stop claiming NEW rows so the run exits
      // cleanly (checkpoint saved) instead of being SIGKILLed by the runner.
      if (Date.now() - slotStart >= SLOT_DEADLINE_MS) {
        summary.slotDeadline = true;
        break;
      }
      // Mid-slot cross-host re-sync (5-min cadence, single-flight)
      if (Date.now() - lastSheetSync > 5 * 60_000) {
        lastSheetSync = Date.now();
        await resyncSheetContacted();
      }
      if (summary.sent >= BATCH_CAP) {
        console.log(`\n[outreach] Slot batch cap reached (${summary.sent}/${BATCH_CAP}) — pausing until next 30m slot`);
        batchDone = true;
        break;
      }
      if (daily.sent >= DAILY_CAP) {
        summary.skippedCap++;
        console.log(`\n[outreach] Daily cap reached (${daily.sent}/${DAILY_CAP}) — pausing until next active window`);
        batchDone = true;
        break;
      }
      const claimed = claim(lane.direction);
      if (!claimed) break; // this lane's direction is exhausted
      const { idx } = claimed;
      const cand = candidates[idx];
      const phone = cand.phone;

      if (cand.dupOf !== null && cand.dupOf !== undefined) {
        // Later duplicate row for an owner already carried by an earlier row —
        // the first-occurrence row (wherever the walkers reach it) does the send.
        summary.skippedDupRow++;
      } else if (!contacted.has(phone)) {
        const text = buildMessage(cand);
        if (DRY_RUN) {
          console.log(`[dry-run][${lane.direction}][#${idx}] would send → ${phone} (${cand.code}) via ${lane.name}`);
          summary.sent++;
          summary.bySession[lane.name] = (summary.bySession[lane.name] || 0) + 1;
          summary.byDirection[lane.direction]++;
        } else {
          const ticket = sendTickets++;
          if (ticket >= BATCH_CAP || daily.sent >= DAILY_CAP) {
            // Cap boundary: rewind the claim so the candidate is NOT lost —
            // the next slot re-claims this row.
            rewind(claimed);
            batchDone = true;
            break;
          }
          try {
            const sendOpts = { retries: 2 };
            if (lane.uuid) sendOpts.sessionId = lane.uuid;
            const sendRes = await gw.sendText(phone, text, sendOpts);
            const usedSession = sendRes.session || lane.name;
            summary.sent++;
            summary.bySession[usedSession] = (summary.bySession[usedSession] || 0) + 1;
            summary.byDirection[lane.direction]++;
            daily.sent++;
            saveDaily(daily);
            appendLedger({ phone, code: cand.code, at: new Date().toISOString(), avail: cand.avail, session: usedSession, idx, direction: lane.direction });
            console.log(`sent [${lane.direction}][#${idx}] → ${phone} (${cand.code}) via ${usedSession} [${daily.sent}/${DAILY_CAP} today]`);
            await writeSheetDate(phone, cand.rawMobile, formatCairoDate());
          } catch (err) {
            summary.failed++;
            console.error(`Send failed for ${phone} via ${lane.name}: ${err.message}`);
            if (err.permanent || err.httpStatus === 401 || err.httpStatus === 403) {
              console.error('permanent failure — aborting batch');
              abortBatch = true;
              break;
            }
            // transient failure on this line: the gateway client benches the
            // line; this lane keeps claiming (next send picks a healthy line
            // when uuid is unset, or retries the same line next slot).
          }
        }
        contacted.add(phone);
        // Human anti-ban pacing per LINE: 45–55 s (100 ms in dry-run). Each
        // lane has its own clock, so parallel lines keep the SAME per-line
        // rate — the slot just finishes faster.
        const paceMs = DRY_RUN ? 100 : 45000 + Math.floor(Math.random() * 10000);
        await sleep(paceMs);
      } else {
        summary.skippedDup++;
      }
      saveCheckpoint(checkpoint);
    }
  }

  await Promise.all(lanes.map((lane) => laneLoop(lane)));

  if (summary.slotDeadline) {
    console.log(`[outreach] Slot time budget reached (${Math.round((Date.now() - slotStart) / 60000)} min, ${summary.sent} sent) — resuming at the next 30m slot (checkpoint saved)`);
  }

  if (walkDone()) {
    checkpoint.completed = true;
    summary.completed = true;
    console.log('🎉 Reached the end of all sheet candidates on this side!');
  }
  // Halfway flag: this host's cursors crossed the sheet's middle — the walk
  // is now in territory the other side covers too (sheet dedupe keeps it safe).
  if (HOST_SIDE === 'split') {
    summary.metInTheMiddle = checkpoint.topCursor > checkpoint.bottomCursor
      || checkpoint.topCursor >= Math.ceil(candidates.length / 2);
  } else if (HOST_SIDE === 'top') {
    summary.metInTheMiddle = checkpoint.cursor >= Math.ceil(candidates.length / 2);
  } else {
    summary.metInTheMiddle = checkpoint.cursor <= Math.floor((candidates.length - 1) / 2);
  }
  saveCheckpoint(checkpoint);

  console.log(`[outreach] Completed slot: ${summary.sent} sent, ${summary.failed} failed, ${summary.skippedDup} skipped-dup | byDirection: top ${summary.byDirection.top} / bottom ${summary.byDirection.bottom}`);
  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  console.log('owner-outreach: done');
  return;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`owner-outreach FAILED: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { main, buildMessage, normalizePhone, toWesternDigits };
