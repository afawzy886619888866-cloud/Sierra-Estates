/**
 * Workflow 05: Unit Adder (Supabase Authoritative)
 * ─────────────────────────────────────────
 * Reads new units from Google Sheets
 * Normalizes and deduplicates
 * Writes to Supabase "listings" table
 * Syncs with SBR code generation
 *
 * Usage:
 *   node workflows/05-unit-adder/add.js
 *   OR: cron job every 30 minutes
 *
 * Env vars required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY
 */

const { google } = require('googleapis');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment
const ROOT = path.resolve(__dirname, '../..');
[
  path.resolve(ROOT, '.env.local'),
  path.resolve(ROOT, '.env'),
].forEach((envPath) => {
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false });
});

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://REDACTED-PROJECT.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let sheets = null;
if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && fs.existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)) {
  const serviceAccountKey = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'utf8')
  );
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

// Compute SHA256 hash for deduplication
function computeSyncHash(compound, area, floor, unitNumber) {
  const key = `${compound}|${area}|${floor}|${unitNumber}`;
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function getPendingUnits() {
  if (!sheets || !SHEET_ID) {
    console.warn('⚠️ Google Sheets not configured or sheet ID missing. Skipping sheet fetch.');
    return [];
  }
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'new_units'!A:L",
    });

    const rows = response.data.values || [];
    return rows.slice(1).filter(row => row[11] === 'PENDING');
  } catch (err) {
    console.error('❌ Failed to read pending units:', err.message);
    return [];
  }
}

async function checkDuplicate(syncHash) {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('id')
      .eq('dupe_check_hash', syncHash)
      .limit(1);

    if (error) {
      console.error('❌ Dedup check error:', error.message);
      return false;
    }
    return Boolean(data && data.length > 0);
  } catch (err) {
    console.error('❌ Dedup check failed:', err.message);
    return false;
  }
}

async function addUnitToSupabase(unit, syncHash) {
  try {
    const sbrCode = generateSBRCode(
      unit.compound,
      unit.bedrooms,
      unit.furnishing,
      unit.price
    );

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

    const { data, error } = await supabase
      .from('listings')
      .insert(record)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Unit added to Supabase: ${sbrCode} (id: ${data.id})`);
    return data.id;
  } catch (err) {
    console.error('❌ Supabase insert failed:', err.message);
    return null;
  }
}

async function updateUnitStatus(rowIndex, status) {
  if (!sheets || !SHEET_ID) return;
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'new_units'!L${rowIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[status]],
      },
    });
  } catch (err) {
    console.error('❌ Failed to update status:', err.message);
  }
}

async function main() {
  console.log('🏢 Starting unit adder workflow (Supabase)...');
  console.log(`📡 Supabase Endpoint: ${SUPABASE_URL}`);

  const pendingUnits = await getPendingUnits();
  console.log(`📊 Found ${pendingUnits.length} pending units`);

  let added = 0;
  let deduplicated = 0;

  for (let i = 0; i < pendingUnits.length; i++) {
    const row = pendingUnits[i];
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
      ownerContact: row[11] || '',
    };

    const syncHash = computeSyncHash(
      unit.compound,
      unit.area,
      row[5], // floor level
      row[1]  // unit number
    );

    const isDuplicate = await checkDuplicate(syncHash);

    if (isDuplicate) {
      console.log(`⚠️ Skipping duplicate: ${unit.compound} ${unit.area}m²`);
      await updateUnitStatus(i, 'DUPLICATE');
      deduplicated++;
      continue;
    }

    const insertedId = await addUnitToSupabase(unit, syncHash);

    if (insertedId) {
      await updateUnitStatus(i, 'ADDED');
      added++;
    } else {
      await updateUnitStatus(i, 'ERROR');
    }
  }

  console.log('═══════════════════════════════════════');
  console.log(`✅ Workflow complete: ${added} added, ${deduplicated} duplicates`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateSBRCode,
  computeSyncHash,
  addUnitToSupabase,
  checkDuplicate,
};
