/**
 * Workflow 05: Unit Adder — Supabase authoritative  (fixed 2026-10)
 * ─────────────────────────────────────────
 * Reads new units from the Sheets "new_units" tab, deduplicates via a
 * SHA-256 sync hash, and inserts listings into Supabase with generated
 * SBR codes.
 *
 * FIXES over the previous revision:
 *   - Column mapping was corrupted: `ownerContact: row[11]` read the STATUS
 *     column, and the dedup hash mixed in `row[5]` (finishing) as "floor"
 *     and `row[1]` (bedrooms) as "unit number" — neither exists in the
 *     sheet. Sheet contract (README): Compound, BR, BA, Area, Price,
 *     Finishing, Furnishing, Type, Address, Lat, Lng, Status (A..L).
 *     Hash is now compound|area|price|bedrooms — the practical identity of
 *     a unit in this sheet.
 *   - @supabase/supabase-js + dotenv moved into production dependencies
 *     (previously missing / dev-only → crash on a fresh install).
 *   - Unconfigured Supabase exits 2; unconfigured Sheets degrades to
 *     "0 pending" (already the case) with a visible log line.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      BROKER_INBOX_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_KEY
 * Exit: 0 ok · 2 unconfigured · 1 error
 */
const { google } = require('googleapis');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment (repo root .env.local then .env)
const ROOT = path.resolve(__dirname, '../..');
[path.resolve(ROOT, '.env.local'), path.resolve(ROOT, '.env')].forEach((envPath) => {
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false });
});

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

let sheets = null;
if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && fs.existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)) {
  const serviceAccountKey = JSON.parse(fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'utf8'));
  sheets = google.sheets({
    version: 'v4',
    auth: new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }),
  });
}

// Generate SBR code from property attributes
function generateSBRCode(compound, bedrooms, furnishing, price) {
  const compoundAbbr = (compound || 'PRP').substring(0, 3).toUpperCase();
  const furnishCode = furnishing === 'furnished' ? 'F' : 'U';
  const priceAbbr = `${Math.floor(price / 1000)}K`;
  return `${compoundAbbr}-${bedrooms}${furnishCode}-${priceAbbr}`;
}

// Dedup identity: compound + area + price + bedrooms (sheet-real fields).
function computeSyncHash(compound, area, price, bedrooms) {
  const key = `${compound}|${area}|${price}|${bedrooms}`;
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
      range: "'new_units'!A:L",
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
    return false; // fail-open to insert path, which reports its own error
  }
  return Boolean(data && data.length > 0);
}

async function addUnitToSupabase(unit, syncHash) {
  const sbrCode = generateSBRCode(unit.compound, unit.bedrooms, unit.furnishing, unit.price);
  const price = parseFloat(unit.price) || 0;
  const area = parseInt(unit.area) || 0;
  const pricePerSqm = area > 0 ? Math.round(price / area) : 0;

  const record = {
    title: `${unit.bedrooms}BR ${unit.compound}`,
    title_ar: unit.titleAr || '',
    code: sbrCode,
    property_type: unit.propertyType?.toLowerCase() || 'apartment',
    bedrooms: parseInt(unit.bedrooms) || 0,
    bathrooms: parseInt(unit.bathrooms) || 0,
    area,
    finishing: unit.finishingType || 'not-finished',
    price,
    price_per_sqm: pricePerSqm,
    compound: unit.compound,
    location: unit.address || unit.compound,
    lat: parseFloat(unit.lat) || 30.0,
    lng: parseFloat(unit.lng) || 31.0,
    dupe_check_hash: syncHash,
    status: 'available',
    owner_type: 'broker',
    source: 'sheets_sync',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
    };

    try {
      const syncHash = computeSyncHash(unit.compound, unit.area, unit.price, unit.bedrooms);

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
