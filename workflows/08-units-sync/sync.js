'use strict';
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch {}
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
 *   Unit Price     → parseUnitPrice(): explicit formats only — decimal-million
 *                    ('8.34M' → 8,340,000), thousands separators
 *                    ('8,500,000'), explicit currency labels ('EGP', '$',
 *                    'جنيه', …). Currency is NEVER assumed: unlabeled
 *                    prices land with price_currency NULL (the sheet is
 *                    demonstrably mixed-currency — it contains USD rents
 *                    like '1,400$' — so 'unlabeled = EGP' would fabricate
 *                    data). Unparseable/ambiguous values (empty, bare
 *                    decimals like '8.34' with no M suffix, ranges, text
 *                    like 'POA') are QUARANTINED: price stays 0 and the
 *                    full parse decision is recorded in raw_data._price_parse
 *                    for the human review queue. The raw source price text is
 *                    preserved verbatim (raw_data + _price_parse.raw).
 *   Type           → deal_type: rent/ejar → 'rent'; sale/bee' → 'sale'
 *   Property Tybe  → property_type (lowercase)
 *   bedrooms/Space → bedrooms / area_sqm
 *   Garden/Space   → garden_sqm / amenities
 *   Furnished or not → furnishing_status
 *   Availablty     → status: Available→available, Not available→off-market,
 *                    Sold→sold, No answer/Follow up/other→pending
 *                    (+ raw text into `availability`)
 *   Availability   → status only (never publishability — see Phase 6 note)
 *   Name/Mobile    → owner_name / owner_phone
 *   full row       → raw_data JSONB
 * Every synced row: sync_source='sheets-units',
 * source_channel='sheets' — mapped to the LIVE listings columns (garden_sqm,
 * furnishing_status, publish_status; the repo schema.sql names
 * garden_area/verified/publish_to_client do not exist on the live DB).
 *
 * Phase 6 no-fabrication rule (migration 026 era):
 *   sheet sync is DATA INGESTION ONLY — it never writes verified_at,
 *   verified_by or source_verified_at (human verification is the only
 *   source of those stamps), and it never promotes a row to PUBLISHABLE:
 *   inserts land as REVIEW_REQUIRED, updates never touch publish_status
 *   or provenance. The 8-condition verification gate (policy 020) is
 *   the sole path to PUBLISHABLE. Migration 20261007_026 repaired the
 *   rows the pre-fix workflow had stamped.
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
// gid 1127958606 = the owner inventory tab (docstring contract above). The old
// 341562911 default pointed at the BROKER INBOX tab (no Code/Mobile columns)
// so sync silently upserted nothing — fixed 2026-10-17.
const SHEET_GID = process.env.UNITS_SHEET_GID || '1127958606';
const SB_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const summary = {
  rows: 0, validUnits: 0, upserted: 0, skippedNoCode: 0, errors: 0,
  availability: {}, dealTypes: {},
  priceParsed: 0, priceNoCurrency: 0, priceQuarantined: 0,
};

function failUnconfigured(msg) {
  console.log(`UNCONFIGURED: ${msg}`);
  process.exit(2);
}

function assertConfigured() {
  if (!SB_URL || !SB_KEY) failUnconfigured('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
  if (!SHEET_ID) failUnconfigured('UNITS_SHEET_ID missing');
}

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

/* ── Price parsing (no-fabrication era, 2026-10-25) ──────────────────────
 *
 * parseUnitPrice(raw) returns an explicit decision object:
 *   { status: 'parsed'|'quarantined', price, currency, reason, raw }
 *
 * Supported amount formats (verified against the LIVE sheet, 324 rows):
 *   '8,340,000 EGP'   → 8340000  EGP      (explicit label)
 *   '8,500,000'       → 8500000  null     (separators, currency UNKNOWN)
 *   '28,000'          → 28000    null     (rent scale, currency UNKNOWN)
 *   '8.34M'           → 8340000  null     (decimal-million, matches the
 *                                         Code convention 'MT-B14-3U-8.34M')
 *   '8.34M EGP'       → 8340000  EGP
 *   '1,400$' / '700$' → 1400/700 USD       (real rows in the live sheet)
 *   '8.5K'            → 8500     null
 *   '1.250.000'       → 1250000  null     (dot-grouped separators)
 *   '٨٫٣٤ مليون جنيه' → 8340000  EGP      (Eastern Arabic digits + Arabic)
 *
 * QUARANTINE policy (ambiguous values never become fabricated prices):
 *   '' / whitespace            → empty
 *   no digits ('POA', 'negotiable', 'Price on request') → no_digits
 *   '8.34' (bare decimal, no M/K) → bare_decimal_ambiguous — the sheet's
 *         own Code convention means this COULD be millions, but asserting
 *         either scale would fabricate data → human review
 *   '8-9M' / '8M or 9M' (2+ candidate values) → multiple_values
 *   negative / zero result      → non_positive
 * Currency is only set from an EXPLICIT label — never assumed EGP.
 */
const CURRENCY_LABELS = [
  { code: 'EGP', re: /\b(?:egp|l\.?e\.?|e£)\b|ج\.?م|جنيه/i },
  { code: 'USD', re: /\b(?:usd|us\$|u\$)\b|\$|دولار/i },
  { code: 'EUR', re: /\b(?:eur|€)\b/i },
  { code: 'GBP', re: /\b(?:gbp|£)\b/i },
  { code: 'AED', re: /\baed\b|درهم/i },
  { code: 'SAR', re: /\bsar\b|ريال/i },
];

function parseUnitPrice(rawInput) {
  const raw = String(rawInput ?? '').trim();
  const out = (status, price, currency, reason) => ({
    status, price, currency, reason, raw,
  });
  if (!raw) return out('quarantined', 0, null, 'empty');

  // Normalize Eastern Arabic digits + Arabic decimal separator to ASCII.
  let s = raw
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/٫/g, '.')
    .replace(/،/g, ',');

  // Explicit currency label only — never inferred from the amount's scale.
  let currency = null;
  for (const { code, re } of CURRENCY_LABELS) {
    if (re.test(s)) { currency = code; break; }
  }

  // Multiplier suffixes (Latin + Arabic). NOTE: no \b around Arabic words —
  // JS \b is ASCII-word based and never matches around Arabic letters.
  let multiplier = 1;
  if (/مليون|مليونا|million/i.test(s)) multiplier = 1e6;
  else if (/مليار|billion/i.test(s)) multiplier = 1e9;
  else if (/الف|ألف|thousand/i.test(s)) multiplier = 1e3;

  // Strip everything except digits, dots, commas, minus; keep candidate values.
  const numeric = s.replace(/[^\d.,-]/g, '');
  if (!/\d/.test(numeric)) return out('quarantined', 0, currency, 'no_digits');

  // A range or a list ('8-9M', '8/9') carries multiple candidate values —
  // picking one would fabricate data. (A leading minus is NOT a range: it is
  // handled below as non_positive.)
  const candidates = numeric.split('-').filter((p) => /\d/.test(p));
  if (candidates.length > 1) return out('quarantined', 0, currency, 'multiple_values');
  // Word/slash-separated lists ('8M or 9M', '8 أو 9', '8/9', '8–9M') are
  // detected on the SOURCE text: the digit strip above would otherwise glue
  // the fragments into ONE fabricated number ('8M or 9M' → '89' → 89,000,000
  // — regression-locked in __tests__/units-sync-price-parsing.test.ts). A
  // marker with digits on only one side ('POA or 5M') is still ambiguous →
  // quarantined too. Over-quarantining is the safe direction: the human
  // review queue adjudicates; downstream fabrication is not reversible.
  if (/(?:\bor\b|\bto\b|أو|[/|~–—])/i.test(s)) {
    return out('quarantined', 0, currency, 'multiple_values');
  }
  let body = numeric;

  // ── Separator semantics ──────────────────────────────────────────────
  // Thousands separators are recognized ONLY in the canonical grouping
  // (first group 1–3 digits, every later group EXACTLY 3 digits):
  //   '8,500,000' / '1.250.000' / '28,000' / '1,400'
  // A separator followed by a non-3-digit group is a DECIMAL separator
  // (European '8,5M' or '8,34' → 8.5 / 8.34), never a thousands mark.
  const isGrouped = (groups) =>
    groups.length > 1 &&
    /^\d{1,3}$/.test(groups[0]) &&
    groups.slice(1).every((g) => /^\d{3}$/.test(g));
  const commaGroups = body.split(',');
  const dotGroups = body.split('.');
  if (isGrouped(commaGroups)) body = commaGroups.join('');
  else if (isGrouped(dotGroups) && dotGroups.length > 2) body = dotGroups.join('');
  else body = body.replace(/,/g, '.'); // decimal comma ('8,5M' → 8.5)

  // Trailing multiplier letter attached to the number ('8.34M', '8.5K').
  // Detected on the original string so it cannot re-introduce separators;
  // a word like 'million' never matches because [mkb] requires a word
  // boundary immediately after the letter.
  const mMatch = s.match(/\d\s*([mkb])\b/i);
  if (mMatch) {
    const letter = mMatch[1].toLowerCase();
    if (multiplier === 1) {
      if (letter === 'm') multiplier = 1e6;
      else if (letter === 'k') multiplier = 1e3;
      else if (letter === 'b') multiplier = 1e9;
    }
  }

  body = body.replace(/\.$/, '');
  if (!/^-?\d+(\.\d+)?$/.test(body)) {
    return out('quarantined', 0, currency, 'malformed_number');
  }
  const value = parseFloat(body);
  if (!Number.isFinite(value)) return out('quarantined', 0, currency, 'malformed_number');

  // Non-positive is classified BEFORE the bare-decimal check so a labeled
  // negative with separators ('-5,000 EGP' → body '-5.000') reports
  // non_positive — the reason drives the human-review queue label, and the
  // old order mislabeled it bare_decimal_ambiguous.
  if (value <= 0) return out('quarantined', 0, currency, 'non_positive');

  // Bare decimal with NO explicit multiplier ('8.34') — the sheet's Code
  // convention ('MT-B14-3U-8.34M') suggests millions, but the sheet also
  // carries integer-only prices, so asserting EITHER scale would fabricate
  // data. Quarantine for human review. (Decimal + M/K/million is fine.)
  if (multiplier === 1 && body.includes('.')) {
    return out('quarantined', 0, currency, 'bare_decimal_ambiguous');
  }

  const price = Math.round(value * multiplier * 100) / 100;
  if (price <= 0) return out('quarantined', 0, currency, 'non_positive');
  return out('parsed', price, currency, null);
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

  // Price: explicit-format parsing with quarantine (see parseUnitPrice).
  // Raw source text is ALWAYS preserved: verbatim in raw_data's sheet row
  // plus the parse decision envelope for the human review queue.
  const priceParse = parseUnitPrice(get('Unit Price', 'Unit price', 'Price'));
  if (priceParse.status === 'parsed') {
    summary.priceParsed = (summary.priceParsed || 0) + 1;
    if (!priceParse.currency) summary.priceNoCurrency = (summary.priceNoCurrency || 0) + 1;
  } else {
    summary.priceQuarantined = (summary.priceQuarantined || 0) + 1;
  }

  const listing = {
    code,
    dupe_check_hash: unitHash(code),
    title: `${propertyType || 'Unit'} — ${location || code}`,
    compound: location || 'غير محدد',
    location_area: location || null,
    property_type: propertyType ? propertyType.toLowerCase() : null,
    deal_type: dealType,
    price: priceParse.status === 'parsed' ? priceParse.price : 0,
    // Currency is ONLY set from an explicit label — an unlabeled price is
    // never assumed to be EGP (the sheet mixes EGP and USD rows).
    price_currency: priceParse.currency,
    bedrooms: digits(get('bedrooms', 'Bedrooms')),
    bathrooms: 0,
    area_sqm: digits(get('Space', 'space')),
    garden_sqm: digits(get('Garden', 'garden')),
    furnishing_status: get('Furnished or not', 'Furnished') || null,
    status: mapStatus(get('Availablty', 'Availability')),
    availability: get('Availablty', 'Availability') || null,
    sync_source: 'sheets-units',
    source_channel: 'sheets',
    owner_name: get('Name', 'name') || null,
    owner_phone: get('Mobile', 'mobile') || null,
    amenities: [],
    raw_data: { ...row, _price_parse: priceParse },
    updated_at: new Date().toISOString(),
  };
  // MERGED RULE (migration 026 + policy 020 + 025):
  //   • Provenance keys (verified_at / verified_by / source_verified_at) are
  //     NEVER written by this workflow — human provenance only (§21 + 026).
  //   • Fresh rows land as REVIEW_REQUIRED explicitly (025 dropped the column
  //     DEFAULT, so an omitted publish_status would be NULL/unclassified —
  //     sheet rows must enter the human review queue, never PUBLISHABLE).
  //   • PATCHes strip publish_status/verified_at/verified_by before sending
  //     (anti-overwrite: automated sync must never undo human verification
  //     decisions) — see syncChunk.
  listing.publish_status = 'REVIEW_REQUIRED';
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
    // ANTI-OVERWRITE (Task Follow-up): UPDATE path MUST NOT modify human-controlled
    // verification fields (publish_status, verified_at, verified_by). These fields
    // belong to human staff audits and must never be silently undone by automated syncs.
    const { publish_status, verified_at, verified_by, ...updatePayload } = l;
    delete updatePayload.code;
    delete updatePayload.dupe_check_hash;
    const p = await requestJson(
      `${SB_URL}/rest/v1/listings?id=eq.${id}`,
      { method: 'PATCH', headers: sbHeaders({ Prefer: 'return=minimal' }), body: updatePayload, timeoutMs: 20000 }
    );
    if (!p.ok) throw new Error(`update HTTP ${p.status}: ${JSON.stringify(p.data).slice(0, 200)}`);
    updated++;
  }
  if (fresh.length) {
    // Phase 6: fresh sheet rows land as REVIEW_REQUIRED — never PUBLISHABLE.
    const insertBody = fresh.map((l) => ({ ...l, publish_status: 'REVIEW_REQUIRED' }));
    const ins = await requestJson(
      `${SB_URL}/rest/v1/listings`,
      { method: 'POST', headers: sbHeaders({ Prefer: 'return=minimal' }), body: insertBody, timeoutMs: 20000 }
    );
    if (!ins.ok) throw new Error(`insert HTTP ${ins.status}: ${JSON.stringify(ins.data).slice(0, 200)}`);
    inserted = fresh.length;
  }
  return { inserted, updated };
}

async function main() {
  assertConfigured();
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

  // Honest exit semantics (execution order H4 — no false successful-sync
  // count when the downstream system rejected rows): ANY chunk error fails
  // the run; a partially-synced batch must not report success. (Previously
  // only errors>0 && upserted===0 exited 1, so partial failures exited 0
  // with a green runner label.)
  if (summary.errors > 0) {
    console.error(`units-sync FAILED: ${summary.errors} row(s) failed to sync (partial failure is not success)`);
    process.exit(1);
  }
  // A structurally empty sheet (wrong tab / missing Code column / zero
  // rows) must not be reported as a healthy empty sync either — the live
  // sheet contract is 324 rows (docstring). Genuine emptiness still
  // deserves human eyes, so it fails loudly instead of exiting green.
  if (summary.rows === 0 || summary.validUnits === 0) {
    console.error(`units-sync FAILED: sheet yielded ${summary.rows} rows / ${summary.validUnits} valid units — refusing to report an empty sync as success`);
    process.exit(1);
  }
  console.log('units-sync: done');
  process.exit(0);
}

/* Unit-testable surface: the runner spawns this file as a child process
 * (it never require()s it), so exporting the pure helpers is safe. */
module.exports = { rowToListing, mapStatus, detectDealType, unitHash, parseCsv, parseUnitPrice };

if (require.main === module) {
  main().catch((err) => {
    console.error(`units-sync FAILED: ${err.message}`);
    process.exit(1);
  });
}
