'use strict';
/**
 * codes.js — Sequential reference-code assignment (SE-RENT-XXXX / SE-SALE-XXXX).
 * ─────────────────────────────────────────────────────────────────────────────
 * The sheet is the source of truth: on each assignment the existing codes in
 * the Master "Telegram Intake" tab are scanned for the max XXXX per prefix,
 * cross-checked against the local counter (survives restarts via the compose
 * volume at /app/.state), and incremented. Two guards:
 *   · IN-PROCESS MUTEX — Telegram can deliver an album + caption burst; a
 *     naive counter would hand two units the same code.
 *   · SHEET-READ FAILURE → fall back to the local counter and tag the row
 *     `code_source:local` so a human can reconcile (never blocks intake).
 */

const fs = require('fs');
const path = require('path');

const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const CODES_FILE = path.join(STATE_DIR, 'telegram-intake-codes.json');
const PREFIXES = { rent: 'SE-RENT', sale: 'SE-SALE' };

let mutex = Promise.resolve();

/** Serialize code assignment inside this process. */
function withMutex(fn) {
  const next = mutex.then(fn, fn);
  mutex = next.catch(() => {});
  return next;
}

function loadLocal() {
  try {
    return JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
  } catch (_) {
    return { rent: 0, sale: 0, issued: [] };
  }
}

function saveLocal(st) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    const tmp = `${CODES_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(st, null, 1));
    fs.renameSync(tmp, CODES_FILE);
  } catch (_) { /* best-effort — the sheet remains the ledger */ }
}

/** Extract the numeric part of every SE-RENT-XXXX / SE-SALE-XXXX value. */
function scanSheetMaxes(rows, colIndex) {
  const maxes = { rent: 0, sale: 0 };
  for (const row of rows || []) {
    const v = String((row || [])[colIndex] || '');
    const m = v.match(/^SE-(RENT|SALE)-(\d{3,6})$/i);
    if (!m) continue;
    const kind = m[1].toLowerCase();
    const n = parseInt(m[2], 10);
    if (Number.isFinite(n) && n > maxes[kind]) maxes[kind] = n;
  }
  return maxes;
}

/**
 * Assign the next code. `sheetRows` = already-read tab rows (values.get of
 * the Reference Code column); `colIndex` = its 0-based column position.
 * Returns { code, kind, number, source } where source ∈ sheet|local.
 */
function assignCode(kind, sheetRows, colIndex) {
  return withMutex(() => {
    const prefix = PREFIXES[kind];
    if (!prefix) throw new Error(`unknown listing kind '${kind}'`);
    const local = loadLocal();
    let base = local[kind] || 0;
    let source = 'local';
    if (Array.isArray(sheetRows)) {
      // Sheet readable → it is the ledger; local counter only breaks ties.
      const sheetMax = scanSheetMaxes(sheetRows, colIndex)[kind] || 0;
      base = Math.max(base, sheetMax);
      source = 'sheet';
    }
    const number = base + 1;
    const code = `${prefix}-${String(number).padStart(4, '0')}`;
    local[kind] = number;
    local.issued = [{ code, at: new Date().toISOString() }, ...(local.issued || [])].slice(0, 500);
    saveLocal(local);
    return { code, kind, number, source };
  });
}

/** Stable dedupe identity for a re-sent intake text (Telegram retries). */
const crypto = require('crypto');
function intakeHash(text, agentName) {
  const norm = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
    .trim()
    .toLowerCase();
  return crypto.createHash('sha256').update(`${agentName || ''}|${norm}`).digest('hex').slice(0, 24);
}

module.exports = { assignCode, scanSheetMaxes, intakeHash, PREFIXES, CODES_FILE };
