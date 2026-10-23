/**
 * Workflow 02: Owner Search  (fixed 2026-10)
 * ─────────────────────────────────────────
 * Searches Property Finder for direct-owner properties and appends them to
 * the Google Sheets "owner_leads" tab.
 *
 * FIXES over the previous revision:
 *   - `fetch()` never supported the `qs` option (that is request/axios
 *     syntax) — every run silently queried the unfiltered endpoint. The URL
 *     is now built with URLSearchParams.
 *   - Missing PROPERTY_FINDER_JWT_TOKEN now exits with code 2 ("unconfigured")
 *     instead of throwing a raw 401 stack — the runner records it as
 *     unconfigured, not failed.
 *   - Response shape guards + per-row try/catch so one bad listing can't
 *     abort the whole batch.
 *   - Writes status col I ('PENDING') which workflow 03 consumes.
 *
 * Usage:  node 02-owner-search/search.js
 * Env:    PROPERTY_FINDER_API_BASE, PROPERTY_FINDER_JWT_TOKEN,
 *         BROKER_INBOX_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_KEY
 * Exit:   0 ok · 2 unconfigured · 1 error
 */
const { google } = require('googleapis');
const fs = require('fs');

const PF_API_BASE = (process.env.PROPERTY_FINDER_API_BASE || 'https://api.propertyfinder.com.eg/v3').replace(/\/+$/, '');
const PF_TOKEN = process.env.PROPERTY_FINDER_JWT_TOKEN || '';
const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID || '';
const SA_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';

const summary = { found: 0, appended: 0, skipped: 0, errors: 0 };

function failUnconfigured(msg) {
  console.log(`UNCONFIGURED: ${msg}`);
  process.exit(2);
}

function sheetsClient() {
  if (!SHEET_ID) failUnconfigured('BROKER_INBOX_SHEET_ID missing');
  if (!SA_PATH || !fs.existsSync(SA_PATH)) failUnconfigured('GOOGLE_SERVICE_ACCOUNT_KEY missing or file not found');
  const creds = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
  return google.sheets({
    version: 'v4',
    auth: new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }),
  });
}

async function appendToSheet(sheets, tabName, values) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A:I`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [values] },
  });
}

async function searchPropertyFinder() {
  if (!PF_TOKEN) failUnconfigured('PROPERTY_FINDER_JWT_TOKEN missing');

  const params = new URLSearchParams({
    category_id: '1',
    location_id: process.env.PF_LOCATION_ID || 'cairo-new-cairo',
    purpose: 'sale',
    owner_only: 'true',
    sort_by: 'date',
    limit: process.env.PF_LIMIT || '50',
  });

  const response = await fetch(`${PF_API_BASE}/properties?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${PF_TOKEN}`,
      Accept: 'application/json',
    },
  });

  if (response.status === 401 || response.status === 403) {
    failUnconfigured(`PF token rejected (HTTP ${response.status}) — rotate PROPERTY_FINDER_JWT_TOKEN`);
  }
  if (!response.ok) {
    throw new Error(`PF API HTTP ${response.status}`);
  }

  const data = await response.json();
  const rows = Array.isArray(data?.data) ? data.data : [];
  summary.found = rows.length;
  console.log(`PF returned ${rows.length} owner properties`);
  return rows;
}

async function main() {
  console.log('owner-search: starting');
  const sheets = sheetsClient();
  const units = await searchPropertyFinder();

  for (const unit of units) {
    try {
      const contact = unit.owner?.phone || unit.agent?.phone || 'No contact';
      await appendToSheet(sheets, 'owner_leads', [
        new Date().toISOString(),
        'property_finder',
        String(unit.title || '').slice(0, 200),
        unit.price ?? '',
        unit.location?.name || '',
        `${unit.beds || 0} BR, ${unit.baths || 0} BA, ${unit.area || '?'} sqm`,
        contact,
        unit.url || '',
        'PENDING', // col I — status consumed by workflow 03
      ]);
      summary.appended++;
    } catch (err) {
      summary.errors++;
      console.error(`row append failed: ${err.message}`);
    }
  }

  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  console.log('owner-search: done');
  process.exit(0);
}

main().catch((err) => {
  console.error(`owner-search FAILED: ${err.message}`);
  process.exit(1);
});
