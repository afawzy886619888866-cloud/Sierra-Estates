import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, '../apps/sierra-estates-realty/data/consolidated-master-inventory.json');
const csvPath = path.join(__dirname, '../apps/sierra-estates-realty/data/sierra-estates-master-inventory.csv');

const compoundCoords = {
  'New Cairo': { lat: 30.0263, lng: 31.4913 },
  'Madinaty': { lat: 30.0984, lng: 31.6288 },
  'Al Rehab': { lat: 30.0608, lng: 31.4936 },
  'Mivida': { lat: 30.0152, lng: 31.5204 },
  'Mevida': { lat: 30.0152, lng: 31.5204 },
  'Hyde Park': { lat: 30.0055, lng: 31.5262 },
  'Up Town Cairo': { lat: 30.0189, lng: 31.3094 },
  'Fifth Square': { lat: 30.0412, lng: 31.5123 },
  'CFC': { lat: 30.0275, lng: 31.4089 },
  'Sodic': { lat: 30.0125, lng: 31.5312 },
  'Villette (SODIC)': { lat: 30.0125, lng: 31.5312 },
  'Eastown (SODIC)': { lat: 30.0195, lng: 31.4985 },
  'Palm Hills': { lat: 30.0118, lng: 31.5188 },
  'Badya (Palm Hills)': { lat: 29.9281, lng: 30.8711 },
  'Swan Lake Residence': { lat: 30.0521, lng: 31.4682 },
  'Lake View Residence': { lat: 30.0225, lng: 31.4812 },
  'Narges': { lat: 30.0142, lng: 31.4421 },
  'new-capital': { lat: 30.0131, lng: 31.7058 },
};

export function generateMasterCSV() {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Inventory JSON not found at ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);

  const headers = [
    'Sierra Code',
    'Compound',
    'Location',
    'Property Type',
    'Operation',
    'Price (EGP)',
    'Area (sqm)',
    'Bedrooms',
    'Bathrooms',
    'Finishing Quality',
    'Source Type (Owner / Broker)',
    'Origin Channel / Group',
    'Contact Info / Owner Name',
    'Listing Timestamp',
    'Latitude',
    'Longitude',
    'Primary Image URL',
    'Listing Description & Notes',
  ];

  const rows = data.map((item) => {
    const cmp = item.compound || item.cmp || item.location || 'New Cairo';
    const coords = compoundCoords[cmp] || compoundCoords['New Cairo'];
    const price = item.price || 0;
    const area = item.area_sqm || item.area || 0;
    const beds = item.bedrooms || item.beds || 3;
    const baths = item.bathrooms || item.baths || 2;
    const img =
      item.images && item.images.length > 0
        ? item.images[0]
        : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80';
    const desc = (item.notes || item.comment || item.description || '').replace(/[\r\n]/g, ' ');

    const fields = [
      item.sierraCode || item.code || 'SE-UNIT',
      cmp,
      item.location || cmp,
      item.type || 'Apartment',
      item.operation || (item.mode === 'rent' ? 'Rent' : 'Sale'),
      price,
      area,
      beds,
      baths,
      item.finishing || 'Semi-Finished',
      item.sourceType === 'owner' ? 'Direct Owner' : 'Broker Network',
      item.whatsappGroupName || 'Master Sheet Direct Drop',
      item.contact_info || item.ownerName || '',
      item.listedAt || '',
      coords.lat,
      coords.lng,
      img,
      desc,
    ];

    return fields.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n'); // UTF-8 BOM for Excel Arabic compatibility
  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`\n✅ Generated clean master CSV (Single Source of Truth): ${csvPath}`);
  console.log(`📊 Total reconciled properties: ${data.length} units with GPS coordinates and images.`);
  return { total: data.length, path: csvPath };
}

if (process.argv[1] && process.argv[1].endsWith('export-master-excel-csv.ts')) {
  generateMasterCSV();
}
