/**
 * Workflow 05: Unit Adder
 * ─────────────────────────────────────────
 * Reads new units from Google Sheets
 * Normalizes and deduplicates
 * Writes to Firestore "listings" collection
 * Syncs with SBR code generation
 *
 * Usage:
 *   node workflows/05-unit-adder/add.js
 *   OR: cron job every 30 minutes
 *
 * Env vars required:
 *   - FIREBASE_PROJECT_ID
 *   - FIREBASE_PRIVATE_KEY
 *   - FIREBASE_CLIENT_EMAIL
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY
 */

const { google } = require('googleapis');
const admin = require('firebase-admin');
const crypto = require('crypto');
const fs = require('fs');

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
const SERVICE_ACCOUNT_KEY = JSON.parse(
  fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'utf8')
);

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(SERVICE_ACCOUNT_KEY),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

// Generate SBR code from property attributes
function generateSBRCode(compound, bedrooms, furnishing, price) {
  const compoundAbbr = compound.substring(0, 3).toUpperCase();
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
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'new_units'!A:L",
    });

    const rows = response.data.values || [];
    return rows.slice(1).filter(row => row[11] === 'PENDING'); // Filter by status
  } catch (err) {
    console.error('❌ Failed to read pending units:', err.message);
    return [];
  }
}

async function checkDuplicate(syncHash) {
  try {
    const snapshot = await db
      .collection('listings')
      .where('dupeCheckHash', '==', syncHash)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (err) {
    console.error('❌ Dedup check failed:', err.message);
    return false;
  }
}

async function addUnitToFirestore(unit, syncHash) {
  try {
    const sbrCode = generateSBRCode(
      unit.compound,
      unit.bedrooms,
      unit.furnishing,
      unit.price
    );

    const docRef = await db.collection('listings').add({
      // Identity
      title: `${unit.bedrooms}BR ${unit.compound}`,
      titleAr: unit.titleAr || '',

      // SBR Code
      sbrCode,

      // Specs
      propertyType: unit.propertyType || 'apartment',
      category: 'residential',
      bedrooms: parseInt(unit.bedrooms) || 0,
      bathrooms: parseInt(unit.bathrooms) || 0,
      area: parseInt(unit.area) || 0,
      finishingType: unit.finishingType || 'not-finished',
      furnishingStatus: unit.furnishing || 'unfurnished',

      // Price
      price: parseFloat(unit.price) || 0,
      pricePerSqm: parseFloat(unit.price) / (parseInt(unit.area) || 1),

      // Location
      compound: unit.compound,
      location: {
        address: unit.address || unit.compound,
        lat: parseFloat(unit.lat) || 30.0, // Default to Cairo
        lng: parseFloat(unit.lng) || 31.0,
      },

      // Dedup
      dupeCheckHash: syncHash,

      // Lifecycle
      status: 'Available',
      ownerType: 'broker',
      ownerContact: unit.ownerContact || '',
      createdAt: new Date(),
      updatedAt: new Date(),

      // Source
      source: 'sheets_sync',
    });

    console.log(`✅ Unit added: ${sbrCode}`);
    return docRef.id;
  } catch (err) {
    console.error('❌ Firestore write failed:', err.message);
    return null;
  }
}

async function updateUnitStatus(rowIndex, status) {
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
  console.log('🏢 Starting unit adder workflow...');

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
      console.log(`⏭️  Skipped (duplicate): ${unit.compound} ${unit.bedrooms}BR`);
      await updateUnitStatus(i, 'DEDUPLICATED');
      deduplicated++;
    } else {
      const docId = await addUnitToFirestore(unit, syncHash);
      if (docId) {
        await updateUnitStatus(i, 'ADDED');
        added++;
      } else {
        await updateUnitStatus(i, 'ERROR');
      }
    }
  }

  console.log(
    `✅ Unit adder complete: ${added} added, ${deduplicated} deduplicated, ${pendingUnits.length - added - deduplicated} errors`
  );

  process.exit(0);
}

main();
