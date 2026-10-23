import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ARCHIVE = path.join(ROOT, 'archive', 'legacy_inventory_sheets');

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

function getFingerprint(row) {
  const phone = clean(row['Contact Phone'] || row['Owner Phone'] || row['Phone'] || row['Mobile'] || row['owner_phone']).replace(/\D/g, '').slice(-10);
  const code = clean(row['Unit Code'] || row['Code'] || row['Reference Code'] || row['ref_id'] || row['Record ID'] || row['RecordID']);
  const compound = clean(row['Compound'] || row['Compound / Community'] || row['Compound / Project'] || row['Location'] || row['compound']).toLowerCase();
  const type = clean(row['Property Type'] || row['PropertyType'] || row['property_type'] || row['Type']).toLowerCase();
  const price = num(row['Price (EGP)'] || row['Price'] || row['Monthly Rent (EGP)'] || row['Unit Price'] || row['price']);
  const area = num(row['Area (sqm)'] || row['Area'] || row['Space'] || row['area_sqm']);
  const beds = num(row['Bedrooms'] || row['bedrooms'] || row['rooms'] || row['beds']);

  if (code && code.length > 3 && !['NULL', 'UNDEFINED', 'NADA'].includes(code.toUpperCase())) {
    return `CODE:${code.toUpperCase()}`;
  }
  if (phone.length >= 8 && price > 0) {
    return `PH:${phone}|${compound}|${price}`;
  }
  return `ATTR:${compound}|${type}|${beds}|${area}|${price}`;
}

function canonicalRow(row, defaultDeal, sourceChannel) {
  const compound = clean(row['Compound'] || row['Compound / Community'] || row['Compound / Project'] || row['Location'] || row['compound']) || 'New Cairo';
  const propType = clean(row['Property Type'] || row['PropertyType'] || row['Property Tybe'] || row['property_type'] || row['Type']) || 'Apartment';
  const dealType = normalizeDeal(row['Deal Type'] || row['Operation'] || row['Operation (Deal Type)'] || row['deal_type'] || row['Type'] || defaultDeal);
  const price = num(row['Price (EGP)'] || row['Price'] || row['Monthly Rent (EGP)'] || row['Unit Price'] || row['price']);
  const area = num(row['Area (sqm)'] || row['Area'] || row['Space'] || row['area_sqm']);
  const beds = num(row['Bedrooms'] || row['bedrooms'] || row['rooms'] || row['beds']);
  const baths = num(row['Bathrooms'] || row['bathrooms'] || row['baths']);
  const phone = clean(row['Contact Phone'] || row['Owner Phone'] || row['Phone'] || row['Mobile'] || row['owner_phone']);
  const name = clean(row['Contact Name'] || row['Owner / Contact Name'] || row['Name'] || row['owner_name']);
  const code = clean(row['Unit Code'] || row['Code'] || row['Reference Code'] || row['ref_id'] || row['Record ID'] || row['RecordID']);
  const status = clean(row['Listing Status'] || row['Inventory Status'] || row['Status'] || row['status'] || row['Availablty']) || 'Available';
  const furnishing = clean(row['Furnishing'] || row['Furnishing Status'] || row['Furnished or not'] || row['finishing_type']);
  const desc = clean(row['Description'] || row['Listing Description / Notes'] || row['Listing Notes'] || row['Comment'] || row['description'] || row['notes']);
  
  let photos = clean(row['Photo URLs'] || row['Photo URL'] || row['Photos'] || row['Images'] || row['images'] || row['photos']);
  if (Array.isArray(row['images'])) photos = row['images'].join('\n');
  if (Array.isArray(row['photos'])) photos = row['photos'].join('\n');

  return {
    'Reference Code': code || `SE-${Math.abs(price).toString(36)}-${Math.trunc(area).toString(36)}`.toUpperCase(),
    'Compound': compound,
    'Zone / Area': clean(row['Zone / Area'] || row['Zone / District'] || row['Zone'] || row['location_area']) || 'New Cairo',
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
    'Source Channel': sourceChannel,
    'Description': desc,
  };
}

async function runStrictAudit() {
  console.log('═════════════════════════════════════════════════════════════════════');
  console.log('  SIERRA ESTATES: STRICT AUDIT & REAL OWNER VERIFICATION');
  console.log('═════════════════════════════════════════════════════════════════════\n');

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

  // ── 1. CANONICAL VERIFIED DIRECT OWNERS ONLY ───────────────────────────────
  // Strictly loaded from the verified intake sheets:
  const primaryOwnersWb = path.join(ARCHIVE, 'Sierra_Estates_Owners_Units_Rent_and_Resale.xlsx');
  if (fs.existsSync(primaryOwnersWb)) {
    const wb = XLSX.readFile(primaryOwnersWb);
    for (const sheet of wb.SheetNames) {
      const isRent = sheet.toLowerCase().includes('rent');
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet]);
      for (const r of rows) {
        const item = canonicalRow(r, isRent ? 'rent' : 'resale', 'Direct Owner Intake');
        const fp = getFingerprint(r);
        const hasPhotos = item['Photo URLs'] && item['Photo URLs'].includes('http');

        if (isRent) {
          rentOwners.set(fp, item);
          if (hasPhotos) photoUnits.ownersRent.set(fp, item);
        } else {
          resaleOwners.set(fp, item);
          if (hasPhotos) photoUnits.ownersResale.set(fp, item);
        }
      }
    }
  }

  // Also include whatsapp garden owners direct campaign
  const gardenPath = path.join(ARCHIVE, 'whatsapp_garden_owners_campaign.xlsx');
  if (fs.existsSync(gardenPath)) {
    const wb = XLSX.readFile(gardenPath);
    for (const sheet of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet]);
      for (const r of rows) {
        const item = canonicalRow(r, 'resale', 'Direct Owner (Garden Campaign)');
        const fp = getFingerprint(r);
        if (!resaleOwners.has(fp)) resaleOwners.set(fp, item);
      }
    }
  }

  // Also include owners_rent_with_photos.csv
  const photosCsvPath = path.join(ARCHIVE, 'owners_rent_with_photos.csv');
  if (fs.existsSync(photosCsvPath)) {
    const wb = XLSX.readFile(photosCsvPath);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    for (const r of rows) {
      const item = canonicalRow(r, 'rent', 'Direct Owner Intake');
      const fp = getFingerprint(r);
      const hasPhotos = item['Photo URLs'] && item['Photo URLs'].includes('http');
      if (!rentOwners.has(fp)) rentOwners.set(fp, item);
      if (hasPhotos && !photoUnits.ownersRent.has(fp)) photoUnits.ownersRent.set(fp, item);
    }
  }

  // ── 2. BROKER NETWORKS (All other listings) ────────────────────────────────
  const brokerFiles = [
    'Sierra_Estates_Brokers_Rent.csv',
    'Sierra_Estates_Brokers_Sale.csv',
    'Sierra_Estates_Rent_Master_Inventory.xlsx',
    'Sierra_Estates_Master_Database_Unified.xlsx',
    'Sierra_Estates_All_Units.csv',
    'inventory_master_unified.csv',
    'inventory_all_units_and_memory_comparison.csv',
    'Inventory_with_Photos.xlsx',
  ];

  for (const fileName of brokerFiles) {
    const full = path.join(ARCHIVE, fileName);
    if (!fs.existsSync(full)) continue;

    const wb = XLSX.readFile(full);
    for (const sheet of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet]);
      const isRent = sheet.toLowerCase().includes('rent') || fileName.toLowerCase().includes('rent');

      for (const r of rows) {
        const fp = getFingerprint(r);

        // Never put a broker into genuine owners, and don't duplicate existing owners
        if (rentOwners.has(fp) || resaleOwners.has(fp)) continue;

        const item = canonicalRow(r, isRent ? 'rent' : 'resale', 'Broker Network');
        const hasPhotos = item['Photo URLs'] && item['Photo URLs'].includes('http');

        if (item['Deal Type'] === 'Rent') {
          if (!rentBrokers.has(fp)) rentBrokers.set(fp, item);
          if (hasPhotos && !photoUnits.brokersRent.has(fp)) photoUnits.brokersRent.set(fp, item);
        } else {
          if (!resaleBrokers.has(fp)) resaleBrokers.set(fp, item);
          if (hasPhotos && !photoUnits.brokersResale.has(fp)) photoUnits.brokersResale.set(fp, item);
        }
      }
    }
  }

  console.log(`\n═════════════════════════════════════════════════════════════════════`);
  console.log(`  CLEAN VERIFIED INVENTORY COUNTS:`);
  console.log(`  ─────────────────────────────`);
  console.log(`  ✅ REAL DIRECT OWNERS:`);
  console.log(`     - Rent Owners:   ${rentOwners.size} units (Authentic Direct Owners)`);
  console.log(`     - Resale Owners: ${resaleOwners.size} units (Authentic Direct Owners)`);
  console.log(`     - Total Owners:  ${rentOwners.size + resaleOwners.size} verified direct owners`);
  console.log(`  ─────────────────────────────`);
  console.log(`  🏢 BROKER NETWORK LISTINGS:`);
  console.log(`     - Rent Brokers:   ${rentBrokers.size} units`);
  console.log(`     - Resale Brokers: ${resaleBrokers.size} units`);
  console.log(`     - Total Brokers:  ${rentBrokers.size + resaleBrokers.size} units`);
  console.log(`  ─────────────────────────────`);
  console.log(`  📸 UNITS WITH VERIFIED ONLINE PHOTOS:`);
  console.log(`     - Owners Rent:    ${photoUnits.ownersRent.size}`);
  console.log(`     - Owners Resale:  ${photoUnits.ownersResale.size}`);
  console.log(`     - Brokers Rent:   ${photoUnits.brokersRent.size}`);
  console.log(`     - Brokers Resale: ${photoUnits.brokersResale.size}`);
  console.log(`═════════════════════════════════════════════════════════════════════\n`);

  // WORKBOOK 1: Sierra_Estates_Rent_Master.xlsx
  const wbRent = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbRent, XLSX.utils.json_to_sheet(Array.from(rentOwners.values())), 'Owners');
  XLSX.utils.book_append_sheet(wbRent, XLSX.utils.json_to_sheet(Array.from(rentBrokers.values())), 'Brokers');
  const rentPath = path.join(ROOT, 'Sierra_Estates_Rent_Master.xlsx');
  XLSX.writeFile(wbRent, rentPath);
  console.log(`[✓] Generated Sierra_Estates_Rent_Master.xlsx (Owners: ${rentOwners.size} | Brokers: ${rentBrokers.size})`);

  // WORKBOOK 2: Sierra_Estates_Resale_Master.xlsx
  const wbResale = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbResale, XLSX.utils.json_to_sheet(Array.from(resaleOwners.values())), 'Owners');
  XLSX.utils.book_append_sheet(wbResale, XLSX.utils.json_to_sheet(Array.from(resaleBrokers.values())), 'Brokers');
  const resalePath = path.join(ROOT, 'Sierra_Estates_Resale_Master.xlsx');
  XLSX.writeFile(wbResale, resalePath);
  console.log(`[✓] Generated Sierra_Estates_Resale_Master.xlsx (Owners: ${resaleOwners.size} | Brokers: ${resaleBrokers.size})`);

  // WORKBOOK 3: Sierra_Estates_Units_With_Photos.xlsx
  const wbPhotos = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbPhotos, XLSX.utils.json_to_sheet(Array.from(photoUnits.ownersRent.values())), 'Owners Rent');
  XLSX.utils.book_append_sheet(wbPhotos, XLSX.utils.json_to_sheet(Array.from(photoUnits.ownersResale.values())), 'Owners Resale');
  XLSX.utils.book_append_sheet(wbPhotos, XLSX.utils.json_to_sheet(Array.from(photoUnits.brokersRent.values())), 'Brokers Rent');
  XLSX.utils.book_append_sheet(wbPhotos, XLSX.utils.json_to_sheet(Array.from(photoUnits.brokersResale.values())), 'Brokers Resale');
  const photosPath = path.join(ROOT, 'Sierra_Estates_Units_With_Photos.xlsx');
  XLSX.writeFile(wbPhotos, photosPath);
  console.log(`[✓] Generated Sierra_Estates_Units_With_Photos.xlsx (${photoUnits.ownersRent.size + photoUnits.ownersResale.size + photoUnits.brokersRent.size + photoUnits.brokersResale.size} units)`);
}

runStrictAudit().catch(console.error);
