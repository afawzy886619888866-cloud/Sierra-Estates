try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch {}
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
 * OWNER-EVIDENCE RULE (2026-10-25, no-fabrication era):
 *   - Only rows with POSITIVE owner evidence (unit.owner.phone) are
 *     appended as owner leads. The previous `unit.owner?.phone ||
 *     unit.agent?.phone || 'No contact'` fallback put BROKER phone numbers
 *     into the owner_leads sheet — workflow 03 would then text a broker
 *     as if they were an owner — and appended empty 'No contact' rows.
 *     Both paths are gone: broker-attributed rows and rows with no owner
 *     contact are counted and skipped, never re-labeled.
 *   - A malformed API response (non-array data) is a FAILURE that exits 1 —
 *     it must never masquerade as a successful empty search.
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

const summary = { found: 0, appended: 0, skipped: 0, skippedNoOwnerEvidence: 0, skippedBrokerOnly: 0, errors: 0 };

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
  if (response.status === 429) {
    // Rate limit from the source — respect it and fail loudly (never an
    // "empty search"). The runner labels this run :error so operators see it.
    throw new Error('PF API rate limited (HTTP 429) — back off before retrying');
  }
  if (!response.ok) {
    throw new Error(`PF API HTTP ${response.status}`);
  }

  const data = await response.json();
  // Malformed shape = FAILURE. The old coercion to [] reported a healthy
  // empty search for a broken payload (anti-fabrication: an extraction
  // failure is never a successful empty result).
  if (!data || typeof data !== 'object' || !Array.isArray(data.data)) {
    throw new Error(`PF API malformed response (data is not an array): ${JSON.stringify(data).slice(0, 200)}`);
  }
  const rows = data.data;
  summary.found = rows.length;
  console.log(`PF returned ${rows.length} owner properties`);
  return rows;
}

/** Positive owner evidence only — see OWNER-EVIDENCE RULE above. */
function hasOwnerEvidence(unit) {
  return Boolean(unit && unit.owner && typeof unit.owner.phone === 'string' && unit.owner.phone.trim());
}

/** Build the owner_leads sheet row for an evidence-backed owner lead. */
function buildLeadRow(unit) {
  return [
    new Date().toISOString(),
    'property_finder',
    String(unit.title || '').slice(0, 200),
    unit.price ?? '',
    unit.location?.name || '',
    `${unit.beds || 0} BR, ${unit.baths || 0} BA, ${unit.area || '?'} sqm`,
    String(unit.owner.phone).trim(), // OWNER phone only — never the agent's
    unit.url || '',
    'PENDING', // col I — status consumed by workflow 03
  ];
}

async function main() {
  console.log('owner-search: starting');
  const sheets = sheetsClient();
  const units = await searchPropertyFinder();

  for (const unit of units) {
    try {
      // OWNER-EVIDENCE GATE: broker-attributed rows and rows with no owner
      // contact are counted and skipped — a missing owner phone is NEVER
      // filled with the agent's phone or a 'No contact' placeholder.
      if (!hasOwnerEvidence(unit)) {
        if (unit && unit.agent && (unit.agent.phone || unit.agent.name)) summary.skippedBrokerOnly++;
        else summary.skippedNoOwnerEvidence++;
        continue;
      }
      await appendToSheet(sheets, 'owner_leads', buildLeadRow(unit));
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

/* Unit-testable surface (spawned as a child process by the runner — pure
 * helpers only, safe to export; main() only runs when invoked directly). */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hasOwnerEvidence, buildLeadRow };
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`owner-search FAILED: ${err.message}`);
    process.exit(1);
  });
}
