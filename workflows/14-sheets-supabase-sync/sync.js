'use strict';
/**
 * Workflow 14: Sheets ↔ Supabase Two-Way Responsive Sync (Mission 3).
 * ─────────────────────────────────────────────────────────────────────────────
 * Synchronizes Supabase PostgreSQL (public.listings) and the Master Google
 * Sheet using batched API calls with exponential backoff and the strict
 * Data Validation rules (workflows/lib/listing-validation.js).
 *
 * SHEET STRUCTURE
 *   Tab 1 "Master_Inventory" — the full historical & operational ledger:
 *     [Unit_Code | Date_Added | Last_Action_Timestamp | Deal_Type |
 *      Canonical_Compound | Unit_Type | Area_SQM | Bedrooms | Bathrooms |
 *      Floor | Furnishing | Finishing | Price_EGP | AI_Fair_Price_Benchmark |
 *      Is_Featured_Gem | Owner_Name_Internal | Owner_Mobile_Internal |
 *      Contact_Status | Listing_Status | Sourced_By_Agent |
 *      Verified_By_Employee | Media_Links | Notes]        (23 columns, A:W)
 *
 *   Tab 2 "Real_Available_Units" — live verified inventory view:
 *     ONLY rows where Listing_Status == 'Available' AND
 *     Contact_Status == 'Verified Available', stamped with
 *     Verified_Available_Date. A unit that goes 'Contacted - No Answer' /
 *     'Sold' / 'Rented' is REMOVED from Tab 2, updated in Tab 1, and
 *     UNPUBLISHED from external feeds (publish_to_client = FALSE +
 *     automation.isPublishedToPF = FALSE).
 *
 * UPSERT RULE
 *   If the unit already exists (matched by Unit_Code ↔ listings.code /
 *   unit_code / se_code, backstopped by owner-phone + compound + type +
 *   area dedup key), the row is UPDATED IN PLACE — Price,
 *   Last_Action_Timestamp, Contact_Status, Listing_Status — never
 *   duplicated.
 *
 * TWO-WAY POLICY (newer wins, per field group)
 *   Sheets → Supabase: Contact_Status, Listing_Status, Price, Notes,
 *                        Verified_By_Employee (staff edits in the sheet).
 *   Supabase → Sheets:  everything else (intake/portal writes), plus the
 *                        same operational fields when the DB row is newer.
 *
 * BULK RESET TRIGGER
 *   `node sync.js --reset-outreach` (= /reset_outreach_status): all
 *   unverified/stale units go back to Contact_Status = 'Not Contacted Yet'
 *   for fresh owner follow-up campaigns. Confirmed 'Sold' / 'Rented' units
 *   are KEPT archived (never resurrected).
 *
 * Env: GOOGLE_SHEET_ID | TELEGRAM_MASTER_SHEET_ID | UNITS_SHEET_ID,
 *      GOOGLE_SERVICE_ACCOUNT_JSON/_KEY, SUPABASE_URL,
 *      SUPABASE_SERVICE_ROLE_KEY, SYNC_BATCH_SIZE (50),
 *      MASTER_INVENTORY_TAB (Master_Inventory), REAL_AVAILABLE_TAB
 *      (Real_Available_Units), WF_DRY_RUN
 * Exit: 0 ok · 2 unconfigured · 1 error
 */

const path = require('path');
const { loadWorkflowEnv, createSheetsClient } = require('../lib/google-sheets');

loadWorkflowEnv(path.join(__dirname, '..'));

const validation = require('../lib/listing-validation');
const { dedupKey } = require('../lib/dedup-index');

const DRY_RUN = !/^(0|false|no)$/i.test(process.env.WF_DRY_RUN || '0');
const BATCH_SIZE = parseInt(process.env.SYNC_BATCH_SIZE || '50', 10);
const MASTER_TAB = process.env.MASTER_INVENTORY_TAB || 'Master_Inventory';
const REAL_TAB = process.env.REAL_AVAILABLE_TAB || 'Real_Available_Units';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const summary = {
  dbRows: 0, sheetRows: 0, sheetToDb: 0, dbToSheet: 0,
  realAvailable: 0, unpublished: 0, reset: 0, errors: 0,
};

function log(...args) {
  console.log(new Date().toISOString(), '[sheets-supabase-sync]', ...args);
}

// ── exponential backoff for every API call ─────────────────────────────────
async function withBackoff(fn, label, attempts = 5) {
  let lastErr = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const retriable = !e.status || e.status >= 500 || e.status === 429;
      if (i === attempts || !retriable) break;
      const waitMs = Math.min(30000, 500 * 2 ** (i - 1)) * (1 + Math.random() * 0.3);
      log(`${label} attempt ${i} failed (${e.message}) — backing off ${Math.round(waitMs / 1000)}s`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

// ── sheet client ───────────────────────────────────────────────────────────
function sheetCtx() {
  const spreadsheetId = (process.env.GOOGLE_SHEET_ID
    || process.env.TELEGRAM_MASTER_SHEET_ID
    || process.env.UNITS_SHEET_ID || '').trim();
  const sheets = createSheetsClient(['https://www.googleapis.com/auth/spreadsheets']);
  if (!sheets || !spreadsheetId) return null;
  return { sheets, spreadsheetId };
}

const MASTER_HEADERS = [
  'Unit_Code', 'Date_Added', 'Last_Action_Timestamp', 'Deal_Type',
  'Canonical_Compound', 'Unit_Type', 'Area_SQM', 'Bedrooms', 'Bathrooms',
  'Floor', 'Furnishing', 'Finishing', 'Price_EGP', 'AI_Fair_Price_Benchmark',
  'Is_Featured_Gem', 'Owner_Name_Internal', 'Owner_Mobile_Internal',
  'Contact_Status', 'Listing_Status', 'Sourced_By_Agent',
  'Verified_By_Employee', 'Media_Links', 'Notes',
];

const REAL_HEADERS = [...MASTER_HEADERS.slice(0, 3), 'Verified_Available_Date', ...MASTER_HEADERS.slice(3)];

async function ensureTabs(ctx) {
  await withBackoff(async () => {
    const meta = await ctx.sheets.spreadsheets.get({ spreadsheetId: ctx.spreadsheetId });
    const titles = new Set((meta.data.sheets || []).map((s) => s.properties.title));
    const missing = [MASTER_TAB, REAL_TAB].filter((t) => !titles.has(t));
    if (missing.length) {
      await ctx.sheets.spreadsheets.batchUpdate({
        spreadsheetId: ctx.spreadsheetId,
        resource: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) },
      });
      log(`created tab(s): ${missing.join(', ')}`);
    }
  }, 'ensureTabs');
  for (const [tab, headers] of [[MASTER_TAB, MASTER_HEADERS], [REAL_TAB, REAL_HEADERS]]) {
    await withBackoff(async () => {
      const res = await ctx.sheets.spreadsheets.values.get({
        spreadsheetId: ctx.spreadsheetId, range: `'${tab}'!A1`,
      });
      if (!(res.data.values || []).length) {
        await ctx.sheets.spreadsheets.values.update({
          spreadsheetId: ctx.spreadsheetId, range: `'${tab}'!A1`,
          valueInputOption: 'RAW', resource: { values: [headers] },
        });
      }
    }, `header:${tab}`);
  }
}

async function readTab(ctx, tab) {
  const cols = tab === MASTER_TAB ? 'A:W' : 'A:X';
  return withBackoff(async () => {
    const res = await ctx.sheets.spreadsheets.values.get({
      spreadsheetId: ctx.spreadsheetId, range: `'${tab}'!${cols}`,
    });
    return res.data.values || [];
  }, `read:${tab}`);
}

/** Batched multi-row write (values.update per range slice — Sheets API has
 *  no cross-range batch append, so we chunk rows into range writes). */
async function writeRows(ctx, tab, startRow, rows) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const range = `'${tab}'!A${startRow + i}:${String.fromCharCode(64 + chunk[0].length)}${startRow + i + chunk.length - 1}`;
    await withBackoff(() => ctx.sheets.spreadsheets.values.update({
      spreadsheetId: ctx.spreadsheetId, range,
      valueInputOption: 'RAW', resource: { values: chunk },
    }), `write:${tab}`);
  }
}

// ── supabase client ────────────────────────────────────────────────────────
let sb = null;
function supabase() {
  if (sb) return sb;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const { createClient } = require('@supabase/supabase-js');
  sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return sb;
}

async function loadDbListings() {
  const client = supabase();
  if (!client) return [];
  const selectCols = [
    'id', 'code', 'unit_code', 'se_code', 'created_at', 'updated_at',
    'deal_type', 'compound', 'property_type', 'area_sqm', 'bedrooms', 'bathroom_count',
    'floor_number', 'furnishing_status', 'finishing_type', 'price',
    'ai_fair_price', 'is_featured_gem', 'owner_name', 'owner_phone',
    'contact_status', 'listing_status', 'availability', 'status',
    'publish_to_client', 'automation', 'images', 'photo_count',
    'agent', 'verified_by_employee', 'verified_available_date',
  ].join(',');
  // bathroom_count may not exist on older schemas — probe and fall back.
  const rows = [];
  let page = 0;
  for (;;) {
    const from = page * 1000;
    let { data, error } = await client.from('listings').select(selectCols).range(from, from + 999);
    if (error && /bathroom_count/.test(error.message)) {
      const fallbackCols = selectCols.replace('bathroom_count', 'bathrooms');
      ({ data, error } = await client.from('listings').select(fallbackCols).range(from, from + 999));
    }
    if (error) throw new Error(`listings read: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
    page++;
    if (page > 20) break; // 20k rows safety cap
  }
  return rows;
}

// ── mapping helpers ────────────────────────────────────────────────────────
function dbRowToSheetRow(r) {
  const v = validation;
  const gate = v.enforceDealTypePriceGate(r.deal_type, Number(r.price));
  const phone = r.owner_phone ? String(r.owner_phone) : '';
  return {
    Unit_Code: (r.code || r.unit_code || r.se_code || '').trim(),
    Date_Added: r.created_at || '',
    Last_Action_Timestamp: r.updated_at || r.created_at || '',
    Deal_Type: gate.dealType,
    Canonical_Compound: v.resolveCanonicalCompound(r.compound),
    Unit_Type: v.coerceDropdown('Unit_Type', r.property_type) || 'Apartment',
    Area_SQM: r.area_sqm ?? 'NULL',
    Bedrooms: r.bedrooms ?? 'NULL',
    Bathrooms: (r.bathroom_count ?? r.bathrooms) ?? 'NULL',
    Floor: r.floor_number ?? 'NULL',
    Furnishing: v.coerceDropdown('Furnishing', r.furnishing_status) || 'NULL',
    Finishing: v.coerceDropdown('Finishing', r.finishing_type) || 'NULL',
    Price_EGP: Number(r.price) > 0 ? Number(r.price) : 'NULL',
    AI_Fair_Price_Benchmark: Number(r.ai_fair_price) > 0 ? Number(r.ai_fair_price) : 'NULL',
    Is_Featured_Gem: r.is_featured_gem ? 'TRUE' : 'FALSE',
    Owner_Name_Internal: r.owner_name || 'NULL',
    Owner_Mobile_Internal: phone || 'NULL',
    Contact_Status: v.coerceDropdown('Contact_Status', r.contact_status) || 'Not Contacted Yet',
    Listing_Status: v.coerceDropdown('Listing_Status', r.listing_status) || 'Pending Verification',
    Sourced_By_Agent: r.agent || 'NULL',
    Verified_By_Employee: r.verified_by_employee || 'NULL',
    Media_Links: Array.isArray(r.images) && r.images.length ? r.images.slice(0, 10).join(' , ') : 'NULL',
    Notes: 'NULL',
    __dbId: r.id,
    __publishToClient: !!r.publish_to_client,
    __automation: r.automation || {},
    __updatedAt: Date.parse(r.updated_at || r.created_at || 0) || 0,
    __availability: r.availability || '',
    __status: r.status || '',
  };
}

function sheetRowToRecord(headerRow, row) {
  const rec = {};
  headerRow.forEach((h, i) => { rec[String(h).trim()] = row[i] === undefined || row[i] === '' ? undefined : row[i]; });
  return rec;
}

const CODE_KEYS = ['Unit_Code'];
function codeOf(rec) {
  return String(rec.Unit_Code || '').trim();
}

/** Row equality for the Real tab rebuild. */
function realAvailableRow(mapped, verifiedDate) {
  return [
    mapped.Unit_Code, mapped.Date_Added, mapped.Last_Action_Timestamp, verifiedDate || '',
    mapped.Deal_Type, mapped.Canonical_Compound, mapped.Unit_Type, mapped.Area_SQM,
    mapped.Bedrooms, mapped.Bathrooms, mapped.Floor, mapped.Furnishing, mapped.Finishing,
    mapped.Price_EGP, mapped.AI_Fair_Price_Benchmark, mapped.Is_Featured_Gem,
    // Tab 2 is team-facing: mask the internal mobile (100***1490 form).
    mapped.Owner_Name_Internal, maskPhone(mapped.Owner_Mobile_Internal),
    mapped.Contact_Status, mapped.Listing_Status, mapped.Sourced_By_Agent,
    mapped.Verified_By_Employee, mapped.Media_Links, mapped.Notes,
  ];
}

function maskPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '').slice(-10);
  if (d.length !== 10) return 'NULL';
  return `${d.slice(0, 3)}***${d.slice(-4)}`;
}

// ── the sync ───────────────────────────────────────────────────────────────
async function main() {
  const ctx = sheetCtx();
  const client = supabase();
  if (!ctx) {
    console.log('UNCONFIGURED: Google Sheets credentials/sheet id missing');
    process.exit(2);
  }
  if (!client) {
    console.log('UNCONFIGURED: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
    process.exit(2);
  }

  // ── BULK RESET MODE (/reset_outreach_status) ────────────────────────────
  if (process.argv.includes('--reset-outreach')) {
    await resetOutreachStatus(ctx, client);
    console.log(`SUMMARY ${JSON.stringify(summary)}`);
    process.exit(0);
  }

  log(`sync start${DRY_RUN ? ' (DRY-RUN)' : ''} — master=${MASTER_TAB} real=${REAL_TAB} batch=${BATCH_SIZE}`);
  await ensureTabs(ctx);

  // 1. Load both sides.
  const [dbRows, sheetRaw] = await Promise.all([
    withBackoff(loadDbListings, 'db-load'),
    readTab(ctx, MASTER_TAB),
  ]);
  summary.dbRows = dbRows.length;
  const header = sheetRaw[0] || MASTER_HEADERS;
  const sheetRecs = sheetRaw.slice(1).map((r) => sheetRowToRecord(header, r));
  summary.sheetRows = sheetRecs.length;

  const dbMapped = dbRows.map(dbRowToSheetRow);
  const dbByCode = new Map();
  const dbByDedup = new Map();
  for (const m of dbMapped) {
    if (codeOf(m)) dbByCode.set(codeOf(m), m);
    const dk = dedupKey({
      ownerPhone: m.Owner_Mobile_Internal === 'NULL' ? null : m.Owner_Mobile_Internal,
      compound: m.Canonical_Compound, unitType: m.Unit_Type, areaSqm: m.Area_SQM === 'NULL' ? null : m.Area_SQM,
    });
    if (!dbByDedup.has(dk)) dbByDedup.set(dk, m);
  }

  // 2. Sheets → Supabase: operational fields where the sheet row is newer.
  const dbUpdates = [];
  for (const rec of sheetRecs) {
    const code = codeOf(rec);
    if (!code) continue;
    const match = dbByCode.get(code) || dbByDedup.get(dedupKey({
      ownerPhone: rec.Owner_Mobile_Internal === 'NULL' ? null : rec.Owner_Mobile_Internal,
      compound: rec.Canonical_Compound, unitType: rec.Unit_Type, areaSqm: rec.Area_SQM === 'NULL' ? null : rec.Area_SQM,
    }));
    if (!match) continue;
    const sheetTs = Date.parse(rec.Last_Action_Timestamp || 0) || 0;
    if (sheetTs <= match.__updatedAt) continue; // DB newer — DB → Sheets instead
    const patch = {};
    if (rec.Contact_Status && rec.Contact_Status !== match.Contact_Status) patch.contact_status = validation.coerceDropdown('Contact_Status', rec.Contact_Status) || rec.Contact_Status;
    if (rec.Listing_Status && rec.Listing_Status !== match.Listing_Status) patch.listing_status = validation.coerceDropdown('Listing_Status', rec.Listing_Status) || rec.Listing_Status;
    const sheetPrice = Number(String(rec.Price_EGP ?? '').replace(/[^\d.]/g, ''));
    if (Number.isFinite(sheetPrice) && sheetPrice > 0 && sheetPrice !== Number(match.Price_EGP)) patch.price = sheetPrice;
    if (rec.Verified_By_Employee && rec.Verified_By_Employee !== match.Verified_By_Employee) patch.verified_by_employee = rec.Verified_By_Employee;
    if (rec.Notes && rec.Notes !== 'NULL' && rec.Notes !== match.Notes) patch.raw_notes = rec.Notes;
    if (!Object.keys(patch).length) continue;
    patch.updated_at = new Date().toISOString();
    // Verified Available promotion stamps the date (Mission 3 Tab 2 rule).
    if (patch.contact_status === 'Verified Available' && patch.listing_status === 'Available') {
      patch.verified_available_date = new Date().toISOString();
    }
    dbUpdates.push({ id: match.__dbId, patch });
  }

  // Batched DB writes with backoff.
  for (let i = 0; i < dbUpdates.length; i += BATCH_SIZE) {
    const chunk = dbUpdates.slice(i, i + BATCH_SIZE);
    if (DRY_RUN) { summary.sheetToDb += chunk.length; continue; }
    try {
      await withBackoff(async () => {
        for (const u of chunk) {
          await client.from('listings').update(u.patch).eq('id', u.id);
        }
      }, `db-update:${i}`);
      summary.sheetToDb += chunk.length;
    } catch (e) {
      summary.errors++;
      log(`db update chunk ${i} failed: ${e.message}`);
    }
  }

  // 3. Supabase → Sheets: full ledger rewrite (DB is the merge master for
  //    non-operational fields; the upsert-in-place rule means one row per
  //    code, preserving sheet row order where possible).
  const merged = new Map(); // code → mapped (sheet-first order, DB content)
  for (const rec of sheetRecs) {
    const code = codeOf(rec);
    if (!code) continue;
    const dbMatch = dbByCode.get(code);
    merged.set(code, dbMatch ? mergePreferNewer(dbMatch, rec) : dbRowFromSheetRecord(rec));
  }
  for (const m of dbMapped) {
    const code = codeOf(m);
    if (code && !merged.has(code)) merged.set(code, m);
  }
  const masterRows = [...merged.values()].map(masterRowArray);

  if (!DRY_RUN) {
    // Clear the data area then write (header stays).
    await withBackoff(() => ctx.sheets.spreadsheets.values.clear({
      spreadsheetId: ctx.spreadsheetId, range: `'${MASTER_TAB}'!A2:W100000`,
    }), 'clear:master');
    if (masterRows.length) await writeRows(ctx, MASTER_TAB, 2, masterRows);
    summary.dbToSheet = masterRows.length;
  } else {
    summary.dbToSheet = masterRows.length;
  }

  // 4. Real_Available_Units rebuild + external feed unpublish.
  const realRows = [];
  const unpublishIds = [];
  for (const m of merged.values()) {
    const isReal = m.Listing_Status === 'Available' && m.Contact_Status === 'Verified Available';
    if (isReal) {
      realRows.push(realAvailableRow(m, m.__verifiedAvailableDate || ''));
      continue;
    }
    // Removal rule: was live, now dead → unpublish from external feeds.
    const deadStatuses = ['Sold', 'Rented', 'Unavailable', 'Archived'];
    const deadContact = ['Sold', 'Rented', 'Not Available', 'Contacted - No Answer'];
    if ((deadStatuses.includes(m.Listing_Status) || deadContact.includes(m.Contact_Status)) && m.__publishToClient) {
      unpublishIds.push(m.__dbId);
    }
  }
  summary.realAvailable = realRows.length;

  if (!DRY_RUN) {
    await withBackoff(() => ctx.sheets.spreadsheets.values.clear({
      spreadsheetId: ctx.spreadsheetId, range: `'${REAL_TAB}'!A2:X100000`,
    }), 'clear:real');
    if (realRows.length) await writeRows(ctx, REAL_TAB, 2, realRows);

    for (let i = 0; i < unpublishIds.length; i += BATCH_SIZE) {
      const chunk = unpublishIds.slice(i, i + BATCH_SIZE);
      try {
        await withBackoff(async () => {
          for (const id of chunk) {
            await client.from('listings').update({
              publish_to_client: false,
              automation: { isPublishedToPF: false, unpublishedAt: new Date().toISOString() },
              updated_at: new Date().toISOString(),
            }).eq('id', id);
          }
        }, `unpublish:${i}`);
        summary.unpublished += chunk.length;
      } catch (e) { summary.errors++; log(`unpublish chunk ${i} failed: ${e.message}`); }
    }
  } else {
    summary.unpublished = unpublishIds.length;
  }

  log(`sync done: ${JSON.stringify(summary)}`);
  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  process.exit(summary.errors > 0 ? 1 : 0);
}

/** DB row wins for facts; sheet wins for operational fields when newer. */
function mergePreferNewer(dbMapped, sheetRec) {
  const sheetTs = Date.parse(sheetRec.Last_Action_Timestamp || 0) || 0;
  const merged = { ...dbMapped };
  if (sheetTs > dbMapped.__updatedAt) {
    if (sheetRec.Contact_Status) merged.Contact_Status = validation.coerceDropdown('Contact_Status', sheetRec.Contact_Status) || sheetRec.Contact_Status;
    if (sheetRec.Listing_Status) merged.Listing_Status = validation.coerceDropdown('Listing_Status', sheetRec.Listing_Status) || sheetRec.Listing_Status;
    const sheetPrice = Number(String(sheetRec.Price_EGP ?? '').replace(/[^\d.]/g, ''));
    if (Number.isFinite(sheetPrice) && sheetPrice > 0) merged.Price_EGP = sheetPrice;
  }
  return merged;
}

/** Sheet-only rows (no DB twin yet) keep their sheet shape. */
function dbRowFromSheetRecord(rec) {
  const v = validation;
  return {
    Unit_Code: codeOf(rec) || 'NULL',
    Date_Added: rec.Date_Added || '',
    Last_Action_Timestamp: rec.Last_Action_Timestamp || rec.Date_Added || '',
    Deal_Type: v.coerceDropdown('Deal_Type', rec.Deal_Type) || 'Sale',
    Canonical_Compound: v.resolveCanonicalCompound(rec.Canonical_Compound),
    Unit_Type: v.coerceDropdown('Unit_Type', rec.Unit_Type) || 'Apartment',
    Area_SQM: rec.Area_SQM ?? 'NULL',
    Bedrooms: rec.Bedrooms ?? 'NULL',
    Bathrooms: rec.Bathrooms ?? 'NULL',
    Floor: rec.Floor ?? 'NULL',
    Furnishing: v.coerceDropdown('Furnishing', rec.Furnishing) || 'NULL',
    Finishing: v.coerceDropdown('Finishing', rec.Finishing) || 'NULL',
    Price_EGP: rec.Price_EGP ?? 'NULL',
    AI_Fair_Price_Benchmark: rec.AI_Fair_Price_Benchmark ?? 'NULL',
    Is_Featured_Gem: /^true$/i.test(String(rec.Is_Featured_Gem || '')) ? 'TRUE' : 'FALSE',
    Owner_Name_Internal: rec.Owner_Name_Internal || 'NULL',
    Owner_Mobile_Internal: rec.Owner_Mobile_Internal || 'NULL',
    Contact_Status: v.coerceDropdown('Contact_Status', rec.Contact_Status) || 'Not Contacted Yet',
    Listing_Status: v.coerceDropdown('Listing_Status', rec.Listing_Status) || 'Pending Verification',
    Sourced_By_Agent: rec.Sourced_By_Agent || 'NULL',
    Verified_By_Employee: rec.Verified_By_Employee || 'NULL',
    Media_Links: rec.Media_Links || 'NULL',
    Notes: rec.Notes || 'NULL',
    __dbId: null,
    __publishToClient: false,
    __verifiedAvailableDate: rec.Verified_Available_Date || '',
  };
}

function masterRowArray(m) {
  return [
    m.Unit_Code, m.Date_Added, m.Last_Action_Timestamp, m.Deal_Type,
    m.Canonical_Compound, m.Unit_Type, m.Area_SQM, m.Bedrooms, m.Bathrooms,
    m.Floor, m.Furnishing, m.Finishing, m.Price_EGP, m.AI_Fair_Price_Benchmark,
    m.Is_Featured_Gem, m.Owner_Name_Internal, m.Owner_Mobile_Internal,
    m.Contact_Status, m.Listing_Status, m.Sourced_By_Agent,
    m.Verified_By_Employee, m.Media_Links, m.Notes,
  ];
}

/** /reset_outreach_status — fresh follow-up campaigns. Confirmed Sold/Rented
 *  rows are KEPT archived (never resurrected into 'Not Contacted Yet'). */
async function resetOutreachStatus(ctx, client) {
  log(`bulk reset: Contact_Status → 'Not Contacted Yet' (stale/unverified only)${DRY_RUN ? ' (DRY-RUN)' : ''}`);

  // DB side.
  const { data: dbReset, error } = await client.from('listings')
    .update({ contact_status: 'Not Contacted Yet', updated_at: new Date().toISOString() })
    .not('contact_status', 'in', '("Verified Available","Sold","Rented","Not Available")')
    .select('id');
  if (error) { summary.errors++; log(`db reset failed: ${error.message}`); }
  else summary.reset += (dbReset || []).length;

  // Sheet side (Master_Inventory).
  const rows = await readTab(ctx, MASTER_TAB);
  const header = rows[0] || MASTER_HEADERS;
  const out = [header];
  const contactIdx = header.findIndex((h) => String(h).trim() === 'Contact_Status');
  const listingIdx = header.findIndex((h) => String(h).trim() === 'Listing_Status');
  const tsIdx = header.findIndex((h) => String(h).trim() === 'Last_Action_Timestamp');
  let sheetResets = 0;
  for (const row of rows.slice(1)) {
    const r = [...row];
    while (r.length < header.length) r.push('');
    const contact = String(r[contactIdx] || '').trim();
    const listing = String(r[listingIdx] || '').trim();
    const keep = ['Verified Available', 'Sold', 'Rented', 'Not Available'];
    if (!keep.includes(contact) && !['Sold', 'Rented'].includes(listing)) {
      r[contactIdx] = 'Not Contacted Yet';
      r[tsIdx] = new Date().toISOString();
      sheetResets++;
    }
    out.push(r);
  }
  if (!DRY_RUN) {
    await withBackoff(() => ctx.sheets.spreadsheets.values.clear({
      spreadsheetId: ctx.spreadsheetId, range: `'${MASTER_TAB}'!A2:W100000`,
    }), 'reset:clear');
    if (out.length > 1) await writeRows(ctx, MASTER_TAB, 2, out.slice(1));
  }
  summary.reset += sheetResets;
  log(`reset done: ${JSON.stringify(summary)}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(`sheets-supabase-sync FAILED: ${e.message}`);
    process.exit(1);
  });
}

module.exports = {
  MASTER_HEADERS,
  REAL_HEADERS,
  dbRowToSheetRow,
  sheetRowToRecord,
  mergePreferNewer,
  masterRowArray,
  realAvailableRow,
  maskPhone,
  resetOutreachStatus,
};
