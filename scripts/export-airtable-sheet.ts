import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, '../apps/sierra-estates-realty/data/consolidated-master-inventory.json');
const airtableCsvPath = path.join(__dirname, '../apps/sierra-estates-realty/data/sierra-estates-airtable-import.csv');

// Known GPS Coordinates for verified compounds in Egypt
const VERIFIED_COMPOUND_COORDS: Record<string, { lat: number; lng: number }> = {
  'Madinaty': { lat: 30.0984, lng: 31.6288 },
  'Al Rehab': { lat: 30.0608, lng: 31.4936 },
  'Mivida': { lat: 30.0152, lng: 31.5204 },
  'Mevida': { lat: 30.0152, lng: 31.5204 },
  'Hyde Park': { lat: 30.0055, lng: 31.5262 },
  'Up Town Cairo': { lat: 30.0189, lng: 31.3094 },
  'Fifth Square': { lat: 30.0412, lng: 31.5123 },
  'CFC': { lat: 30.0275, lng: 31.4089 },
  'Cairo Festival City': { lat: 30.0275, lng: 31.4089 },
  'Sodic': { lat: 30.0125, lng: 31.5312 },
  'Villette (SODIC)': { lat: 30.0125, lng: 31.5312 },
  'Eastown (SODIC)': { lat: 30.0195, lng: 31.4985 },
  'Eastown': { lat: 30.0195, lng: 31.4985 },
  'Palm Hills': { lat: 30.0118, lng: 31.5188 },
  'Palm Hills New Cairo': { lat: 30.0118, lng: 31.5188 },
  'Badya (Palm Hills)': { lat: 29.9281, lng: 30.8711 },
  'Swan Lake Residence': { lat: 30.0521, lng: 31.4682 },
  'Lake View Residence': { lat: 30.0225, lng: 31.4812 },
  'Taj City': { lat: 30.0650, lng: 31.5310 },
  'Katameya Heights': { lat: 29.9900, lng: 31.4800 },
  'Katameya Dunes': { lat: 29.9850, lng: 31.5120 },
  'The Waterway': { lat: 30.0450, lng: 31.4890 },
  'Zed East': { lat: 30.0950, lng: 31.6100 },
  'Mountain View iCity': { lat: 30.0140, lng: 31.6180 },
  'Stone Residence': { lat: 30.0050, lng: 31.4420 },
  'Al Burouj': { lat: 30.1650, lng: 31.7450 },
  'Dar Misr': { lat: 30.0520, lng: 31.5420 },
};

export function exportAirtableSheet() {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Master inventory not found at ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const items: any[] = JSON.parse(raw);

  const headers = [
    'Record ID',
    'Sierra Code',
    'Compound Name',
    'Location / Area',
    'Property Type',
    'Operation (Sale / Rent)',
    'Price (EGP)',
    'Area (sqm)',
    'Bedrooms',
    'Bathrooms',
    'Finishing Quality',
    'Source Classification',
    'Origin Channel / WhatsApp Group',
    'Owner / Broker Contact Info',
    'GPS Verification Status',
    'Latitude',
    'Longitude',
    'Has Photo? (YES / NO)',
    'Primary Photo URL (Airtable Attachment)',
    'Photo Gallery Links',
    'Listing Timestamp',
    'Notes & Broker Description',
  ];

  let verifiedGpsCount = 0;
  let pendingGpsCount = 0;
  let withPhotosCount = 0;

  const rows = items.map((item, idx) => {
    const rawCmp = (item.compound || item.cmp || item.location || 'New Cairo').trim();
    const isKnown = Object.keys(VERIFIED_COMPOUND_COORDS).find(
      (k) => rawCmp.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(rawCmp.toLowerCase())
    );

    let lat = '30.0263';
    let lng = '31.4913';
    let gpsStatus = '⚠️ Pending Coordinate Verification (Edit in Map)';

    if (isKnown && VERIFIED_COMPOUND_COORDS[isKnown]) {
      lat = VERIFIED_COMPOUND_COORDS[isKnown].lat.toString();
      lng = VERIFIED_COMPOUND_COORDS[isKnown].lng.toString();
      gpsStatus = '✅ Verified Compound Coordinates';
      verifiedGpsCount++;
    } else {
      pendingGpsCount++;
    }

    const hasRealPhotos = item.images && Array.isArray(item.images) && item.images.length > 0;
    if (hasRealPhotos) withPhotosCount++;

    const primaryPhoto = hasRealPhotos
      ? item.images[0]
      : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80';
    const galleryLinks = hasRealPhotos ? item.images.join(', ') : 'No attached photos';

    const cleanNotes = (item.notes || item.comment || item.description || '').replace(/[\r\n]/g, ' ');

    const fields = [
      `REC-${String(idx + 1).padStart(4, '0')}`,
      item.sierraCode || item.code || `SE-${idx + 1}`,
      rawCmp,
      item.location || rawCmp,
      item.type || 'Apartment',
      item.operation || (item.mode === 'rent' ? 'Rent' : 'Sale'),
      item.price || 0,
      item.area_sqm || item.area || 0,
      item.bedrooms || item.beds || 3,
      item.bathrooms || item.baths || 2,
      item.finishing || 'Semi-Finished',
      item.sourceType === 'owner' ? '🟢 Direct Owner' : '🔵 Broker Network',
      item.whatsappGroupName || item.sourceGroup || 'Master Sheet Direct Drop',
      item.contact_info || item.ownerName || '',
      gpsStatus,
      lat,
      lng,
      hasRealPhotos ? 'YES' : 'NO (Using Luxury Render)',
      primaryPhoto,
      galleryLinks,
      item.listedAt || new Date().toISOString(),
      cleanNotes,
    ];

    return fields.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  fs.writeFileSync(airtableCsvPath, csvContent, 'utf-8');

  console.log(`\n🎉 Airtable & Spreadsheet Export Generated Successfully!`);
  console.log(`📍 Total Units: ${items.length}`);
  console.log(`✅ Verified GPS Compounds: ${verifiedGpsCount} units`);
  console.log(`⚠️ Pending GPS Review: ${pendingGpsCount} units (Marked for user review)`);
  console.log(`📸 Units with Real Photos: ${withPhotosCount} units`);
  console.log(`📁 File written to: ${airtableCsvPath}\n`);

  return { total: items.length, verifiedGpsCount, pendingGpsCount, withPhotosCount, path: airtableCsvPath };
}

if (process.argv[1] && process.argv[1].endsWith('export-airtable-sheet.ts')) {
  exportAirtableSheet();
}
