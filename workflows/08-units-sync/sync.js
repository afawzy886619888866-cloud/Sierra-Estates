'use strict';
/**
 * Workflow 08: Units Sync — real Sierra Estates inventory sheet → Supabase
 * ────────────────────────────────────────────────────────────────────────
 * Reads the owner's authoritative Google Sheets inventory tab (public gviz
 * CSV export — no service account needed for read) and UPSERTS every unit
 * into Supabase `public.listings`, keyed by a deterministic dedup hash of
 * the unit Code (the sheet's own SBR-style codes, e.g. MT-B14-3U-8.34M).
 *
 * Sheet contract (tab gid=1127958606, verified 2026-10-04, 324 rows):
 *   Timestamp, NO, تاريخ اخر تحديث, Name, Mobile, Availablty, bedrooms,
 *   Location, Unit Price, Furnished or not, Type, Property Tybe, Code,
 *   Owner, Garden, Space, Pool, Comment
 *
 * Mapping → listings:
 *   Code           → code + dupe_check_hash = sha256('sierra-units|'+Code)
 *   Location       → compound (+ location_area)
 *   Unit Price     → price (digits only; EGP)
 *   Type           → deal_type: rent/ejar → 'rent'; sale/bee' → 'sale'
 *   Property Tybe  → property_type (lowercase)
 *   bedrooms/Space → bedrooms / area_sqm
 *   Garden/Space   → garden_sqm / amenities
 *   Furnished or not → furnishing_status
 *   Availablty     → status: Available→available, Not available→off-market,
 *                    Sold→sold, No answer/Follow up/other→pending
 *                    (+ raw text into `availability`)
 *   Availability   → publish_status: available→PUBLISHABLE, else REVIEW_REQUIRED
 *   Name/Mobile    → owner_name / owner_phone
 *   full row       → raw_data JSONB
 * Every synced row: verified_at=now(), sync_source='sheets-units',
 * source_channel='sheets' — mapped to the LIVE listings columns (garden_sqm,
 * furnishing_status, verified_at, publish_status; the repo schema.sql names
 * garden_area/verified/publish_to_client do not exist on the live DB).
 *
 * No-fabrication rule respected: unknown facts stay null/0 — city, zone,
 * description are never invented.
 *
 * Env: UNITS_SHEET_ID, UNITS_SHEET_GID (defaults = the owner's sheet),
 *      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (already in workflows.env)
 * Exit: 0 ok · 2 unconfigured · 1 error
 */
const crypto = require('crypto');
const { requestJson } = require('../lib/gateway-client'); // Supabase REST calls

const SHEET_ID = process.env.UNITS_SHEET_ID || '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';
const SHEET_GID = process.env.UNITS_SHEET_GID || '1127958606';
const SB_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const summary = {
  rows: 0, validUnits: 0, upserted: 0, skippedNoCode: 0, errors: 0,
  availability: {}, dealTypes: {},
};

function failUnconfigured(msg) {
  console.log(`UNCONFIGURED: ${msg}`);
  process.exit(2);
}

if (!SB_URL || !SB_KEY) failUnconfigured('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
if (!SHEET_ID) failUnconfigured('UNITS_SHEET_ID missing');

function sbHeaders(extra = {}) {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/* ── CSV parser: quoted fields, embedded commas/newlines, "" escapes ── */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else if (c === '\r') {
      /* skip */
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

function digits(s) {
  const m = String(s ?? '').replace(/[^\d]/g, '');
  return m ? parseInt(m, 10) : 0;
}

function detectDealType(rawType) {
  const t = String(rawType || '').toLowerCase();
  if (!t) return null;
  if (t.includes('rent') || t.includes('ايجار') || t.includes('إيجار')) return 'rent';
  if (t.includes('sale') || t.includes('بيع')) return 'sale';
  return null;
}

function mapStatus(rawAvail) {
  const a = String(rawAvail || '').trim().toLowerCase();
  summary.availability[a || '(empty)'] = (summary.availability[a || '(empty)'] || 0) + 1;
  if (a === 'available') return 'available';
  if (a === 'not available' || a === 'sold') return a === 'sold' ? 'sold' : 'off-market';
  return 'pending'; // No answer, Follow up, empty, misaligned values
}

function unitHash(code) {
  return crypto.createHash('sha256').update(`sierra-units|${code}`).digest('hex');
}

function rowToListing(row) {
  const get = (...names) => {
    for (const n of names) {
      const v = row[n];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  };
  const code = get('Code', 'code');
  if (!code) return null;

  const location = get('Location', 'Location ');
  const propertyType = get('Property Tybe', 'Property Type', 'property_type') || '';
  const dealType = detectDealType(get('Type', 'type'));
  summary.dealTypes[dealType || 'unknown'] = (summary.dealTypes[dealType || 'unknown'] || 0) + 1;

  const listing = {
    code,
    dupe_check_hash: unitHash(code),
    title: `${propertyType || 'Unit'} — ${location || code}`,
    compound: location || 'غير محدد',
    location_area: location || null,
    property_type: propertyType ? propertyType.toLowerCase() : null,
    deal_type: dealType,
    price: digits(get('Unit Price', 'Unit price', 'Price')),
    price_currency: 'EGP',
    bedrooms: digits(get('bedrooms', 'Bedrooms')),
    bathrooms: 0,
    area_sqm: digits(get('Space', 'space')),
    garden_sqm: digits(get('Garden', 'garden')),
    furnishing_status: get('Furnished or not', 'Furnished') || null,
    status: mapStatus(get('Availablty', 'Availability')),
    availability: get('Availablty', 'Availability') || null,
    verified_at: new Date().toISOString(),
    sync_source: 'sheets-units',
    source_channel: 'sheets',
    owner_name: get('Name', 'name') || null,
    owner_phone: get('Mobile', 'mobile') || null,
    amenities: [],
    raw_data: row,
    updated_at: new Date().toISOString(),
  };
  listing.publish_status = listing.status === 'available' ? 'PUBLISHABLE' : 'REVIEW_REQUIRED';
  if (listing.garden_sqm > 0) listing.amenities.push('garden');
  if (get('Pool', 'pool')) listing.amenities.push('pool');
  return listing;
}

async function fetchSheetRows() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;
  // gviz returns text/csv — use global fetch (node ≥18, same as workflow 02);
  // lib requestJson force-parses JSON and would truncate the CSV.
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`sheet fetch HTTP ${res.status}`);
  const csv = await res.text();
  if (!csv || csv.length < 20) throw new Error('sheet fetch returned empty CSV');
  const parsed = parseCsv(csv);
  if (!parsed.length) return { headers: [], rows: [] };
  const headers = parsed[0].map((h) => String(h).trim());
  const rows = parsed.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
    return obj;
  });
  return { headers, rows };
}

async function syncChunk(listings) {
  // Live DB has no unique constraint on dupe_check_hash usable by ON CONFLICT
  // (migration 013's partial index is not applied there) — so: probe existing
  // hashes, PATCH updates, INSERT fresh rows. In-batch dedup keeps last row.
  const byHashInBatch = new Map();
  for (const l of listings) byHashInBatch.set(l.dupe_check_hash, l); // last wins
  const unique = [...byHashInBatch.values()];

  const hashes = unique.map((l) => `"${l.dupe_check_hash}"`).join(',');
  const probe = await requestJson(
    `${SB_URL}/rest/v1/listings?select=id,dupe_check_hash&dupe_check_hash=in.(${encodeURIComponent(hashes)})`,
    { headers: sbHeaders(), timeoutMs: 20000 }
  );
  if (!probe.ok) throw new Error(`existing read HTTP ${probe.status}: ${JSON.stringify(probe.data).slice(0, 200)}`);
  const existingId = new Map((probe.data || []).map((r) => [r.dupe_check_hash, r.id]));

  let inserted = 0;
  let updated = 0;
  const fresh = [];
  for (const l of unique) {
    const id = existingId.get(l.dupe_check_hash);
    if (!id) { fresh.push(l); continue; }
    const p = await requestJson(
      `${SB_URL}/rest/v1/listings?id=eq.${id}`,
      { method: 'PATCH', headers: sbHeaders({ Prefer: 'return=minimal' }), body: l, timeoutMs: 20000 }
    );
    if (!p.ok) throw new Error(`update HTTP ${p.status}: ${JSON.stringify(p.data).slice(0, 200)}`);
    updated++;
  }
  if (fresh.length) {
    const ins = await requestJson(
      `${SB_URL}/rest/v1/listings`,
      { method: 'POST', headers: sbHeaders({ Prefer: 'return=minimal' }), body: fresh, timeoutMs: 20000 }
    );
    if (!ins.ok) throw new Error(`insert HTTP ${ins.status}: ${JSON.stringify(ins.data).slice(0, 200)}`);
    inserted = fresh.length;
  }
  return { inserted, updated };
}

async function main() {
  console.log(`units-sync: starting → sheet ${SHEET_ID} gid ${SHEET_GID}`);

  const { headers, rows } = await fetchSheetRows();
  summary.rows = rows.length;
  console.log(`units-sync: fetched ${rows.length} rows (${headers.length} cols)`);

  const listings = [];
  for (const row of rows) {
    const l = rowToListing(row);
    if (!l) { summary.skippedNoCode++; continue; }
    listings.push(l);
  }
  summary.validUnits = listings.length;
  console.log(`units-sync: ${listings.length} valid units (${summary.skippedNoCode} rows without Code skipped)`);

  const CHUNK = 100;
  for (let i = 0; i < listings.length; i += CHUNK) {
    const chunk = listings.slice(i, i + CHUNK);
    try {
      const { inserted, updated } = await syncChunk(chunk);
      summary.inserted = (summary.inserted || 0) + inserted;
      summary.updated = (summary.updated || 0) + updated;
      summary.upserted = summary.inserted + summary.updated;
    } catch (err) {
      summary.errors += chunk.length;
      console.error(`units-sync: chunk ${Math.floor(i / CHUNK)} failed: ${err.message}`);
      if (err.httpStatus === 401 || err.httpStatus === 403) break; // key problem — stop
    }
  }

  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  if (summary.errors > 0 && summary.upserted === 0) {
    console.error('units-sync FAILED: no rows synced');
    process.exit(1);
  }
  console.log('units-sync: done');
  process.exit(0);
}

main().catch((err) => {
  console.error(`units-sync FAILED: ${err.message}`);
  process.exit(1);
});
