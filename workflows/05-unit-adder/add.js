'use strict';
/**
 * Workflow 05: Unit Adder — Supabase authoritative  (fixed 2026-10)
 * ─────────────────────────────────────────
 * Reads new units from the Sheets "new_units" tab, deduplicates via a
 * SHA-256 sync hash, and inserts listings into Supabase `public.listings`
 * using the live database column schema (defaulting `publish_status` to
 * `REVIEW_REQUIRED` for human audit).
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      BROKER_INBOX_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_KEY / GOOGLE_SERVICE_ACCOUNT_JSON
 * Exit: 0 ok · 2 unconfigured · 1 error
 */
const crypto = require('crypto');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { loadWorkflowEnv, createSheetsClient } = require('../lib/google-sheets');

loadWorkflowEnv(path.join(__dirname, '..'));

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const summary = { pending: 0, added: 0, deduplicated: 0, errors: 0 };

function failUnconfigured(msg) {
  console.log(`UNCONFIGURED: ${msg}`);
  process.exit(2);
}

if (!SUPABASE_KEY) failUnconfigured('SUPABASE_SERVICE_ROLE_KEY missing');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sheets = createSheetsClient(['https://www.googleapis.com/auth/spreadsheets']);

// Generate SBR code from property attributes
function generateSBRCode(compound, bedrooms, furnishing, price) {
  const compoundAbbr = (compound || 'PRP').substring(0, 3).toUpperCase();
  const furnishCode = furnishing === 'furnished' ? 'F' : 'U';
  const priceAbbr = `${Math.floor((Number(price) || 0) / 1000)}K`;
  return `${compoundAbbr}-${bedrooms}${furnishCode}-${priceAbbr}`;
}

// Dedup identity: canonical compound + area + price + bedrooms + unit type
// + deal type (sheet-real fields). 2026-11-01: widened from
// compound|area|price|bedrooms so rent-vs-sale twins and type variants no
// longer collide, and canonicalized via the shared gazetteer so "cfc" and
// "Cairo Festival City" hash to the same identity.
const { resolveCanonicalCompound } = require('../lib/compound-canonical');
function computeSyncHash(compound, area, price, bedrooms, propertyType, dealType) {
  const key = [
    resolveCanonicalCompound(compound),
    area,
    price,
    bedrooms,
    String(propertyType || 'apartment').toLowerCase(),
    String(dealType || 'sale').toLowerCase(),
  ].join('|');
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function getPendingUnits() {
  if (!sheets || !SHEET_ID) {
    console.warn('Sheets not configured — treating as 0 pending units');
    return [];
  }
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      // M (Deal Type) is an optional 13th column written by the Telegram
      // intake (2026-11-01); A:L rows without it keep the historical
      // default. Never widen beyond M — column N+ is reserved.
      range: "'new_units'!A:M",
    });
    const rows = response.data.values || [];
    return rows
      .slice(1)
      .map((row, idx) => ({ row, sheetRow: idx + 2 }))
      .filter(({ row }) => String(row[11] || '').trim().toUpperCase() === 'PENDING');
  } catch (err) {
    console.error(`pending-units read failed: ${err.message}`);
    return [];
  }
}

async function checkDuplicate(syncHash) {
  const { data, error } = await supabase
    .from('listings')
    .select('id')
    .eq('dupe_check_hash', syncHash)
    .limit(1);
  if (error) {
    console.error(`dedup check error: ${error.message}`);
    return false;
  }
  return Boolean(data && data.length > 0);
}

async function addUnitToSupabase(unit, syncHash) {
  const price = parseFloat(unit.price) || 0;
  const areaSqm = parseInt(unit.area, 10) || 0;
  const bedrooms = parseInt(unit.bedrooms, 10) || 0;
  const bathrooms = parseInt(unit.bathrooms, 10) || 0;
  const sbrCode = generateSBRCode(unit.compound, bedrooms, unit.furnishing, price);
  const nowIso = new Date().toISOString();

  // Deal type: column M when the intake wrote it, else honest inference —
  // a <=400k EGP price in this market is a monthly RENT (the 400k ceiling
  // guard mirrors the Apps Script price-logic rule); >=1M EGP is a resale.
  // Between 400k and 1M the sheet silence is ambiguous → 'sale' keeps the
  // historical default and REVIEW_REQUIRED keeps a human in the loop.
  const dealType = String(unit.dealType || '').trim().toLowerCase() || (
    price > 0 && price <= 400000 ? 'rent' : 'sale'
  );

  const record = {
    code: sbrCode,
    dupe_check_hash: syncHash,
    title: `${bedrooms}BR ${unit.compound || 'New Cairo Unit'}`,
    compound: unit.compound || 'غير محدد',
    location_area: unit.address || unit.compound || null,
    property_type: unit.propertyType ? String(unit.propertyType).toLowerCase() : 'apartment',
    deal_type: dealType,
    price,
    bedrooms,
    bathrooms,
    area_sqm: areaSqm,
    furnishing_status: unit.furnishing || null,
    status: 'available',
    publish_status: 'REVIEW_REQUIRED',
    sync_source: 'unit-adder',
    source_channel: 'sheets_new_units',
    raw_data: {
      finishingType: unit.finishingType || null,
      address: unit.address || null,
      lat: unit.lat ? parseFloat(unit.lat) : null,
      lng: unit.lng ? parseFloat(unit.lng) : null,
    },
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await supabase.from('listings').insert(record).select('id').single();
  if (error) throw error;
  return data.id;
}

async function updateUnitStatus(sheetRow, status) {
  if (!sheets || !SHEET_ID) return;
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'new_units'!L${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[status]] },
    });
  } catch (err) {
    console.error(`status write failed row ${sheetRow}: ${err.message}`);
  }
}

async function main() {
  console.log(`unit-adder: starting → ${SUPABASE_URL}`);

  const pendingUnits = await getPendingUnits();
  summary.pending = pendingUnits.length;
  console.log(`pending units: ${pendingUnits.length}`);

  for (const { row, sheetRow } of pendingUnits) {
    const unit = {
      compound: row[0],
      bedrooms: row[1],
      bathrooms: row[2],
      area: row[3],
      price: row[4],
      finishingType: row[5],
      furnishing: row[6],
      propertyType: row[7],
      address: row[8],
      lat: row[9],
      lng: row[10],
      dealType: row[12], // optional column M (Telegram intake, 2026-11-01)
    };

    try {
      const syncHash = computeSyncHash(unit.compound, unit.area, unit.price, unit.bedrooms, unit.propertyType, unit.dealType);

      if (await checkDuplicate(syncHash)) {
        await updateUnitStatus(sheetRow, 'DUPLICATE');
        summary.deduplicated++;
        console.log(`duplicate skipped: ${unit.compound} ${unit.area}m²`);
        continue;
      }

      const insertedId = await addUnitToSupabase(unit, syncHash);
      if (insertedId) {
        await updateUnitStatus(sheetRow, 'ADDED');
        summary.added++;
        console.log(`added: ${unit.compound} (id ${insertedId})`);
      } else {
        await updateUnitStatus(sheetRow, 'ERROR');
        summary.errors++;
      }
    } catch (err) {
      await updateUnitStatus(sheetRow, 'ERROR');
      summary.errors++;
      console.error(`row ${sheetRow} failed: ${err.message}`);
    }
  }

  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  console.log('unit-adder: done');
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`unit-adder FAILED: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { generateSBRCode, computeSyncHash, addUnitToSupabase, checkDuplicate };
