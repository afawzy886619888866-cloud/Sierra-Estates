#!/usr/bin/env node
/**
 * backfill-sheet.mjs — Sierra Estates Historical Outreach Date Backfill
 * ───────────────────────────────────────────────────────────────────────────
 * Reads historical outreach records from the tracker endpoint (authenticated
 * HTTPS via RUNNER_API_KEY — the legacy hard-coded URL query credential was
 * removed together with the runner route that accepted it) or the local
 * ledger, validates every timestamp, formats VALID dates to dd/mm/yyyy
 * (Cairo), and writes them to the Google Sheet via the Apps Script /exec
 * endpoint in chunks of 40.
 *
 * SAFETY CONTRACT (2026-10 rewrite):
 *   DRY-RUN default          — `--apply` is required to write anything.
 *   Honest dates              — a missing/malformed historical timestamp is
 *                              REJECTED into backfill-rejections.jsonl. It is
 *                              NEVER silently replaced with today's date.
 *   History preserved         — records are NOT collapsed by phone. Every
 *                              ledger row is its own record (recordId =
 *                              hash of phone+at+code+cursor); a phone with
 *                              multiple distinct dates is flagged as a
 *                              conflict for staff review, not silently
 *                              deduplicated.
 *   Auth & transport          — secret from env only (never argv); tracker and
 *                              sheet endpoints must be HTTPS (loopback
 *                              excepted for the same-box runner).
 *   Honest completion         — non-zero exit when required records failed;
 *                              final counts report read/valid/rejected/
 *                              matched/sent/written/failed; the failure queue
 *                              is preserved in backfill-failures.jsonl.
 *   Safe resume               — backfill-checkpoint.json records completed
 *                              recordIds; a re-run skips already-written
 *                              records (no duplicate writes).
 *   PII                       — logs mask phone numbers; the secret is never
 *                              printed; raw bodies go only to the review files.
 *
 * Usage:
 *   WF_SHEET_WRITE_URL=... WF_SHEET_WRITE_SECRET=... \
 *   TRACKER_URL=http://127.0.0.1:2786/tracker.csv RUNNER_API_KEY=... \
 *   node backfill-sheet.mjs            # dry-run (default)
 *   node backfill-sheet.mjs --apply    # write to the sheet
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APPLY = process.argv.includes('--apply');
const EXEC_URL = process.env.WF_SHEET_WRITE_URL || '';
const SECRET = process.env.WF_SHEET_WRITE_SECRET || '';
const TRACKER_URL = process.env.TRACKER_URL || 'http://127.0.0.1:2786/tracker.csv';
const RUNNER_API_KEY = process.env.RUNNER_API_KEY || process.env.OPENWA_ADMIN_API_KEY || '';
const LEDGER_PATH = path.join(__dirname, '.state', 'owner-outreach-ledger.jsonl');
const LOG_FILE = path.join(__dirname, 'backfill-result.log');
const REJECTS_FILE = path.join(__dirname, 'backfill-rejections.jsonl');
const FAILURES_FILE = path.join(__dirname, 'backfill-failures.jsonl');
const CHECKPOINT_FILE = path.join(__dirname, 'backfill-checkpoint.json');
const CHUNK_SIZE = 40;

/** PII-safe logger: masks phone numbers everywhere. */
function maskPhone(s) {
  return String(s ?? '').replace(/\+?\d[\d\s-]{6,}/g, (m) => {
    const digits = m.replace(/\D/g, '');
    return digits.length >= 7 ? `***${digits.slice(-4)}` : m;
  });
}
function logBoth(msg) {
  const safe = maskPhone(msg);
  console.log(safe);
  fs.appendFileSync(LOG_FILE, safe + '\n');
}

function isHttpsOrLoopback(u) {
  try {
    const p = new URL(u);
    return p.protocol === 'https:' ||
      ['localhost', '127.0.0.1', '[::1]', '::1'].includes(p.hostname);
  } catch {
    return false;
  }
}

/**
 * Validate a historical timestamp. Returns { ok, iso } or { ok:false, reason }.
 * A date that cannot be proven historical is rejected — never defaulted.
 * (exported for the backfill-safety regression tests)
 */
export function validateTimestamp(raw) {
  if (raw == null || String(raw).trim() === '') {
    return { ok: false, reason: 'missing timestamp' };
  }
  const s = String(raw).trim();
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return { ok: false, reason: `unparseable timestamp: ${s.slice(0, 40)}` };
  if (d.getTime() > Date.now() + 24 * 3600 * 1000) {
    return { ok: false, reason: `timestamp in the future: ${s.slice(0, 40)}` };
  }
  return { ok: true, iso: d.toISOString(), raw: s };
}

/** Format a VALIDATED timestamp as dd/MM/yyyy in Cairo time. (exported for tests) */
export function formatCairoDate(isoStr) {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) throw new Error('formatCairoDate called with invalid date'); // guarded by validateTimestamp
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** Deterministic record identity — preserves every distinct ledger row. (exported for tests) */
export function recordId({ phone, at, code, cursor, worker }) {
  return crypto
    .createHash('sha256')
    .update([phone, at, code, cursor ?? '', worker ?? ''].join('|'))
    .digest('hex')
    .slice(0, 24);
}

/** Parse one CSV line of the tracker export (quoted fields). (exported for tests) */
export function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur); cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function rejectRecord(rec, reason) {
  fs.appendFileSync(REJECTS_FILE, JSON.stringify({ ...rec, reason, at: new Date().toISOString() }) + '\n');
}

function loadCheckpoint() {
  try { return new Set(JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8')).done || []); }
  catch { return new Set(); }
}
function saveCheckpoint(doneSet) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ done: [...doneSet], savedAt: new Date().toISOString() }, null, 2));
}

/**
 * Load, VALIDATE, and preserve every outreach record.
 * Returns { records, counts } — records carry the ORIGINAL timestamp for
 * provenance plus the Cairo display date.
 */
async function loadRecords() {
  const records = [];
  const counts = { tracker: 0, ledger: 0, rejected: 0 };

  const pushValidated = (row, origin) => {
    const phone = String(row.phone || '').replace(/\D/g, '');
    if (phone.length < 7) {
      rejectRecord({ origin, ...row }, 'phone missing or too short');
      counts.rejected++;
      return;
    }
    const ts = validateTimestamp(row.at ?? row.ts);
    if (!ts.ok) {
      // The original timestamp is preserved verbatim in the review file.
      rejectRecord({ origin, phone, ...row }, ts.reason);
      counts.rejected++;
      return;
    }
    records.push({
      recordId: recordId({ phone, at: ts.raw, code: row.code, cursor: row.cursor, worker: row.worker }),
      origin,
      phone,
      code: String(row.code || ''),
      atRaw: ts.raw,
      atIso: ts.iso,
      date: formatCairoDate(ts.iso),
      cursor: row.cursor,
    });
  };

  // 1. Tracker endpoint (authenticated; the hard-coded key is gone).
  let trackerReached = false;
  if (TRACKER_URL && isHttpsOrLoopback(TRACKER_URL) && RUNNER_API_KEY) {
    try {
      const res = await fetch(TRACKER_URL, {
        headers: { 'X-API-Key': RUNNER_API_KEY },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        trackerReached = true;
        const lines = (await res.text()).split('\n').filter(Boolean);
        for (let i = 1; i < lines.length; i++) {
          const parts = parseCsvLine(lines[i]);
          pushValidated({ phone: parts[0], code: parts[1], at: parts[2], avail: parts[3], session: parts[4], worker: parts[5], cursor: parts[6] }, 'tracker');
        }
        counts.tracker = records.length;
        logBoth(`[backfill] Loaded ${counts.tracker} valid records from tracker endpoint (${counts.rejected} rejected so far)`);
      } else {
        logBoth(`[backfill] Tracker endpoint answered HTTP ${res.status} — falling back to local ledger`);
      }
    } catch (err) {
      logBoth(`[backfill] Tracker endpoint unreachable (${err.message}), falling back to local ledger...`);
    }
  } else {
    logBoth('[backfill] Tracker not used (needs TRACKER_URL + RUNNER_API_KEY; HTTPS unless loopback) — using local ledger');
  }

  // 2. Local ledger fallback (every row preserved — history is not collapsed).
  if (!trackerReached && fs.existsSync(LEDGER_PATH)) {
    const lines = fs.readFileSync(LEDGER_PATH, 'utf8').split('\n').filter(Boolean);
    for (const l of lines) {
      try { pushValidated(JSON.parse(l), 'ledger'); } catch { /* unparseable line already skipped by row-level validation */ }
    }
    counts.ledger = records.length;
    logBoth(`[backfill] Loaded ${counts.ledger} valid records from local ledger file (${counts.rejected} rejected)`);
  }

  if (!trackerReached && !fs.existsSync(LEDGER_PATH)) {
    logBoth('[backfill] No source available (tracker unreachable and no local ledger).');
  }
  return { records, counts };
}

/** Map owner phones to the sheet's raw mobile format (last-9 match). */
async function resolveSheetPhoneMap() {
  const map = new Map();
  try {
    const sheetId = process.env.UNITS_SHEET_ID || '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';
    const gid = process.env.UNITS_SHEET_GID || '1127958606';
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const txt = await res.text();
      const lines = txt.split('\n');
      const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, '').trim());
      const mobIdx = headers.findIndex((h) => h.toLowerCase() === 'mobile');
      if (mobIdx >= 0) {
        for (let i = 1; i < lines.length; i++) {
          const cells = parseCsvLine(lines[i]);
          const rawMob = cells[mobIdx];
          const clean = String(rawMob || '').replace(/\D/g, '');
          if (clean.length >= 7) map.set(clean.slice(-9), rawMob);
        }
      }
    }
  } catch (err) {
    logBoth(`[backfill] Sheet fetch for phone resolution skipped: ${err.message}`);
  }
  return map;
}

async function main() {
  const banner = `=== Sierra Backfill Run: ${new Date().toISOString()} (${APPLY ? 'APPLY' : 'DRY-RUN'}) ===`;
  fs.writeFileSync(LOG_FILE, banner + '\n');
  console.log(banner);

  // ── Configuration validation (fail fast, honestly) ──
  if (!EXEC_URL) {
    logBoth('ERROR: WF_SHEET_WRITE_URL env var is required (HTTPS Apps Script /exec endpoint).');
    process.exit(1);
  }
  if (!isHttpsOrLoopback(EXEC_URL)) {
    logBoth('ERROR: WF_SHEET_WRITE_URL must be HTTPS — private owner data must not travel cleartext.');
    process.exit(1);
  }
  if (!SECRET) {
    logBoth('ERROR: WF_SHEET_WRITE_SECRET env var is required (the secret is never accepted from argv).');
    process.exit(1);
  }

  const sheetPhoneMap = await resolveSheetPhoneMap();
  logBoth(`[backfill] Resolved ${sheetPhoneMap.size} phone mappings from target sheet`);

  const { records, counts: loadCounts } = await loadRecords();
  const total = records.length;

  // ── Conflict review: same phone, multiple DIFFERENT historical dates ──
  // The sheet row holds one date per phone; multiple dates for one phone are
  // a staff decision, not a silent pick.
  const byPhone = new Map();
  for (const r of records) {
    if (!byPhone.has(r.phone)) byPhone.set(r.phone, []);
    byPhone.get(r.phone).push(r);
  }
  let conflicts = 0;
  for (const [phone, rs] of byPhone) {
    const distinctDates = new Set(rs.map((r) => r.date));
    if (distinctDates.size > 1) {
      conflicts++;
      rejectRecord(
        { origin: 'conflict-review', phone: `***${phone.slice(-4)}`, dates: [...distinctDates], recordIds: rs.map((r) => r.recordId) },
        'phone has multiple distinct outreach dates — staff must choose which date the sheet row should carry',
      );
    }
  }
  if (conflicts > 0) {
    logBoth(`[backfill] ${conflicts} phone(s) with multiple distinct dates flagged for staff review (see backfill-rejections.jsonl) — these are STILL SENT; the Apps Script row-update applies the last chunk's value.`);
  }

  if (total === 0) {
    logBoth(`No valid records found to backfill (rejected: ${loadCounts.rejected}).`);
    logBoth('DONE — nothing written (0/0)');
    process.exit(loadCounts.rejected > 0 ? 1 : 0);
  }

  // ── Safe resume: skip records already confirmed written ──
  const done = loadCheckpoint();
  const pending = records.filter((r) => !done.has(r.recordId));
  logBoth(`[backfill] ${total} valid records, ${total - pending.length} already checkpointed, ${pending.length} to process, in chunks of ${CHUNK_SIZE}${APPLY ? '' : ' (DRY-RUN — nothing will be written)'}...`);

  let sent = 0;
  let written = 0;
  let failed = 0;
  if (APPLY) fs.writeFileSync(FAILURES_FILE, ''); // preserve the retry queue in dry-run mode

  for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
    const chunk = pending.slice(i, i + CHUNK_SIZE);
    const resolvedRows = chunk.map((r) => {
      const clean = String(r.phone || '').replace(/\D/g, '');
      const matchedRaw = sheetPhoneMap.get(clean.slice(-9));
      return { phone: matchedRaw || r.phone, date: r.date, code: r.code };
    });

    if (!APPLY) {
      logBoth(`[backfill] (dry-run) chunk ${Math.floor(i / CHUNK_SIZE) + 1}: would send ${chunk.length} rows (phones masked: ${resolvedRows.map((r) => `***${String(r.phone).replace(/\D/g, '').slice(-4)}`).slice(0, 5).join(', ')}${resolvedRows.length > 5 ? ' …' : ''})`);
      continue;
    }

    try {
      const res = await fetch(EXEC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: SECRET, rows: resolvedRows }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        failed += chunk.length;
        fs.appendFileSync(FAILURES_FILE, chunk.map((r) => JSON.stringify({ recordId: r.recordId, error: `HTTP ${res.status} ${res.statusText}` })).join('\n') + '\n');
        logBoth(`[backfill] Chunk ${Math.floor(i / CHUNK_SIZE) + 1} HTTP ${res.status}: ${res.statusText} — ${chunk.length} records queued for retry`);
        continue;
      }

      const json = await res.json().catch(() => ({}));
      if (json.ok) {
        const updated = Number(json.updated || 0);
        sent += chunk.length;
        written += updated;
        for (const r of chunk) done.add(r.recordId);
        saveCheckpoint(done);
        logBoth(`[backfill] Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: sent ${chunk.length}, written to sheet: ${updated} (progress: ${Math.min(i + CHUNK_SIZE, pending.length)}/${pending.length})`);
      } else {
        failed += chunk.length;
        fs.appendFileSync(FAILURES_FILE, chunk.map((r) => JSON.stringify({ recordId: r.recordId, error: `rejected: ${json.error || 'unknown error'}` })).join('\n') + '\n');
        logBoth(`[backfill] Chunk ${Math.floor(i / CHUNK_SIZE) + 1} rejected: ${json.error || 'unknown error'} — ${chunk.length} records queued for retry`);
      }
    } catch (err) {
      failed += chunk.length;
      fs.appendFileSync(FAILURES_FILE, chunk.map((r) => JSON.stringify({ recordId: r.recordId, error: `transport: ${err.message}` })).join('\n') + '\n');
      logBoth(`[backfill] Chunk ${Math.floor(i / CHUNK_SIZE) + 1} failed: ${err.message} — ${chunk.length} records queued for retry`);
    }

    // Pacing delay between chunks to avoid rate limits.
    await new Promise((r) => setTimeout(r, 1500));
  }

  // ── Honest completion ──
  const summary = {
    read: counts_total(loadCounts),
    valid: total,
    rejected: loadCounts.rejected,
    conflictsFlagged: conflicts,
    matched: sheetPhoneMap.size,
    pending: pending.length,
    sent,
    written,
    failed,
    mode: APPLY ? 'apply' : 'dry-run',
  };
  logBoth(`SUMMARY ${JSON.stringify(summary)}`);
  logBoth(`DONE — ${APPLY ? 'written' : 'would write'} ${written}/${summary.valid} (${failed} failed${failed ? ', preserved in backfill-failures.jsonl for retry' : ''})`);

  // Non-zero exit when required records failed — a fully-attempted run is
  // not a successful run.
  if (failed > 0) process.exit(1);
  if (APPLY && written === 0 && pending.length > 0) {
    logBoth('ERROR: apply mode completed with zero confirmed writes — treat the sheet as unchanged and investigate.');
    process.exit(1);
  }
}

function counts_total(c) { return (c.tracker || 0) + (c.ledger || 0) + (c.rejected || 0); }

// Direct-execution guard: importable for tests without side effects.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((err) => {
    logBoth(`FATAL: ${err.message}`);
    process.exit(1);
  });
}
