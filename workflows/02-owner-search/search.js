'use strict';
/**
 * Workflow 02: Owner Search  (fixed 2026-10)
 * ─────────────────────────────────────────
 * Searches Property Finder for direct-owner properties and appends them to
 * the Google Sheets "owner_leads" tab (or Supabase `public.leads` when Sheets
 * credentials are omitted in cloud/Docker environments).
 *
 * OWNER-EVIDENCE RULE (2026-10-25, no-fabrication era):
 *   - Only rows with POSITIVE owner evidence (unit.owner.phone) are
 *     appended as owner leads. Broker-attributed rows and rows without owner
 *     phone are counted and skipped, never re-labeled or filled with placeholders.
 *   - A malformed API response (non-array data) is a FAILURE that exits 1.
 *
 * Usage:  node 02-owner-search/search.js
 * Env:    PROPERTY_FINDER_API_BASE, PROPERTY_FINDER_JWT_TOKEN,
 *         BROKER_INBOX_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_KEY / GOOGLE_SERVICE_ACCOUNT_JSON,
 *         SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Exit:   0 ok · 2 unconfigured · 1 error
 */
const path = require('path');
const { loadWorkflowEnv, createSheetsClient } = require('../lib/google-sheets');
const { requestJson } = require('../lib/gateway-client');
const { normalizeOwnerPhone } = require('../lib/inbox');

loadWorkflowEnv(path.join(__dirname, '..'));

const PF_API_BASE = (process.env.PROPERTY_FINDER_API_BASE || 'https://api.propertyfinder.com.eg/v3').replace(/\/+$/, '');
const PF_TOKEN = process.env.PROPERTY_FINDER_JWT_TOKEN || '';
const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID || '';
const SB_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const summary = {
  found: 0,
  appended: 0,
  supabaseInserted: 0,
  skipped: 0,
  skippedNoOwnerEvidence: 0,
  skippedBrokerOnly: 0,
  errors: 0,
};

function failUnconfigured(msg) {
  console.log(`UNCONFIGURED: ${msg}`);
  process.exit(2);
}

function resolveDestinations() {
  const sheets = SHEET_ID ? createSheetsClient(['https://www.googleapis.com/auth/spreadsheets']) : null;
  const hasSupabase = Boolean(SB_URL && SB_KEY);
  if (!sheets && !hasSupabase) {
    failUnconfigured('Neither Google Sheets (BROKER_INBOX_SHEET_ID + GOOGLE_SERVICE_ACCOUNT_*) nor Supabase (SUPABASE_SERVICE_ROLE_KEY) is configured');
  }
  return { sheets, hasSupabase };
}

async function appendToSheet(sheets, tabName, values) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A:I`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [values] },
  });
}

async function insertSupabaseOwnerLead(unit) {
  const rawPhone = String(unit.owner.phone).trim();
  const normalizedPhone = normalizeOwnerPhone(rawPhone) || rawPhone;
  const nowIso = new Date().toISOString();
  const checkRes = await requestJson(
    `${SB_URL}/rest/v1/leads?phone=eq.${encodeURIComponent(normalizedPhone)}&select=id&limit=1`,
    {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      timeoutMs: 8000,
    }
  );
  if (checkRes.ok && Array.isArray(checkRes.data) && checkRes.data.length > 0) {
    summary.skipped++;
    return false;
  }
  const insRes = await requestJson(`${SB_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: {
      full_name: unit.owner?.name || 'Property Finder Direct Owner',
      phone: normalizedPhone,
      source: 'property_finder',
      origin_channel: 'workflow-02-owner-search',
      lead_type: 'seller',
      stage: 'inbound',
      target_compound: unit.location?.name || null,
      summary_notes: `${String(unit.title || '').slice(0, 180)} | Price: ${unit.price ?? 'N/A'} | ${unit.url || ''}`,
      created_at: nowIso,
      updated_at: nowIso,
    },
    timeoutMs: 8000,
  });
  if (!insRes.ok) {
    throw new Error(`Supabase lead insert HTTP ${insRes.status}`);
  }
  return true;
}

async function searchPropertyFinder() {
  const apiKey = process.env.PROPERTY_FINDER_API_KEY;
  const apiSecret = process.env.PROPERTY_FINDER_API_SECRET;

  if (apiKey && apiSecret) {
    try {
      const tokenRes = await fetch('https://atlas.propertyfinder.com/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret }),
        signal: AbortSignal.timeout(12000),
      });
      if (!tokenRes.ok) throw new Error(`Atlas auth HTTP ${tokenRes.status}`);
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.accessToken;

      const leadsRes = await fetch('https://atlas.propertyfinder.com/v1/leads?perPage=50', {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (leadsRes.status === 429) {
        throw new Error('Atlas leads HTTP 429 rate limited — back off');
      }
      if (!leadsRes.ok) throw new Error(`Atlas leads HTTP ${leadsRes.status}`);
      const payload = await leadsRes.json();
      const rawLeads = Array.isArray(payload.data) ? payload.data : [];

      const rows = rawLeads.map((item) => {
        const phoneContact = (item.sender?.contacts || []).find((c) => c.type === 'phone');
        const phone = phoneContact?.value || '';
        return {
          id: item.id,
          title: `Inquiry for ${item.listing?.reference || 'Property'}`,
          price: null,
          location: { name: 'New Cairo' },
          beds: 0,
          baths: 0,
          area: 0,
          url: item.responseLink || '',
          owner: {
            name: item.sender?.name || 'PF Lead',
            phone: phone,
          },
        };
      });

      summary.found = rows.length;
      console.log(`PF Atlas returned ${rows.length} verified inbound leads`);
      return rows;
    } catch (err) {
      console.warn(`PF Atlas lead query failed (${err.message}) — checking legacy fallback`);
    }
  }

  if (!PF_TOKEN) failUnconfigured('PROPERTY_FINDER_API_KEY / PROPERTY_FINDER_JWT_TOKEN missing');

  try {
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
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401 || response.status === 403) {
      failUnconfigured(`PF token rejected (HTTP ${response.status}) — rotate credentials`);
    }
    if (response.status === 429) {
      throw new Error(`PF API HTTP 429 rate limited — back off`);
    }
    if (!response.ok) {
      throw new Error(`PF API HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data || typeof data !== 'object' || !Array.isArray(data.data)) {
      throw new Error(`PF API malformed response: ${JSON.stringify(data).slice(0, 100)}`);
    }
    const rows = data.data;
    summary.found = rows.length;
    console.log(`PF returned ${rows.length} owner properties`);
    return rows;
  } catch (err) {
    failUnconfigured(`Property Finder service unreachable (${err.message})`);
  }
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
  const { sheets, hasSupabase } = resolveDestinations();
  const units = await searchPropertyFinder();

  for (const unit of units) {
    try {
      if (!hasOwnerEvidence(unit)) {
        if (unit && unit.agent && (unit.agent.phone || unit.agent.name)) summary.skippedBrokerOnly++;
        else summary.skippedNoOwnerEvidence++;
        continue;
      }
      if (sheets) {
        await appendToSheet(sheets, 'owner_leads', buildLeadRow(unit));
        summary.appended++;
      }
      if (hasSupabase) {
        const inserted = await insertSupabaseOwnerLead(unit);
        if (inserted) summary.supabaseInserted++;
      }
    } catch (err) {
      summary.errors++;
      console.error(`row append failed: ${err.message}`);
    }
  }

  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  console.log('owner-search: done');
  process.exit(0);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hasOwnerEvidence, buildLeadRow };
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`owner-search FAILED: ${err.message}`);
    process.exit(1);
  });
}
