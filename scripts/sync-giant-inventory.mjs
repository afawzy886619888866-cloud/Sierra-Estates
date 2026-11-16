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
let unitIndex = 0;

for (let r = headerIndex + 1; r < rawRows.length; r++) {
  const row = rawRows[r];
  if (!row || row.length === 0 || !row[0]) continue;

  const item = {};
  headers.forEach((h, idx) => {
    if (h) item[h.trim()] = row[idx] !== undefined ? row[idx] : '';
  });

  unitIndex++;
  const recordId = String(item.RecordID || `INV-${r}`).trim();
  const rawPrice = String(item.PriceEGP || '0').replace(/[^0-9.]/g, '');
  const price = parseFloat(rawPrice) || 0;
  const area = parseFloat(String(item.AreaSqm || '0').replace(/[^0-9.]/g, '')) || 150;
  const beds = parseInt(String(item.Bedrooms || '0'), 10) || 3;
  const baths = parseInt(String(item.Bathrooms || '0'), 10) || Math.max(1, beds - 1);
  const location = String(item.Location || 'New Cairo').trim();
  const zone = String(item.Zone || location).trim();
  const propertyType = String(item.PropertyType || 'Apartment').trim();
  const listingCategory = String(item.ListingCategory || 'Rental').trim();
  const isSale = listingCategory.toLowerCase().includes('sale') || listingCategory.toLowerCase().includes('بيع');
  const mode = isSale ? 'sale' : 'rent';

  const contactPhone = String(item.ContactPhone || '').trim();
  const contactName = String(item.ContactName || 'Direct Owner').trim();
  const ownerBroker = String(item.OwnerBroker || 'Owner').trim();
  const isOwner = ownerBroker.toLowerCase().includes('owner') || ownerBroker.toLowerCase().includes('مالك');

  const photoUrls = String(item.PhotoURLs || '')
    .split(/[\n,;]+/)
    .map(u => u.trim())
    .filter(u => u.startsWith('http'));

  const comment = String(item.Comment || item.AdditionalFeatures || '').trim();
  const code = String(item.Code || item.UnitFingerprint || `SE-${recordId}`).trim();

  listings.push({
    id: unitIndex,
    recordId,
    code,
    title: `${propertyType} in ${location} (${beds} Beds)`,
    compound: location,
    location,
    zone,
    propertyType,
    type: propertyType,
    mode,
    status: 'Available',
    listingCategory,
    price,
    priceFormatted: price > 0 ? `${price.toLocaleString('en-US')} EGP` : 'Price on Request',
    egpM: Number((price / 1_000_000).toFixed(2)),
    usd: Math.round(price / 50),
    currency: 'EGP',
    area,
    bedrooms: beds,
    beds,
    bathrooms: baths,
    baths,
    furnished: String(item.Furnished || 'no').toLowerCase().includes('yes') || String(item.Furnished || '').toLowerCase().includes('furnish') || String(item.Furnished || '').includes('مفروش'),
    garden: Boolean(item.Garden),
    pool: Boolean(item.Pool),
    ownerName: contactName,
    agent: contactName.includes('Owner') ? `${contactName} (WhatsApp Verified)` : 'Sierra WhatsApp Concierge',
    contactName,
    contactPhone,
    mobile: contactPhone,
    ownerBroker,
    isDirectOwner: isOwner,
    availability: 'Available',
    ago: 'WhatsApp Import',
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

fs.writeFileSync(path.join(dataDir, 'master-inventory-9k.json'), JSON.stringify(listings, null, 2), 'utf8');
console.log(`💾 Saved local JSON → apps/sierra-estates-realty/data/master-inventory-9k.json`);

// Also save flat clean CSV
const cleanCsvHeader = 'RecordID,ListingCategory,Type,Location,Zone,PropertyType,Bedrooms,Bathrooms,AreaSqm,PriceEGP,Furnished,ContactName,ContactPhone,OwnerBroker,Availability,PhotosCount,PhotoURLs\n';
const cleanCsvRows = listings.map(l => 
  `"${l.recordId}","${l.listingCategory}","${l.mode}","${l.location.replace(/"/g, '""')}","${l.zone.replace(/"/g, '""')}","${l.propertyType}",${l.bedrooms},${l.bathrooms},${l.area},${l.price},${l.furnished},"${l.contactName.replace(/"/g, '""')}","${l.contactPhone}","${l.ownerBroker}","${l.availability}",${l.photos.length},"${(l.photos[0] || '').replace(/"/g, '""')}"`
).join('\n');

fs.writeFileSync(path.join(publicDir, 'sierra-estates-clean-inventory.csv'), cleanCsvHeader + cleanCsvRows, 'utf8');
fs.writeFileSync(path.join(ROOT, 'data/sierra-estates-clean-inventory.csv'), cleanCsvHeader + cleanCsvRows, 'utf8');
console.log(`💾 Saved clean CSV → apps/sierra-estates-realty/public/downloads/sierra-estates-clean-inventory.csv`);

// 2. Sync to Supabase
async function syncToSupabase() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  STAGE 2: Syncing Listings to Supabase PostgreSQL');
  console.log('══════════════════════════════════════════════════════');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.log('ℹ️ SUPABASE_SERVICE_ROLE_KEY not found in environment. Skipping remote database sync.');
    return;
  }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    console.log(`📡 Connected to Supabase: ${supabaseUrl}`);
    const BATCH_SIZE = 100;
    let written = 0;

    console.log(`🔄 Upserting ${listings.length} listings to Supabase public.listings...`);

    for (let i = 0; i < listings.length; i += BATCH_SIZE) {
      const slice = listings.slice(i, i + BATCH_SIZE);
      const records = slice.map((l) => ({
        code: String(l.recordId),
        title: l.title || `${l.bedrooms}BR ${l.compound}`,
        compound: l.compound,
        location: l.location,
        zone: l.zone,
        property_type: l.propertyType?.toLowerCase() || 'apartment',
        bedrooms: Number(l.bedrooms) || 0,
        bathrooms: Number(l.bathrooms) || 0,
        area: Number(l.area) || 0,
        price: Number(l.price) || 0,
        status: 'available',
        owner_type: l.isDirectOwner ? 'owner' : 'broker',
        owner_contact: l.contactPhone || '',
        contact_name: l.contactName || '',
        img: l.img,
        photos: l.photos,
        images: l.images,
        source: 'master-inventory-xlsx',
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('listings')
        .upsert(records, { onConflict: 'code' });

      if (error) {
        console.warn(`\n⚠️ Batch error at ${i}:`, error.message);
      } else {
        written += records.length;
        process.stdout.write(`   ✓ Committed ${written}/${listings.length}\r`);
      }
    }

    console.log(`\n🎉 Supabase sync complete! Total ${written} units updated in public.listings.`);
  } catch (err) {
    console.warn(`⚠️ Supabase sync notice: ${err.message}`);
  }
}

syncToSupabase().then(() => {
  console.log('\n🏁 Giant Master Inventory Processing Finished Successfully!');
});
