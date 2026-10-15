#!/usr/bin/env node
/**
 * backfill-sheet.mjs — Sierra Estates Historical Outreach Date Backfill
 * ───────────────────────────────────────────────────────────────────────────
 * Reads historical outreach records from the tracker endpoint
 * (http://localhost:2786/tracker.csv?key=SE2026outreach) or local ledger,
 * formats dates to dd/mm/yyyy (Cairo), and writes them to the Google Sheet
 * via the Apps Script /exec endpoint in chunks of 40.
 *
 * Usage:
 *   node backfill-sheet.mjs "<EXEC_URL>" "<SECRET>"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXEC_URL = process.argv[2] || process.env.WF_SHEET_WRITE_URL;
const SECRET = process.argv[3] || process.env.WF_SHEET_WRITE_SECRET;
const TRACKER_URL = process.env.TRACKER_URL || 'http://localhost:2786/tracker.csv?key=SE2026outreach';
const LEDGER_PATH = path.join(__dirname, '.state', 'owner-outreach-ledger.jsonl');
const LOG_FILE = path.join(__dirname, 'backfill-result.log');

function logBoth(msg) {
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
}

function formatCairoDate(isoStr) {
  try {
    const d = isoStr ? new Date(isoStr) : new Date();
    // format as dd/MM/yyyy in Cairo time
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return formatter.format(d);
  } catch {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }
}

async function loadRecords() {
  const records = new Map(); // phone -> { phone, date, code }

  // 1. Try tracker endpoint
  try {
    const res = await fetch(TRACKER_URL, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const csvText = await res.text();
      const lines = csvText.split('\n').filter(Boolean);
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim());
        const phone = parts[0];
        const code = parts[1];
        const at = parts[2];
        if (phone && phone.length >= 7) {
          records.set(phone, {
            phone,
            code,
            date: formatCairoDate(at)
          });
        }
      }
      logBoth(`[backfill] Loaded ${records.size} records from tracker endpoint`);
    }
  } catch (err) {
    logBoth(`[backfill] Tracker endpoint unreachable (${err.message}), falling back to local ledger...`);
  }

  // 2. Fallback or merge with local ledger
  if (records.size === 0 && fs.existsSync(LEDGER_PATH)) {
    const lines = fs.readFileSync(LEDGER_PATH, 'utf8').split('\n').filter(Boolean);
    for (const l of lines) {
      try {
        const row = JSON.parse(l);
        const phone = row.phone;
        const code = row.code || '';
        const at = row.at || row.ts;
        if (phone) {
          records.set(phone, {
            phone,
            code,
            date: formatCairoDate(at)
          });
        }
      } catch {}
    }
    logBoth(`[backfill] Loaded ${records.size} records from local ledger file`);
  }

  return Array.from(records.values());
}

async function main() {
  fs.writeFileSync(LOG_FILE, `=== Sierra Backfill Run: ${new Date().toISOString()} ===\n`);

  if (!EXEC_URL) {
    logBoth('ERROR: EXEC_URL is required as argument 1 or WF_SHEET_WRITE_URL env var.');
    process.exit(1);
  }
  if (!SECRET) {
    logBoth('ERROR: SECRET is required as argument 2 or WF_SHEET_WRITE_SECRET env var.');
    process.exit(1);
  }

  logBoth(`[backfill] Target EXEC_URL: ${EXEC_URL.slice(0, 40)}...`);
  logBoth(`[backfill] Secret present: true`);

  const records = await loadRecords();
  const total = records.length;
  if (total === 0) {
    logBoth('No records found to backfill.');
    logBoth('DONE — اتكتب 0/0');
    return;
  }

  logBoth(`[backfill] Starting backfill of ${total} records in chunks of 40...`);

  let totalUpdated = 0;
  const CHUNK_SIZE = 40;
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const payload = {
      secret: SECRET,
      rows: chunk.map(r => ({ phone: r.phone, date: r.date, code: r.code }))
    };

    try {
      const res = await fetch(EXEC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000)
      });

      if (!res.ok) {
        logBoth(`[backfill] Chunk ${i / CHUNK_SIZE + 1} HTTP ${res.status}: ${res.statusText}`);
        continue;
      }

      const json = await res.json();
      if (json.ok) {
        const updated = json.updated || 0;
        totalUpdated += updated;
        logBoth(`[backfill] Chunk ${i / CHUNK_SIZE + 1}: sent ${chunk.length}, written to sheet: ${updated} (progress: ${Math.min(i + CHUNK_SIZE, total)}/${total})`);
      } else {
        logBoth(`[backfill] Chunk ${i / CHUNK_SIZE + 1} rejected: ${json.error || 'unknown error'}`);
      }
    } catch (err) {
      logBoth(`[backfill] Chunk ${i / CHUNK_SIZE + 1} failed: ${err.message}`);
    }

    // Pacing delay between chunks to avoid rate limits
    await new Promise(r => setTimeout(r, 1500));
  }

  logBoth(`DONE — اتكتب ${totalUpdated}/${total}`);
}

main().catch(err => {
  logBoth(`FATAL: ${err.message}`);
  process.exit(1);
});
