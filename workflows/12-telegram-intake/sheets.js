'use strict';
/**
 * sheets.js — Master Sheet writer for the Telegram intake pipeline.
 * ─────────────────────────────────────────────────────────────────────────────
 * Two tabs in the Master Inventory spreadsheet (the sheet the whole repo
 * already orbits — compose UNITS_SHEET_ID):
 *
 *   1. "Telegram Intake"  — the 20-column central ledger requested by the
 *      owner (Timestamp … Status). The ONLY place landlord contact data
 *      lives: Internal Private Notes (real numbers) + Landlord Contact
 *      (Scrubbed) (masked 100***1490 form).
 *
 *   2. "new_units"        — the 13-column A–M feed that workflow 05
 *      (unit-adder) already consumes: PENDING rows are inserted into
 *      Supabase `listings` (publish_status=REVIEW_REQUIRED — human audit
 *      stays in the loop) and marked ADDED. Same tab format the broker
 *      inbox used, so the existing cron ingests Telegram units with zero
 *      changes to unit-adder.
 *
 * All writes go through a bounded-retry wrapper: Sheets 5xx / network
 * blips must spool, not crash the poller.
 */

const { loadWorkflowEnv, createSheetsClient } = require('../lib/google-sheets');

loadWorkflowEnv(__dirname + '/..');

const INTAKE_HEADERS = [
  'Timestamp', 'Reference Code', 'Listing Type (Rent/Sale)', 'Agent Name',
  'Compound/Project', 'City/District', 'Unit Type', 'Area SQM', 'Bedrooms',
  'Bathrooms', 'Furnishing', 'Finishing', 'Price/Month', 'Payment Terms',
  'Deposit', 'Sanitized Description', 'Internal Private Notes',
  'Landlord Contact (Scrubbed)', 'Media Links', 'Status',
];

// Column order contract of workflows/05-unit-adder/add.js (A–L, optional M).
const NEW_UNITS_HEADERS = [
  'Compound', 'Bedrooms', 'Bathrooms', 'Area', 'Price', 'Finishing Type',
  'Furnishing', 'Property Type', 'Address', 'Lat', 'Lng', 'Status', 'Deal Type',
];

function log(...args) {
  console.log(new Date().toISOString(), '[telegram-intake]', ...args);
}

async function retry(fn, label, attempts = 3) {
  let lastErr = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const retriable = !e.code || !String(e.code).startsWith('4') || e.code === 429;
      if (i === attempts || !retriable) break;
      await new Promise((r) => setTimeout(r, 700 * 2 ** (i - 1)));
    }
  }
  log(`sheets ${label} failed after ${attempts} attempt(s): ${lastErr && lastErr.message}`);
  throw lastErr;
}

/** Resolve which spreadsheet id to use (user-facing name → repo convention). */
function resolveSpreadsheetId() {
  return (
    process.env.GOOGLE_SHEET_ID ||
    process.env.TELEGRAM_MASTER_SHEET_ID ||
    process.env.UNITS_SHEET_ID ||
    ''
  ).trim();
}

function intakeTab() {
  return process.env.TELEGRAM_INTAKE_TAB || 'Telegram Intake';
}

function newUnitsTab() {
  return process.env.TELEGRAM_INTAKE_NEW_UNITS_TAB || 'new_units';
}

/** Create a sheet client lazily (bot must start even without creds — the
 *  unconfigured state is reported honestly, units spool locally). */
function client() {
  // User-spec alias: GOOGLE_SERVICE_ACCOUNT_CREDENTIALS == inline JSON (or
  // base64), the same format lib/google-sheets.js already understands.
  if (process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  }
  const spreadsheetId = resolveSpreadsheetId();
  const sheets = createSheetsClient(['https://www.googleapis.com/auth/spreadsheets']);
  if (!sheets) return null;
  if (!spreadsheetId) return null;
  return { sheets, spreadsheetId };
}

function configured() {
  return Boolean(client());
}

/** Idempotently ensure both tabs exist and carry their header rows. */
async function ensureTabs() {
  const ctx = client();
  if (!ctx) return false;
  await retry(async () => {
    const meta = await ctx.sheets.spreadsheets.get({ spreadsheetId: ctx.spreadsheetId });
    const titles = new Set((meta.data.sheets || []).map((s) => s.properties.title));
    const missing = [intakeTab(), newUnitsTab()].filter((t) => !titles.has(t));
    if (missing.length) {
      await ctx.sheets.spreadsheets.batchUpdate({
        spreadsheetId: ctx.spreadsheetId,
        resource: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) },
      });
      log(`created tab(s): ${missing.join(', ')}`);
    }
  }, 'ensureTabs');

  for (const [tab, headers] of [[intakeTab(), INTAKE_HEADERS], [newUnitsTab(), NEW_UNITS_HEADERS]]) {
    await retry(async () => {
      const res = await ctx.sheets.spreadsheets.values.get({
        spreadsheetId: ctx.spreadsheetId,
        range: `'${tab}'!A1`,
      });
      const has = (res.data.values || []).length;
      if (!has) {
        await ctx.sheets.spreadsheets.values.update({
          spreadsheetId: ctx.spreadsheetId,
          range: `'${tab}'!A1`,
          valueInputOption: 'RAW',
          resource: { values: [headers] },
        });
      }
    }, `header:${tab}`);
  }
  return true;
}

/** Read the full intake tab (code reconciliation for the assigner). */
async function readIntakeRows() {
  const ctx = client();
  if (!ctx) return null;
  return retry(async () => {
    const res = await ctx.sheets.spreadsheets.values.get({
      spreadsheetId: ctx.spreadsheetId,
      range: `'${intakeTab()}'!A:T`,
    });
    return res.data.values || [];
  }, 'readIntakeRows');
}

/** Append one 20-column ledger row; returns the 1-based sheet row number. */
async function appendIntakeRow(row) {
  const ctx = client();
  if (!ctx) throw new Error('sheets client unconfigured');
  const res = await retry(async () => ctx.sheets.spreadsheets.values.append({
    spreadsheetId: ctx.spreadsheetId,
    range: `'${intakeTab()}'!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row] },
  }), 'appendIntakeRow');
  const range = String((res.data.updates || {}).updatedRange || '');
  const m = range.match(/![A-Z]+(\d+)/);
  const rowNumber = m ? parseInt(m[1], 10) : null;
  return rowNumber;
}

/** Append one 13-column new_units row (status PENDING) for unit-adder. */
async function appendNewUnitsRow(row12) {
  const ctx = client();
  if (!ctx) throw new Error('sheets client unconfigured');
  await retry(async () => ctx.sheets.spreadsheets.values.append({
    spreadsheetId: ctx.spreadsheetId,
    range: `'${newUnitsTab()}'!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row12] },
  }), 'appendNewUnitsRow');
  return true;
}

/** Update an existing ledger row in place (Mission 2 dedup re-list path).
 * Finds the row whose Reference Code (column B) matches, then updates the
 * Price (M), Timestamp (A) and Status (T) cells. Returns the row number or
 * null when the code is unknown (caller falls back to a fresh insert). */
async function updateIntakeRowByCode(code, { priceDisplay, status } = {}) {
  const ctx = client();
  if (!ctx) return null;
  const rows = await retry(async () => {
    const res = await ctx.sheets.spreadsheets.values.get({
      spreadsheetId: ctx.spreadsheetId,
      range: `'${intakeTab()}'!A:T`,
    });
    return res.data.values || [];
  }, 'readIntakeRows(update)');
  const rowNumber = rows.findIndex((r) => String((r || [])[1] || '').trim() === String(code).trim());
  if (rowNumber < 0) return null; // header is row 1 → data rows start at 2
  const sheetRow = rowNumber + 1;
  await retry(async () => ctx.sheets.spreadsheets.values.update({
    spreadsheetId: ctx.spreadsheetId,
    range: `'${intakeTab()}'!A${sheetRow}:T${sheetRow}`,
    valueInputOption: 'RAW',
    resource: {
      values: [[
        new Date().toISOString(), // A — refreshed timestamp
        code, // B unchanged
        rows[rowNumber][2] || '', // C unchanged
        rows[rowNumber][3] || '', // D unchanged
        rows[rowNumber][4] || '', // E unchanged
        rows[rowNumber][5] || '', // F unchanged
        rows[rowNumber][6] || '', // G unchanged
        rows[rowNumber][7] ?? '', // H unchanged
        rows[rowNumber][8] ?? '', // I unchanged
        rows[rowNumber][9] ?? '', // J unchanged
        rows[rowNumber][10] || '', // K unchanged
        rows[rowNumber][11] || '', // L unchanged
        priceDisplay || rows[rowNumber][12] || '—', // M — refreshed price
        rows[rowNumber][13] || '', // N unchanged
        rows[rowNumber][14] || '', // O unchanged
        rows[rowNumber][15] || '', // P unchanged
        rows[rowNumber][16] || '', // Q unchanged
        rows[rowNumber][17] || '', // R unchanged
        rows[rowNumber][18] || '', // S unchanged
        status || 'Relisted — price refreshed', // T — new status
      ]],
    },
  }), 'updateIntakeRowByCode');
  return sheetRow;
}

module.exports = {
  INTAKE_HEADERS,
  NEW_UNITS_HEADERS,
  configured,
  ensureTabs,
  readIntakeRows,
  appendIntakeRow,
  appendNewUnitsRow,
  updateIntakeRowByCode,
  resolveSpreadsheetId,
  intakeTab,
  newUnitsTab,
};
