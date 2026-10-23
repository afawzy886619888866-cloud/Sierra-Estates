import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const USD_RATE = 50; // Standard USD to EGP exchange rate

function formatPriceDisplay(price, dealType) {
  if (!price || price <= 0) return 'Price on Request';
  if (dealType === 'Rent') {
    return `${price.toLocaleString('en-US')} EGP / mo`;
  }
  if (price >= 1_000_000) {
    const millions = (price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 2);
    return `${price.toLocaleString('en-US')} EGP (${millions}M)`;
  }
  return `${price.toLocaleString('en-US')} EGP`;
}

function processRow(row, forcedDeal) {
  let price = Number(row['Price (EGP)']) || 0;
  let deal = forcedDeal || (row['Deal Type'] === 'Rent' ? 'Rent' : 'Resale');
  const desc = String(row['Description'] || '');

  // 1. Detect USD rental pricing (e.g. 500 - 6,000 or description has $ / USD)
  const isUsd = (price >= 400 && price <= 6000) || desc.includes('$') || desc.toLowerCase().includes('usd');
  if (isUsd && price > 0 && price <= 6000) {
    price = Math.round(price * USD_RATE);
  }

  // 2. Cross-category correction based on price range
  if (deal === 'Rent' && price >= 1_000_000) {
    // This is actually a resale unit
    deal = 'Resale';
  } else if (deal === 'Resale' && price >= 7_000 && price <= 300_000) {
    // This is actually a monthly rental unit
    deal = 'Rent';
  }

  // 3. Enforce range boundaries
  if (deal === 'Rent') {
    if (price > 300_000) {
      // Over luxury rent cap -> reclassify to resale
      deal = 'Resale';
    } else if (price > 0 && price < 7_000) {
      // Below rental minimum -> floor at 7,000 EGP
      price = 7_000;
    }
  }

  if (deal === 'Resale') {
    if (price > 0 && price < 500_000) {
      // Invalid resale figure -> Price on Request
      price = 0;
    } else if (price >= 500_000 && price < 1_000_000) {
      // Floor at 1,000,000 EGP minimum per specification
      price = 1_000_000;
    }
  }

  return {
    ...row,
    'Deal Type': deal,
    'Price (EGP)': price,
    'Price Display': formatPriceDisplay(price, deal),
  };
}

async function main() {
  console.log('═════════════════════════════════════════════════════════════════════');
  console.log('  SIERRA ESTATES: PRICE RE-CALIBRATION & VALIDATION');
  console.log('  • Rent Range:   7,000 EGP/mo  to  300,000 EGP/mo');
  console.log('  • Resale Floor: Minimum 1,000,000 EGP (1M)');
  console.log('  • USD Rate:     50 EGP / USD');
  console.log('═════════════════════════════════════════════════════════════════════\n');

  // Load existing workbooks
  const rentWb = XLSX.readFile(path.join(ROOT, 'Sierra_Estates_Rent_Master.xlsx'));
  const resaleWb = XLSX.readFile(path.join(ROOT, 'Sierra_Estates_Resale_Master.xlsx'));
  const photosWb = XLSX.readFile(path.join(ROOT, 'Sierra_Estates_Units_With_Photos.xlsx'));

  const finalRentOwners = [];
  const finalRentBrokers = [];
  const finalResaleOwners = [];
  const finalResaleBrokers = [];

  function addClean(r, isOwner) {
    if (r['Deal Type'] === 'Rent') {
      if (isOwner) finalRentOwners.push(r);
      else finalRentBrokers.push(r);
    } else {
      if (isOwner) finalResaleOwners.push(r);
      else finalResaleBrokers.push(r);
    }
  }

  // 1. Process Rent Master
  for (const s of rentWb.SheetNames) {
    const isOwner = s.toLowerCase().includes('owner');
    const rows = XLSX.utils.sheet_to_json(rentWb.Sheets[s]);
    for (const r of rows) {
      const cleaned = processRow(r, 'Rent');
      addClean(cleaned, isOwner);
    }
  }

  // 2. Process Resale Master
  for (const s of resaleWb.SheetNames) {
    const isOwner = s.toLowerCase().includes('owner');
    const rows = XLSX.utils.sheet_to_json(resaleWb.Sheets[s]);
    for (const r of rows) {
      const cleaned = processRow(r, 'Resale');
      addClean(cleaned, isOwner);
    }
  }

  console.log(`Re-calibrated Inventory Counts:`);
  console.log(`• Rent Master:   Owners = ${finalRentOwners.length} | Brokers = ${finalRentBrokers.length}`);
  console.log(`• Resale Master: Owners = ${finalResaleOwners.length} | Brokers = ${finalResaleBrokers.length}`);

  function safeWrite(wb, targetPath, fallbackName) {
    try {
      XLSX.writeFile(wb, targetPath);
      console.log(`[✓] Updated ${path.basename(targetPath)}`);
      return targetPath;
    } catch (e) {
      if (e.code === 'EBUSY') {
        const alt = path.join(ROOT, fallbackName);
        XLSX.writeFile(wb, alt);
        console.warn(`⚠️ ${path.basename(targetPath)} is currently OPEN in Excel (file locked). Saved clean version to: ${fallbackName}`);
        return alt;
      }
      throw e;
    }
  }

  // Re-write Sierra_Estates_Rent_Master.xlsx
  const newRentWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newRentWb, XLSX.utils.json_to_sheet(finalRentOwners), 'Owners');
  XLSX.utils.book_append_sheet(newRentWb, XLSX.utils.json_to_sheet(finalRentBrokers), 'Brokers');
  safeWrite(newRentWb, path.join(ROOT, 'Sierra_Estates_Rent_Master.xlsx'), 'Sierra_Estates_Rent_Master_Clean.xlsx');

  // Re-write Sierra_Estates_Resale_Master.xlsx
  const newResaleWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newResaleWb, XLSX.utils.json_to_sheet(finalResaleOwners), 'Owners');
  XLSX.utils.book_append_sheet(newResaleWb, XLSX.utils.json_to_sheet(finalResaleBrokers), 'Brokers');
  safeWrite(newResaleWb, path.join(ROOT, 'Sierra_Estates_Resale_Master.xlsx'), 'Sierra_Estates_Resale_Master_Clean.xlsx');

  // 3. Process Sierra_Estates_Units_With_Photos.xlsx
  const newPhotosWb = XLSX.utils.book_new();
  let totalPhotoUnits = 0;
  for (const s of photosWb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(photosWb.Sheets[s]);
    const isRent = s.toLowerCase().includes('rent');
    const cleanedRows = rows.map(r => processRow(r, isRent ? 'Rent' : 'Resale'));
    totalPhotoUnits += cleanedRows.length;
    XLSX.utils.book_append_sheet(newPhotosWb, XLSX.utils.json_to_sheet(cleanedRows), s);
  }
  safeWrite(newPhotosWb, path.join(ROOT, 'Sierra_Estates_Units_With_Photos.xlsx'), 'Sierra_Estates_Units_With_Photos_Clean.xlsx');
  console.log(`[✓] Completed with ${totalPhotoUnits} photo units calibrated.`);
}

main().catch(console.error);
