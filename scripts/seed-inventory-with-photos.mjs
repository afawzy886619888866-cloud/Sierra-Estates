/**
 * seed-inventory-with-photos.mjs — regenerate the STRUCTURAL seed workbook
 * (Inventory_with_Photos.xlsx at repo root).
 *
 * Why: the 7MB+ real master workbook lives in Supabase Storage and is synced
 * at build time; git (and fresh clones) carry a structural seed with the
 * canonical sheets and columns (documented in
 * __tests__/excel-inventory-and-mobile-ui.test.ts). The seed was never
 * committed, so the suite failed on fresh checkouts and a 1-sheet accidental
 * workbook drifted into its place. This script regenerates the canonical
 * 4-sheet seed deterministically.
 *
 * Rows are STRUCTURAL ONLY: real New Cairo compounds and real Unsplash photo
 * URLs so the normalization path is exercised, but no real owner PII
 * (Contact fields are intentionally empty — §21 no-fabrication).
 *
 * Usage: node scripts/seed-inventory-with-photos.mjs
 */
import * as XLSX from 'xlsx';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Seeded under apps/sierra-estates-realty/data/ — the LAST candidate in
// ExcelInventoryService.getMasterExcelPath() and the only one permitted by
// the git-weight hygiene contract (no ROOT-level spreadsheets tracked;
// root Inventory_with_Photos.xlsx is a local runtime artifact).
const OUT = resolve(__dirname, '..', 'apps/sierra-estates-realty/data/Inventory_with_Photos.xlsx');

const EXCEL_COLUMNS = [
  'RecordID',
  'UnitCode',
  'Compound',
  'Location',
  'Zone',
  'PropertyType',
  'Operation',
  'Price (EGP)',
  'Price Formatted',
  'Area (sqm)',
  'Bedrooms',
  'Bathrooms',
  'Furnishing',
  'Contact Name',
  'Contact Phone',
  'WhatsApp Direct',
  'Inventory Status',
  'Photo Match Status',
  'Photo URLs',
  'Description',
  'Source',
  'Updated At',
];

const PHOTOS = {
  villa: 'https://images.unsplash.com/photo-1613490493576-7fde63acdcc1?w=1200',
  apartment: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
  townhouse: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200',
};

/** Structural seed rows — 2 per canonical sheet. */
const SHEETS = {
  'Owners Rent': [
    { Compound: 'Mivida', PropertyType: 'Apartment', Operation: 'Rent', 'Price (EGP)': 60000, Area: 180, Bedrooms: 3, Photo: PHOTOS.apartment, Desc: 'Structural seed row — Mivida apartment for rent' },
    { Compound: 'Hyde Park', PropertyType: 'Townhouse', Operation: 'Rent', 'Price (EGP)': 95000, Area: 260, Bedrooms: 4, Photo: PHOTOS.townhouse, Desc: 'Structural seed row — Hyde Park townhouse for rent' },
  ],
  'Owners Buy': [
    { Compound: 'Mivida', PropertyType: 'Villa', Operation: 'Sale', 'Price (EGP)': 34000000, Area: 420, Bedrooms: 5, Photo: PHOTOS.villa, Desc: 'Structural seed row — Mivida villa for sale' },
    { Compound: 'Eastown', PropertyType: 'Apartment', Operation: 'Sale', 'Price (EGP)': 12500000, Area: 195, Bedrooms: 3, Photo: PHOTOS.apartment, Desc: 'Structural seed row — Eastown apartment for sale' },
  ],
  'Broker Rent': [
    { Compound: 'Mountain View', PropertyType: 'Apartment', Operation: 'Rent', 'Price (EGP)': 72000, Area: 200, Bedrooms: 3, Photo: PHOTOS.apartment, Desc: 'Structural seed row — Mountain View apartment for rent' },
    { Compound: 'Palm Hills', PropertyType: 'Townhouse', Operation: 'Rent', 'Price (EGP)': 110000, Area: 280, Bedrooms: 4, Photo: PHOTOS.townhouse, Desc: 'Structural seed row — Palm Hills townhouse for rent' },
  ],
  'Broker Buy': [
    { Compound: 'Rehab City', PropertyType: 'Apartment', Operation: 'Sale', 'Price (EGP)': 7500000, Area: 160, Bedrooms: 3, Photo: PHOTOS.apartment, Desc: 'Structural seed row — Rehab City apartment for sale' },
    { Compound: 'Madinaty', PropertyType: 'Villa', Operation: 'Sale', 'Price (EGP)': 18500000, Area: 350, Bedrooms: 4, Photo: PHOTOS.villa, Desc: 'Structural seed row — Madinaty villa for sale' },
  ],
};

const now = new Date().toISOString();

const wb = XLSX.utils.book_new();
for (const [sheetName, rows] of Object.entries(SHEETS)) {
  const sheetRows = rows.map((r, i) => {
    const prefix = sheetName.toLowerCase().replace(/\s+/g, '_');
    return {
      RecordID: `SEED-${prefix.toUpperCase()}-${String(i + 1).padStart(4, '0')}`,
      UnitCode: '',
      Compound: r.Compound,
      Location: r.Compound,
      Zone: '',
      PropertyType: r.PropertyType,
      Operation: r.Operation,
      'Price (EGP)': r['Price (EGP)'],
      'Price Formatted': `${r['Price (EGP)'].toLocaleString('en-EG')} EGP`,
      'Area (sqm)': r.Area,
      Bedrooms: r.Bedrooms,
      Bathrooms: Math.max(2, r.Bedrooms - 1),
      Furnishing: 'Semi',
      'Contact Name': '',
      'Contact Phone': '',
      'WhatsApp Direct': '',
      'Inventory Status': 'Available',
      'Photo Match Status': 'Matched',
      'Photo URLs': r.Photo,
      Description: r.Desc,
      Source: 'structural-seed',
      'Updated At': now,
    };
  });
  const ws = XLSX.utils.json_to_sheet(sheetRows, { header: [...EXCEL_COLUMNS] });
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

writeFileSync(OUT, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
console.log(`[seed-inventory] wrote structural seed → ${OUT}`);
console.log(`[seed-inventory] sheets: ${wb.SheetNames.join(', ')}`);
