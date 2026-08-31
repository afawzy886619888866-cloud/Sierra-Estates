import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const xlsx = require('xlsx');
const dotenv = require('dotenv');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(ROOT, '.env.local') });

console.log('══════════════════════════════════════════════════════');
console.log('  SIERRA ESTATES — GIANT MASTER INVENTORY SYNC');
console.log('══════════════════════════════════════════════════════\n');

// 1. Read Excel file
const excelPath = path.join(ROOT, 'Inventory_with_Photos.xlsx');
if (!fs.existsSync(excelPath)) {
  console.error(`❌ File not found: ${excelPath}`);
  process.exit(1);
}

console.log(`📖 Reading master workbook: ${excelPath}...`);
const wb = xlsx.readFile(excelPath);
const sheet = wb.Sheets['All Inventory Units'] || wb.Sheets[wb.SheetNames[0]];
const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log(`📊 Total raw rows in sheet: ${rawRows.length}`);

// Find header row (starts with RecordID)
let headerIndex = -1;
for (let i = 0; i < Math.min(10, rawRows.length); i++) {
  if (rawRows[i] && rawRows[i].includes('RecordID')) {
    headerIndex = i;
    break;
  }
}

if (headerIndex === -1) {
  console.error('❌ Could not find header row with "RecordID"');
  process.exit(1);
}

const headers = rawRows[headerIndex];
console.log(`📋 Header row found at index ${headerIndex}: ${headers.length} columns`);

const listings = [];

for (let r = headerIndex + 1; r < rawRows.length; r++) {
  const row = rawRows[r];
  if (!row || row.length === 0 || !row[0]) continue;

  const item = {};
  headers.forEach((h, idx) => {
    if (h) item[h.trim()] = row[idx] !== undefined ? row[idx] : '';
  });

  const recordId = String(item.RecordID || `INV-${r}`).trim();
  const rawPrice = String(item.PriceEGP || '0').replace(/[^0-9.]/g, '');
  const price = parseFloat(rawPrice) || 0;
  const area = parseFloat(String(item.AreaSqm || '0').replace(/[^0-9.]/g, '')) || 0;
  const beds = parseInt(String(item.Bedrooms || '0'), 10) || 0;
  const baths = parseInt(String(item.Bathrooms || '0'), 10) || 0;
  const location = String(item.Location || 'New Cairo').trim();
  const zone = String(item.Zone || location).trim();
  const propertyType = String(item.PropertyType || 'Apartment').trim();
  const listingCategory = String(item.ListingCategory || 'Rental').trim();
  const isSale = listingCategory.toLowerCase().includes('sale') || listingCategory.toLowerCase().includes('بيع');
  const type = isSale ? 'sale' : 'rent';

  const contactPhone = String(item.ContactPhone || '').trim();
  const contactName = String(item.ContactName || '').trim();
  const ownerBroker = String(item.OwnerBroker || 'Owner').trim();
  const isOwner = ownerBroker.toLowerCase().includes('owner') || ownerBroker.toLowerCase().includes('مالك');

  const photoUrls = String(item.PhotoURLs || '')
    .split(/[\n,;]+/)
    .map(u => u.trim())
    .filter(u => u.startsWith('http'));

  const comment = String(item.Comment || item.AdditionalFeatures || '').trim();

  listings.push({
    id: recordId,
    recordId,
    title: `${propertyType} in ${location} (${beds} Beds)`,
    compound: location,
    location,
    zone,
    propertyType,
    type,
    listingCategory,
    price,
    priceFormatted: price > 0 ? `${price.toLocaleString('en-US')} EGP` : 'Price on Request',
    currency: 'EGP',
    area,
    bedrooms: beds,
    bathrooms: baths,
    furnished: String(item.Furnished || 'no').toLowerCase().includes('yes') || String(item.Furnished || '').toLowerCase().includes('furnish') || String(item.Furnished || '').includes('مفروش'),
    garden: Boolean(item.Garden),
    pool: Boolean(item.Pool),
    contactName: contactName || 'Direct Owner',
    contactPhone,
    ownerBroker,
    isDirectOwner: isOwner,
    availability: String(item.Availability || 'Available').trim(),
    photos: photoUrls,
    images: photoUrls.length > 0 ? photoUrls : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80'],
    img: photoUrls.length > 0 ? photoUrls[0] : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
    comment,
    source: 'master-inventory-xlsx',
    updatedAt: new Date().toISOString(),
  });
}

console.log(`✅ Extracted ${listings.length} structured listings!`);

// Save local json & csv copies for the web app
const dataDir = path.join(ROOT, 'apps/sierra-estates-realty/data');
const publicDir = path.join(ROOT, 'apps/sierra-estates-realty/public/downloads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(dataDir, 'real-listings.json'), JSON.stringify(listings, null, 2), 'utf8');
console.log(`💾 Saved local JSON → apps/sierra-estates-realty/data/real-listings.json`);

// Also save flat clean CSV
const cleanCsvHeader = 'RecordID,ListingCategory,Type,Location,Zone,PropertyType,Bedrooms,Bathrooms,AreaSqm,PriceEGP,Furnished,ContactName,ContactPhone,OwnerBroker,Availability,PhotosCount,PhotoURLs\n';
const cleanCsvRows = listings.map(l => 
  `"${l.id}","${l.listingCategory}","${l.type}","${l.location.replace(/"/g, '""')}","${l.zone.replace(/"/g, '""')}","${l.propertyType}",${l.bedrooms},${l.bathrooms},${l.area},${l.price},${l.furnished},"${l.contactName.replace(/"/g, '""')}","${l.contactPhone}","${l.ownerBroker}","${l.availability}",${l.photos.length},"${(l.photos[0] || '').replace(/"/g, '""')}"`
).join('\n');

fs.writeFileSync(path.join(publicDir, 'sierra-estates-clean-inventory.csv'), cleanCsvHeader + cleanCsvRows, 'utf8');
fs.writeFileSync(path.join(ROOT, 'data/sierra-estates-clean-inventory.csv'), cleanCsvHeader + cleanCsvRows, 'utf8');
console.log(`💾 Saved clean CSV → apps/sierra-estates-realty/public/downloads/sierra-estates-clean-inventory.csv`);

// 2. Sync to Firestore
async function syncToFirestore() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  STAGE 2: Syncing Listings to Firebase Firestore');
  console.log('══════════════════════════════════════════════════════');

  let initializeApp, getApps, cert, getFirestore;
  try {
    ({ initializeApp, getApps, cert } = require('firebase-admin/app'));
    ({ getFirestore } = require('firebase-admin/firestore'));
  } catch (err) {
    console.warn(`⚠️ firebase-admin error: ${err.message}`);
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'sierra-blu';

  try {
    if (getApps().length === 0) {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_SERVICE_ACCOUNT_KEY.includes('{')) {
        const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        initializeApp({ credential: cert(sa), projectId });
        console.log(`🔑 Authenticated via GOOGLE_SERVICE_ACCOUNT_KEY → ${projectId}`);
      } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
          projectId,
        });
        console.log(`🔑 Authenticated via FIREBASE_CLIENT_EMAIL → ${projectId}`);
      } else {
        console.log('ℹ️ Running in Local File Sync Mode (Firebase credentials mock/offline).');
        return;
      }
    }

    const db = getFirestore();
    const BATCH_SIZE = 500;
    let written = 0;
    const collections = ['properties', 'units'];

    console.log(`🔄 Writing ${listings.length} listings to Firestore collections [${collections.join(', ')}]...`);

    for (const colName of collections) {
      for (let i = 0; i < listings.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const slice = listings.slice(i, i + BATCH_SIZE);
        for (const unit of slice) {
          const docRef = db.collection(colName).doc(unit.id);
          batch.set(docRef, unit, { merge: true });
        }
        await batch.commit();
        written += slice.length;
        process.stdout.write(`   ✓ [${colName}] Committed ${Math.min(i + BATCH_SIZE, listings.length)}/${listings.length}\r`);
      }
      console.log(`\n✅ Collection "${colName}" synced successfully!`);
    }

    console.log(`\n🎉 Firestore sync complete! Total ${listings.length} units active.`);
  } catch (err) {
    console.warn(`⚠️ Firestore sync notice: ${err.message}`);
  }
}

syncToFirestore().then(() => {
  console.log('\n🏁 Giant Master Inventory Processing Finished Successfully!');
});
