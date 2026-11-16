import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

function clean(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function num(val) {
  if (val === undefined || val === null) return 0;
  const cleaned = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDeal(deal) {
  const d = clean(deal).toLowerCase();
  if (d.includes('rent') || d.includes('ايجار') || d.includes('إيجار')) return 'rent';
  return 'resale';
}

function normalizeChannel(source, contact) {
  const s = (clean(source) + ' ' + clean(contact)).toLowerCase();
  if (s.includes('broker') || s.includes('سمسار') || s.includes('وسيط')) return 'broker';
  return 'owner';
}

function getFingerprint(row) {
  const phone = clean(row['Contact Phone'] || row['Owner Phone'] || row['Phone'] || row['Mobile'] || row['owner_phone']).replace(/\D/g, '').slice(-10);
  const code = clean(row['Unit Code'] || row['Code'] || row['Reference Code'] || row['ref_id'] || row['RecordID']);
  const compound = clean(row['Compound'] || row['Compound / Community'] || row['Location'] || row['compound']).toLowerCase();
  const type = clean(row['Property Type'] || row['PropertyType'] || row['property_type'] || row['Type']).toLowerCase();
  const price = num(row['Price (EGP)'] || row['Price'] || row['Monthly Rent (EGP)'] || row['Unit Price'] || row['price']);
  const area = num(row['Area (sqm)'] || row['Area'] || row['Space'] || row['area_sqm']);
  const beds = num(row['Bedrooms'] || row['bedrooms'] || row['rooms'] || row['beds']);

  if (code && code.length > 3 && !['NULL', 'UNDEFINED'].includes(code.toUpperCase())) {
    return `CODE:${code.toUpperCase()}`;
  }
  if (phone.length >= 8 && price > 0) {
    return `PH:${phone}|${compound}|${price}`;
  }
  return `ATTR:${compound}|${type}|${beds}|${area}|${price}`;
}

function canonicalRow(row, defaultDeal, defaultSource) {
  const compound = clean(row['Compound'] || row['Compound / Community'] || row['Location'] || row['compound']) || 'New Cairo';
  const propType = clean(row['Property Type'] || row['PropertyType'] || row['Property Tybe'] || row['property_type'] || row['Type']) || 'Apartment';
  const dealType = normalizeDeal(row['Deal Type'] || row['Operation'] || row['deal_type'] || row['Type'] || defaultDeal);
  const price = num(row['Price (EGP)'] || row['Price'] || row['Monthly Rent (EGP)'] || row['Unit Price'] || row['price']);
  const area = num(row['Area (sqm)'] || row['Area'] || row['Space'] || row['area_sqm']);
  const beds = num(row['Bedrooms'] || row['bedrooms'] || row['rooms'] || row['beds']);
  const baths = num(row['Bathrooms'] || row['bathrooms'] || row['baths']);
  const phone = clean(row['Contact Phone'] || row['Owner Phone'] || row['Phone'] || row['Mobile'] || row['owner_phone']);
  const name = clean(row['Contact Name'] || row['Owner / Contact Name'] || row['Name'] || row['owner_name']);
  const code = clean(row['Unit Code'] || row['Code'] || row['Reference Code'] || row['ref_id'] || row['RecordID']);
  const status = clean(row['Listing Status'] || row['Inventory Status'] || row['Status'] || row['status'] || row['Availablty']) || 'Available';
  const furnishing = clean(row['Furnishing'] || row['Furnished or not'] || row['Furnishing Status'] || row['finishing_type']);
  const desc = clean(row['Description'] || row['Listing Notes'] || row['Comment'] || row['description'] || row['notes']);
  
  // Extract photo URLs if available
  let photos = clean(row['Photo URLs'] || row['Photo URL'] || row['Photos'] || row['Images'] || row['images'] || row['photos']);
  if (Array.isArray(row['images'])) photos = row['images'].join('\n');
  if (Array.isArray(row['photos'])) photos = row['photos'].join('\n');

  return {
    'Reference Code': code || `SE-${Math.abs(price).toString(36)}-${Math.trunc(area).toString(36)}`.toUpperCase(),
    'Compound': compound,
    'Zone / Area': clean(row['Zone / Area'] || row['Zone'] || row['location_area']) || 'New Cairo',
    'Property Type': propType,
    'Deal Type': dealType === 'rent' ? 'Rent' : 'Resale',
    'Price (EGP)': price,
    'Area (sqm)': area,
    'Bedrooms': beds,
    'Bathrooms': baths,
    'Furnishing': furnishing,
    'Listing Status': status,
    'Contact Name': name,
    'Contact Phone': phone,
    'WhatsApp Direct': phone.replace(/\D/g, '').length >= 10 ? `https://wa.me/20${phone.replace(/\D/g, '').slice(-10)}` : '',
    'Photo URLs': photos,
    'Description': desc,
  };
}

async function main() {
  console.log('─── SIERRA ESTATES: CONSOLIDATING 23 SHEETS INTO 3 CANONICAL WORKBOOKS ───');

  const rentOwners = new Map();
  const rentBrokers = new Map();
  const resaleOwners = new Map();
  const resaleBrokers = new Map();

  const photoUnits = {
    ownersRent: new Map(),
    ownersResale: new Map(),
    brokersRent: new Map(),
    brokersResale: new Map(),
  };

  function addListing(r, defDeal, defSource) {
    const item = canonicalRow(r, defDeal, defSource);
    const fp = getFingerprint(r);
    const isRent = item['Deal Type'] === 'Rent';
    const isOwner = normalizeChannel(defSource, item['Contact Name'] + ' ' + (r['OwnerBroker'] || r['SourceType'] || '')) === 'owner';

    const hasPhotos = item['Photo URLs'] && item['Photo URLs'].includes('http');

    if (isRent) {
      if (isOwner) {
        if (!rentOwners.has(fp)) rentOwners.set(fp, item);
        if (hasPhotos && !photoUnits.ownersRent.has(fp)) photoUnits.ownersRent.set(fp, item);
      } else {
        if (!rentBrokers.has(fp)) rentBrokers.set(fp, item);
        if (hasPhotos && !photoUnits.brokersRent.has(fp)) photoUnits.brokersRent.set(fp, item);
      }
    } else {
      if (isOwner) {
        if (!resaleOwners.has(fp)) resaleOwners.set(fp, item);
        if (hasPhotos && !photoUnits.ownersResale.has(fp)) photoUnits.ownersResale.set(fp, item);
      } else {
        if (!resaleBrokers.has(fp)) resaleBrokers.set(fp, item);
        if (hasPhotos && !photoUnits.brokersResale.has(fp)) photoUnits.brokersResale.set(fp, item);
      }
    }
  }

  // 1. Process Inventory_with_Photos.xlsx
  if (fs.existsSync(path.join(ROOT, 'Inventory_with_Photos.xlsx'))) {
    console.log('Reading Inventory_with_Photos.xlsx...');
    const wb = XLSX.readFile(path.join(ROOT, 'Inventory_with_Photos.xlsx'));
    for (const sheet of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet]);
      const isRent = sheet.toLowerCase().includes('rent');
      const isOwner = sheet.toLowerCase().includes('owner');
      for (const r of rows) {
        addListing(r, isRent ? 'rent' : 'resale', isOwner ? 'owner' : 'broker');
      }
    }
  }

  // 2. Process all CSV files and Excel files in root
  const rootFiles = fs.readdirSync(ROOT).filter(f => (f.endsWith('.xlsx') || f.endsWith('.csv')) && !f.startsWith('Sierra_Estates_Rent_Master') && !f.startsWith('Sierra_Estates_Resale_Master') && !f.startsWith('Sierra_Estates_Units_With_Photos'));

  for (const f of rootFiles) {
    const full = path.join(ROOT, f);
    try {
      const wb = XLSX.readFile(full);
      const isRentDefault = f.toLowerCase().includes('rent');
      const isOwnerDefault = f.toLowerCase().includes('owner');
      const isBrokerDefault = f.toLowerCase().includes('broker');
      const sourceDef = isBrokerDefault ? 'broker' : (isOwnerDefault ? 'owner' : 'unknown');

      for (const s of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[s]);
        const sIsRent = s.toLowerCase().includes('rent') || isRentDefault;
        const sIsOwner = s.toLowerCase().includes('owner') || (sourceDef === 'owner');
        const sSource = s.toLowerCase().includes('broker') ? 'broker' : (sIsOwner ? 'owner' : sourceDef);

        for (const r of rows) {
          addListing(r, sIsRent ? 'rent' : 'resale', sSource);
        }
      }
    } catch (e) {
      console.warn(`Could not parse ${f}: ${e.message}`);
    }
  }

  console.log(`\nConsolidated Counts (De-duplicated):`);
  console.log(`- Rent Owners: ${rentOwners.size}`);
  console.log(`- Rent Brokers: ${rentBrokers.size}`);
  console.log(`- Resale Owners: ${resaleOwners.size}`);
  console.log(`- Resale Brokers: ${resaleBrokers.size}`);
  console.log(`\nUnits with Photos:`);
  console.log(`- Owners Rent: ${photoUnits.ownersRent.size}`);
  console.log(`- Owners Resale: ${photoUnits.ownersResale.size}`);
  console.log(`- Brokers Rent: ${photoUnits.brokersRent.size}`);
  console.log(`- Brokers Resale: ${photoUnits.brokersResale.size}`);

  // WORKBOOK 1: Sierra_Estates_Rent_Master.xlsx
  const wbRent = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbRent, XLSX.utils.json_to_sheet(Array.from(rentOwners.values())), 'Owners');
  XLSX.utils.book_append_sheet(wbRent, XLSX.utils.json_to_sheet(Array.from(rentBrokers.values())), 'Brokers');
  const rentPath = path.join(ROOT, 'Sierra_Estates_Rent_Master.xlsx');
  XLSX.writeFile(wbRent, rentPath);
  console.log(`[✓] Created Workbook 1 (Rent Master) → ${rentPath}`);

  // WORKBOOK 2: Sierra_Estates_Resale_Master.xlsx
  const wbResale = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbResale, XLSX.utils.json_to_sheet(Array.from(resaleOwners.values())), 'Owners');
  XLSX.utils.book_append_sheet(wbResale, XLSX.utils.json_to_sheet(Array.from(resaleBrokers.values())), 'Brokers');
  const resalePath = path.join(ROOT, 'Sierra_Estates_Resale_Master.xlsx');
  XLSX.writeFile(wbResale, resalePath);
  console.log(`[✓] Created Workbook 2 (Resale Master) → ${resalePath}`);

  // WORKBOOK 3: Sierra_Estates_Units_With_Photos.xlsx
  const wbPhotos = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbPhotos, XLSX.utils.json_to_sheet(Array.from(photoUnits.ownersRent.values())), 'Owners Rent');
  XLSX.utils.book_append_sheet(wbPhotos, XLSX.utils.json_to_sheet(Array.from(photoUnits.ownersResale.values())), 'Owners Resale');
  XLSX.utils.book_append_sheet(wbPhotos, XLSX.utils.json_to_sheet(Array.from(photoUnits.brokersRent.values())), 'Brokers Rent');
  XLSX.utils.book_append_sheet(wbPhotos, XLSX.utils.json_to_sheet(Array.from(photoUnits.brokersResale.values())), 'Brokers Resale');
  const photosPath = path.join(ROOT, 'Sierra_Estates_Units_With_Photos.xlsx');
  XLSX.writeFile(wbPhotos, photosPath);
  console.log(`[✓] Created Workbook 3 (Units With Photos) → ${photosPath}`);

  // Create an Archive folder and move the 23 raw files into it so root is clean
  const archiveDir = path.join(ROOT, 'archive', 'legacy_inventory_sheets');
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

  const canonicalTargets = ['Sierra_Estates_Rent_Master.xlsx', 'Sierra_Estates_Resale_Master.xlsx', 'Sierra_Estates_Units_With_Photos.xlsx'];

  let movedCount = 0;
  for (const f of rootFiles) {
    if (!canonicalTargets.includes(f)) {
      const src = path.join(ROOT, f);
      const dest = path.join(archiveDir, f);
      fs.renameSync(src, dest);
      movedCount++;
    }
  }
  console.log(`[✓] Cleaned up: Archived ${movedCount} legacy spreadsheets to archive/legacy_inventory_sheets/`);
}

main().catch(console.error);
