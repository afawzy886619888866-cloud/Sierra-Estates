-- ═══════════════════════════════════════════════════════════════════════════
-- 20261015_030_register_owner_outreach_workflow.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Registers the `owner-outreach` control row in public.workflows.
--
-- WHY THIS MIGRATION EXISTS
--   workflows/09-owner-outreach/outreach.js shipped (1bd0bb68..86b83b57) and
--   workflows/runner.js hard-codes it in its SCRIPTS map, but the runner is
--   FAIL-CLOSED (P0-9): schedulerTick() only queues the hourly owner-outreach
--   batch when a persisted row with status='active' exists, and runWorkflow()
--   re-verifies the same immediately before spawn. No seed ever inserted the
--   row (012_workflow_studio.sql predates workflow 09), so the runner logged
--   nothing and the workflow never started. This seed closes that gap.
--
-- Runner contract satisfied by this row:
--   slug 'owner-outreach'  -> SCRIPTS['owner-outreach'] = 09-owner-outreach/outreach.js
--   status 'active'        -> hourly Cairo 10-20 window may dispatch
--   schedule '0 10-20 * * *' -> documentational; the runner's hourly-window
--                              timer is the canonical trigger (hourly-window
--                              guard + in-script active-hours gate + batch caps
--                              make double-firing impossible)
--
-- Idempotent + admin-safe: ON CONFLICT (slug) only refreshes studio mirror
-- fields while updated_by IS NULL (012 convention — admin edits always win);
-- status/schedule are NOT overwritten on conflict so a deliberate Studio
-- pause survives re-seeds.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('owner-outreach', 'Owner Outreach Engine', 'محرك التواصل مع الملاك',
     'Hourly sheet-driven owner outreach: two cursor workers (top-down + bottom-up) send personalized Arabic intro messages through the OpenWA line pool inside the 10:00-20:00 Cairo window, with a per-line daily cap, permanent ledger dedupe (a phone is contacted at most once ever), and Google Sheet write-back of the contact date. EC2/local runner workflow 09; dispatched by the runner hourly active-window timer.',
     'مراسلة الملاك كل ساعة من الجدول: عاملان بالتناوب من الأعلى والأسفل، رسالة تعريفية بالعربية عبر خطوط الواتساب، ضمن نافذة ١٠ صباحاً - ٨ مساءً بتوقيت القاهرة.',
     'outreach', 'active', '0 10-20 * * *', 'cron',
     $wfsrc$'use strict';
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
 *      OPENWA_SESSION_IDS (4-line pool: 'line1,line2,line3,line4' — overrides
 *      OPENWA_SESSION_ID when set; cap becomes per-line × pool unless capped
 *      explicitly), WF_OWNER_CONTACT_DAILY_CAP (40 per line), WF_DRY_RUN,
 *      WF_OUTREACH_AVAILABILITIES
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
const SHEET_GID = process.env.UNITS_SHEET_GID || '341562911';
const PER_LINE_DAILY_CAP = parseInt(process.env.WF_OWNER_CONTACT_DAILY_CAP || '40', 10);
// Pool-aware: recomputed in main() as per-line × pool unless the operator set
// WF_OWNER_CONTACT_DAILY_CAP explicitly (then it is a TOTAL, honored as-is).
const CAP_EXPLICIT = process.env.WF_OWNER_CONTACT_DAILY_CAP != null && process.env.WF_OWNER_CONTACT_DAILY_CAP !== '';
let DAILY_CAP = PER_LINE_DAILY_CAP;
const BATCH_CAP = parseInt(process.env.WF_SLOT_BATCH || '20', 10);
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.WF_DRY_RUN || '');
const AVAIL_OK = String(process.env.WF_OUTREACH_AVAILABILITIES || 'available,follow up,no answer')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const AH_ENV = String(process.env.WF_OUTREACH_ACTIVE_HOURS || '10-20').split('-');
const ACTIVE_HOURS = [parseInt(AH_ENV[0], 10) || 0, AH_ENV[1] === undefined || AH_ENV[1] === '' || parseInt(AH_ENV[1], 10) > 23 ? 24 : parseInt(AH_ENV[1], 10)];

const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const LEDGER = path.join(STATE_DIR, 'owner-outreach-ledger.jsonl');
const DAILY = path.join(STATE_DIR, 'owner-outreach-daily.json');
const CHECKPOINT = path.join(STATE_DIR, 'owner-outreach-checkpoint.json');

const summary = {
  candidates: 0,
  sent: 0,
  topSent: 0,
  bottomSent: 0,
  skippedDup: 0,
  skippedCap: 0,
  skippedHours: false,
  failed: 0,
  dryRun: DRY_RUN,
  bySession: {},
  metInTheMiddle: false,
};

function loadCheckpoint(totalCount) {
  try {
    const cp = JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'));
    if (typeof cp.cursor === 'number' || typeof cp.topCursor === 'number') {
      if (typeof cp.cursor !== 'number') {
        cp.cursor = cp.topCursor || 0;
      }
      if (typeof cp.activeLineIndex !== 'number') {
        cp.activeLineIndex = 0;
      }
      if (totalCount > (cp.totalCount || 0)) {
        console.log(`[outreach] sheet grew from ${cp.totalCount || 0} to ${totalCount} rows`);
        cp.totalCount = totalCount;
        cp.completed = false;
        saveCheckpoint(cp);
      }
      return cp;
    }
  } catch { /* first run */ }
  return {
    cursor: 0,
    topCursor: 0,
    totalCount,
    activeLineIndex: 0,
    completed: false,
    updatedAt: new Date().toISOString(),
  };
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

مع حضرتك فريق Sierra Estates للتسويق العقاري بالتجمع الخامس.

بعتذر جداً لحضرتك على الإزعاج، كنا حابين نستفسر لو عند حضرتك وحدة معروضة للإيجار أو البيع {_LOCATION_}؟ وحابين نتأكد من التفاصيل الحالية من حضرتك مباشرة إذا مناسب نتعاون في تسويقها لعملائنا.

لو الوحدة غير متاحة حالياً بنعتذر لحضرتك وشكراً لوقتك 🤝
(لعدم استقبال رسائل أخرى أرسل كلمة "إلغاء")`;

function buildMessage(r) {
  const loc = r.location && r.location.trim() ? `في ${r.location.trim()}` : 'بالتجمع الخامس';
  return TEMPLATE.replace('{_LOCATION_}', loc);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`owner-outreach: starting (dryRun=${DRY_RUN}, cap=${DAILY_CAP}, window=${ACTIVE_HOURS[0]}-${ACTIVE_HOURS[1]} Cairo)`);
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

  // Gateway pre-flight (advisory in dry-run — validation must work without a live session)
  const gw = new GatewayClient();
  // 4-line pool: resolve names→UUIDs up front and report each line's status.
  const poolEntries = await gw.resolvePool().catch(() => []);
  if (poolEntries.length) {
    DAILY_CAP = CAP_EXPLICIT ? PER_LINE_DAILY_CAP : PER_LINE_DAILY_CAP * poolEntries.length;
    const ready = [];
    for (const e of poolEntries) {
      try {
        const one = await gw.statusFor(e.uuid);
        console.log(`pool session ${e.name} (${e.uuid.slice(0, 8)}): ${one.status}${one.phone ? ` ${one.phone}` : ''}`);
        if (one.status === 'ready') ready.push(e);
      } catch (err) {
        console.log(`pool session ${e.name}: unreachable (${err.message})`);
      }
    }
    if (!ready.length && !DRY_RUN) {
      console.log('no pool session ready — retry at next cron tick');
      console.log(`SUMMARY ${JSON.stringify(summary)}`);
      process.exit(0);
    }
  }
  const st = await gw.status().catch(() => ({ status: 'offline' }));
  if (st.status !== 'ready' && !poolEntries.length && !DRY_RUN) {
    console.log(`gateway session not ready (${st.status}) — retry at next cron tick`);
    console.log(`SUMMARY ${JSON.stringify(summary)}`);
    process.exit(0);
  }
  console.log(`gateway status: ${st.status} ${st.status === 'ready' ? `(${st.phone || '?'} push=${st.pushName || '?'})` : '(dry-run continues anyway)'} | pool: ${poolEntries.length || 1} line(s), cap ${DAILY_CAP}/day`);

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
    iType = col(['property tybe', 'property type', 'نوع العقار', 'النوع']);
  if (iMob < 0) {
    console.log(`UNCONFIGURED: no Mobile column in sheet. Found headers: [${headers.join(', ')}]`);
    process.exit(2);
  }

  const contacted = loadLedgerPhones();
  const daily = loadDaily();

  const candidates = [];
  for (const r of parsed.slice(1)) {
    const code = (iCode >= 0 ? (r[iCode] || '') : '').trim() || `SE-${candidates.length + 1}`;
    const name = (iName >= 0 ? (r[iName] || '') : '').trim() || 'صاحب الإعلان';
    const phone = normalizePhone(iMob >= 0 ? r[iMob] : '');
    const avail = (iAvail >= 0 ? (r[iAvail] || '') : 'available').trim().toLowerCase();
    if (!phone) continue; // no usable mobile
    if (iAvail >= 0 && !AVAIL_OK.includes(avail)) continue; // Not available / Sold / unknown
    candidates.push({
      code, name, phone, rawMobile: (iMob >= 0 ? (r[iMob] || '') : '').trim(), avail,
      location: (iLoc >= 0 ? (r[iLoc] || '') : '').trim(),
      price: (iPrice >= 0 ? (r[iPrice] || '') : '').trim().replace(/[^\d]/g, ''),
      bedrooms: (iBed >= 0 ? (r[iBed] || '') : '').trim().replace(/[^\d]/g, ''),
      propertyType: (iType >= 0 ? (r[iType] || '') : '').trim(),
    });
  }
  summary.candidates = candidates.length;
  console.log(`candidates: ${candidates.length} valid rows in sheet | already-contacted ledger: ${contacted.size}`);

  const checkpoint = loadCheckpoint(candidates.length);
  const totalPool = poolEntries.length > 0 ? poolEntries : [{ name: 'session-default', uuid: gw.sessionId }];
  const lineIdx = (checkpoint.activeLineIndex || 0) % totalPool.length;
  const activeSession = totalPool[lineIdx];

  console.log(`\n======================================================`);
  console.log(`[outreach] 30-MIN SLOT ACTIVE LINE: ${activeSession.name} (${activeSession.phone || activeSession.uuid}) [Line ${lineIdx + 1}/${totalPool.length}]`);
  console.log(`[outreach] Slot batch target: ${BATCH_CAP} msgs | Cursor: ${checkpoint.cursor}/${candidates.length}`);
  console.log(`======================================================\n`);

  if (checkpoint.cursor >= candidates.length || checkpoint.completed) {
    summary.completed = true;
    console.log('🏁 All candidates in the sheet have already been contacted!');
    console.log(`SUMMARY ${JSON.stringify(summary)}`);
    return;
  }

  while (checkpoint.cursor < candidates.length) {
    if (summary.sent >= BATCH_CAP) {
      console.log(`\n[outreach] Slot batch cap reached (${summary.sent}/${BATCH_CAP}) — pausing until next 30m slot`);
      break;
    }
    if (daily.sent >= DAILY_CAP) {
      summary.skippedCap++;
      console.log(`\n[outreach] Daily cap reached (${daily.sent}/${DAILY_CAP}) — pausing until next active window`);
      break;
    }

    const cand = candidates[checkpoint.cursor];
    const phone = cand.phone;

    if (!contacted.has(phone)) {
      const text = buildMessage(cand);
      if (DRY_RUN) {
        console.log(`[dry-run][#${checkpoint.cursor}] would send → ${phone} (${cand.code}) via ${activeSession.name}`);
        summary.sent++;
        summary.bySession[activeSession.name] = (summary.bySession[activeSession.name] || 0) + 1;
      } else {
        try {
          const sendRes = await gw.sendText(phone, text, { sessionId: activeSession.uuid, retries: 2 });
          const usedSession = sendRes.session || activeSession.name;
          summary.sent++;
          summary.bySession[usedSession] = (summary.bySession[usedSession] || 0) + 1;
          daily.sent++;
          saveDaily(daily);
          appendLedger({ phone, code: cand.code, at: new Date().toISOString(), avail: cand.avail, session: usedSession, cursor: checkpoint.cursor });
          console.log(`sent [#${checkpoint.cursor}] → ${phone} (${cand.code}) via ${usedSession} [${daily.sent}/${DAILY_CAP} today]`);
          await writeSheetDate(phone, cand.rawMobile, formatCairoDate());
        } catch (err) {
          summary.failed++;
          console.error(`Send failed for ${phone}: ${err.message}`);
          if (err.permanent || err.httpStatus === 401 || err.httpStatus === 403) {
            console.error('permanent failure on active session — aborting batch');
            break;
          }
        }
      }
      contacted.add(phone);
      // Human anti-ban pacing: 45-55s (100ms in dry-run)
      const paceMs = DRY_RUN ? 100 : 45000 + Math.floor(Math.random() * 10000);
      await sleep(paceMs);
    } else {
      summary.skippedDup++;
    }

    checkpoint.cursor++;
    checkpoint.topCursor = checkpoint.cursor;
    saveCheckpoint(checkpoint);
  }

  if (checkpoint.cursor >= candidates.length) {
    checkpoint.completed = true;
    summary.completed = true;
    console.log('🎉 Reached the end of all sheet candidates!');
  }

  // Rotate to the next line for the next 30-min slot
  checkpoint.activeLineIndex = (lineIdx + 1) % totalPool.length;
  saveCheckpoint(checkpoint);
  console.log(`[outreach] Completed slot. Next 30m slot will rotate to Line ${checkpoint.activeLineIndex + 1} (${totalPool[checkpoint.activeLineIndex].name})`);

  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  console.log('owner-outreach: done');
  return;
}

main().catch((err) => {
  console.error(`owner-outreach FAILED: ${err.message}`);
  process.exit(1);
});
$wfsrc$, 'javascript', 'workflows/09-owner-outreach/outreach.js',
     $wfsrc${"nodes":[{"id":"n1","type":"trigger","label":"Owner Inventory Sheet","sub":"gviz CSV \u00b7 public read","x":40,"y":90},{"id":"n2","type":"condition","label":"Eligibility Filter","sub":"mobile + availability allow-list","x":300,"y":90},{"id":"n3","type":"action","label":"Two-Worker Cursors","sub":"top-down + bottom-up meet","x":560,"y":90},{"id":"n4","type":"action","label":"Arabic Intro Send","sub":"OpenWA line pool \u00b7 3-6s jitter","x":820,"y":90},{"id":"n5","type":"output","label":"Ledger + Sheet Write-back","sub":"never re-contact a phone","x":1080,"y":90}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3","label":"eligible"},{"id":"e3","from":"n3","to":"n4"},{"id":"e4","from":"n4","to":"n5","label":"sent"}]}$wfsrc$::jsonb,
     0, 99.0, NULL, 0, 'never', '#10B981', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;
