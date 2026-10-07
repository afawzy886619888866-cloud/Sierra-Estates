'use strict';
/**
 * Workflow 09: Owner Outreach — scheduled owner connection from the inventory sheet
 * ──────────────────────────────────────────────────────────────────────────────────
 * Replaces the GitHub-Actions-based owner contact plan (GH Actions is currently
 * down for this project): everything runs on the EC2 se-workflow-runner cron,
 * Africa/Cairo time, no external scheduler needed.
 *
 * Data flow (zero-credential, same as 08-units-sync):
 *   Google Sheet (public gviz CSV, owner inventory tab)
 *     → rows with Code + Mobile + outreach-able Availability
 *     → personalized Arabic intro via the OpenWA gateway (same session as the app)
 *     → local JSONL ledger (one line per contacted phone, never re-contacted)
 *
 * Safety rails:
 *   • Daily cap (WF_OWNER_CONTACT_DAILY_CAP, default 40) counted per CAIRO day
 *   • Active hours 10:00–20:00 Cairo only; outside the window the run exits 0
 *   • 3–6 s jittered pacing between sends; permanent-4xx aborts the batch
 *   • Gateway pre-flight: session must be `ready` or the run exits 0 (retry next cron)
 *   • Skip list: Not available / Sold / rows without Mobile
 *   • Opt-out line in EVERY message (Arabic disclaimer + "إلغاء" unsubscribe)
 *   • Ledger dedupe: a phone is contacted at most once EVER (across reruns)
 *   • WF_DRY_RUN=1 → prints would-send lines, touches nothing
 *
 * Env: UNITS_SHEET_ID / UNITS_SHEET_GID (defaults = owner inventory sheet),
 *      WHATSAPP_API_TOKEN, OPENWA_SESSION_ID, WHATSAPP_API_URL,
 *      WF_OWNER_CONTACT_DAILY_CAP (40), WF_DRY_RUN, WF_OUTREACH_AVAILABILITIES
 * Exit: 0 ok · 2 unconfigured · 1 error
 */
const fs = require('fs');
const path = require('path');
const { GatewayClient } = require('../lib/gateway-client');

const SHEET_ID = process.env.UNITS_SHEET_ID || '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';
const SHEET_GID = process.env.UNITS_SHEET_GID || '1127958606';
const DAILY_CAP = parseInt(process.env.WF_OWNER_CONTACT_DAILY_CAP || '40', 10);
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.WF_DRY_RUN || '');
const AVAIL_OK = String(process.env.WF_OUTREACH_AVAILABILITIES || 'available,follow up,no answer')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const AH_ENV = String(process.env.WF_OUTREACH_ACTIVE_HOURS || '10-20').split('-');
const ACTIVE_HOURS = [parseInt(AH_ENV[0], 10) || 0, AH_ENV[1] === undefined || AH_ENV[1] === '' || parseInt(AH_ENV[1], 10) > 23 ? 24 : parseInt(AH_ENV[1], 10)];

const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const LEDGER = path.join(STATE_DIR, 'owner-outreach-ledger.jsonl');
const DAILY = path.join(STATE_DIR, 'owner-outreach-daily.json');

const summary = { candidates: 0, sent: 0, skippedDup: 0, skippedCap: 0, skippedHours: false, failed: 0, dryRun: DRY_RUN };

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

/** Egyptian mobile → 201XXXXXXXXX; null when not a plausible mobile. */
function normalizePhone(raw) {
  let d = String(raw || '').replace(/[^\d]/g, '');
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

const TEMPLATE = `السلام عليكم ورحمة الله وبركاته

مع حضرتك {_NAME_} — من فريق Sierra Estates للتسويق العقاري.

شاهدنا وحدتكم {_UNIT_} ونهتم بتسويقها لمحفظة عملائنا الحصرية بالقاهرة الجديدة.
{_DETAILS_}
هل حاضرين للتعاون معنا في التسويق؟

إخلاء مسؤولية: هذه رسالة أعمال من Sierra Estates، وإذا لم ترغب في استقبال رسائل أخرى أرسل كلمة "إلغاء" وسنتوقف فوراً.`;

function buildMessage(r) {
  const bits = [];
  if (r.location) bits.push(`الموقع: ${r.location}`);
  if (r.price) bits.push(`السعر التقديري: ${r.price} جنيه`);
  if (r.bedrooms) bits.push(`الغرف: ${r.bedrooms}`);
  if (r.type) bits.push(`النوع: ${r.type}`);
  const unit = [r.code, r.propertyType].filter(Boolean).join(' — ') || 'المعلنة';
  return TEMPLATE
    .replace('{_NAME_}', r.name || 'سيادتكم')
    .replace('{_UNIT_}', unit)
    .replace('{_DETAILS_}', bits.length ? bits.join('\n') + '\n' : '');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`owner-outreach: starting (dryRun=${DRY_RUN}, cap=${DAILY_CAP}, window=${ACTIVE_HOURS[0]}-${ACTIVE_HOURS[1]} Cairo)`);
  if (!process.env.WHATSAPP_API_TOKEN && !process.env.WHATSAPP_API_KEY) {
    console.log('UNCONFIGURED: WHATSAPP_API_TOKEN (operator key) missing');
    process.exit(2);
  }
  if (!process.env.OPENWA_SESSION_ID) { console.log('UNCONFIGURED: OPENWA_SESSION_ID missing'); process.exit(2); }

  // Active-hours gate (Cairo) — never text owners at night
  const hr = cairoNow().getHours();
  if (hr < ACTIVE_HOURS[0] || hr >= ACTIVE_HOURS[1]) {
    summary.skippedHours = true;
    console.log(`outside active hours (${hr}:00 Cairo, window ${ACTIVE_HOURS[0]}-${ACTIVE_HOURS[1]}) — nothing sent`);
    console.log(`SUMMARY ${JSON.stringify(summary)}`);
    process.exit(0);
  }

  // Gateway pre-flight (advisory in dry-run — validation must work without a live session)
  const gw = new GatewayClient();
  const st = await gw.status();
  if (st.status !== 'ready' && !DRY_RUN) {
    console.log(`gateway session not ready (${st.status}) — retry at next cron tick`);
    console.log(`SUMMARY ${JSON.stringify(summary)}`);
    process.exit(0);
  }
  console.log(`gateway status: ${st.status} ${st.status === 'ready' ? `(${st.phone || '?'} push=${st.pushName || '?'})` : '(dry-run continues anyway)'} `);

  // Fetch sheet
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`sheet fetch HTTP ${res.status}`);
  const parsed = parseCsv(await res.text());
  const headers = parsed[0].map((h) => String(h).trim());
  const col = (names) => headers.findIndex((h) => names.some((n) => h.toLowerCase() === n));
  const iCode = col(['code']), iName = col(['name', 'owner']), iMob = col(['mobile', 'phone']),
    iAvail = col(['availablty', 'availability']), iLoc = col(['location']),
    iPrice = col(['unit price', 'price']), iBed = col(['bedrooms']), iType = col(['property tybe', 'property type']);
  if (iMob < 0) { console.log('UNCONFIGURED: no Mobile column in sheet'); process.exit(2); }

  const contacted = loadLedgerPhones();
  const daily = loadDaily();

  const candidates = [];
  for (const r of parsed.slice(1)) {
    const code = (iCode >= 0 ? (r[iCode] || '') : '').trim();
    const name = (iName >= 0 ? (r[iName] || '') : '').trim();
    const phone = normalizePhone(iMob >= 0 ? r[iMob] : '');
    const avail = (iAvail >= 0 ? (r[iAvail] || '') : '').trim().toLowerCase();
    if (!code || !phone) continue; // no code (junk row) or no usable mobile
    if (!AVAIL_OK.includes(avail)) continue; // Not available / Sold / unknown
    candidates.push({
      code, name, phone, avail,
      location: (iLoc >= 0 ? (r[iLoc] || '') : '').trim(),
      price: (iPrice >= 0 ? (r[iPrice] || '') : '').trim().replace(/[^\d]/g, ''),
      bedrooms: (iBed >= 0 ? (r[iBed] || '') : '').trim().replace(/[^\d]/g, ''),
      propertyType: (iType >= 0 ? (r[iType] || '') : '').trim(),
    });
  }
  // dedupe by phone (a person owning several units gets ONE message)
  const byPhone = new Map();
  for (const c of candidates) if (!byPhone.has(c.phone)) byPhone.set(c.phone, c);
  summary.candidates = byPhone.size;
  console.log(`candidates: ${byPhone.size} unique phones (${candidates.length} rows) | already-contacted ledger: ${contacted.size}`);

  for (const [phone, c] of byPhone) {
    if (contacted.has(phone)) { summary.skippedDup++; continue; }
    if (daily.sent >= DAILY_CAP) { summary.skippedCap++; continue; }

    const text = buildMessage(c);
    if (DRY_RUN) {
      console.log(`[dry-run] would send → ${phone} (${c.code}, ${c.avail}): ${text.split('\n')[0]}…`);
      summary.sent++;
      continue;
    }
    try {
      await gw.sendText(phone, text, { retries: 2 });
      summary.sent++;
      daily.sent++;
      saveDaily(daily);
      appendLedger({ phone, code: c.code, at: new Date().toISOString(), avail: c.avail });
      contacted.add(phone);
      console.log(`sent → ${phone} (${c.code}) [${daily.sent}/${DAILY_CAP} today]`);
    } catch (err) {
      summary.failed++;
      console.error(`send failed for ${phone}: ${err.message}`);
      if (err.permanent || err.httpStatus === 401 || err.httpStatus === 403) {
        console.error('permanent failure — aborting batch to protect the session');
        break;
      }
    }
    await sleep(3000 + Math.floor(Math.random() * 3000));
  }

  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  console.log('owner-outreach: done');
  process.exit(0);
}

main().catch((err) => {
  console.error(`owner-outreach FAILED: ${err.message}`);
  process.exit(1);
});
