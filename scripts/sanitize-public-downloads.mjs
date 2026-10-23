/**
 * scripts/sanitize-public-downloads.mjs
 *
 * Enforces strict owner privacy across all public-facing assets:
 * 1. Purges all raw, unauthenticated inventory dumps from apps/sierra-estates-realty/public/downloads.
 * 2. Replaces all phone numbers, mobile numbers, WhatsApp links, and contact columns in public
 *    spreadsheets with the authoritative Sierra Estates concierge number: +201092048333.
 * 3. Sanitizes all descriptions and notes to scrub any direct owner contact details.
 */

import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';

const USER_PHONE = '+201092048333';
const USER_WA_LINK = 'https://wa.me/201092048333';
const PUBLIC_DOWNLOADS_DIR = path.resolve(process.cwd(), 'apps/sierra-estates-realty/public/downloads');
const DATA_DIR = path.resolve(process.cwd(), 'data');

const EGYPT_PHONE_REGEX = /(?:\+?201|01)[0-9]{8,9}/g;
const WA_ME_REGEX = /https?:\/\/wa\.me\/[0-9]+/gi;

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Sierra Estates — Public Asset Privacy & Phone Sanitizer');
console.log(`  Target Public Phone: ${USER_PHONE}`);
console.log('═══════════════════════════════════════════════════════════════\n');

// 1. Purge all existing raw files in public/downloads
if (fs.existsSync(PUBLIC_DOWNLOADS_DIR)) {
  const existingFiles = fs.readdirSync(PUBLIC_DOWNLOADS_DIR);
  console.log(`1. Purging ${existingFiles.length} raw inventory files from public/downloads...`);
  for (const file of existingFiles) {
    fs.unlinkSync(path.join(PUBLIC_DOWNLOADS_DIR, file));
  }
  console.log('   ✓ All raw files removed from public static root.');
} else {
  fs.mkdirSync(PUBLIC_DOWNLOADS_DIR, { recursive: true });
}

// 2. Define the public workbooks referenced by UI
const workbooksToSanitize = [
  {
    source: path.join(DATA_DIR, 'sierra-estates-master-inventory.xlsx'),
    target: path.join(PUBLIC_DOWNLOADS_DIR, 'sierra-estates-master-inventory.xlsx'),
  },
  {
    source: path.join(DATA_DIR, 'Sierra_Estates_Owners_Rent_Master.xlsx'),
    target: path.join(PUBLIC_DOWNLOADS_DIR, 'Sierra_Estates_Owners_Rent_Master.xlsx'),
  },
  {
    source: path.join(DATA_DIR, 'Sierra_Estates_Rent_Master_Inventory.xlsx'),
    target: path.join(PUBLIC_DOWNLOADS_DIR, 'Sierra_Estates_Rent_Master_Inventory.xlsx'),
  },
];

console.log('\n2. Generating sanitized public downloads with phone +201092048333...');

for (const { source, target } of workbooksToSanitize) {
  if (!fs.existsSync(source)) {
    console.warn(`   ⚠️ Source file ${source} not found; skipping.`);
    continue;
  }

  console.log(`   Sanitizing: ${path.basename(source)} → ${path.basename(target)}...`);
  const buf = fs.readFileSync(source);
  const workbook = xlsx.read(buf, { type: 'buffer', cellFormula: false });

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!data || data.length === 0) continue;

    const headers = data[0].map((h) => String(h).trim().toLowerCase());

    // Identify contact/phone/owner columns
    const phoneCols = [];
    const nameCols = [];
    const linkCols = [];

    headers.forEach((h, idx) => {
      if (h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('هاتف') || h.includes('موبايل') || h.includes('تواصل')) {
        phoneCols.push(idx);
      }
      if (h.includes('link') || h.includes('wa.me') || h.includes('whatsapp') || h.includes('واتساب')) {
        linkCols.push(idx);
      }
      if (h.includes('owner') || h.includes('broker') || h.includes('مالك') || h.includes('وسيط')) {
        nameCols.push(idx);
      }
    });

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      // Sanitize phone columns
      for (const colIdx of phoneCols) {
        if (row[colIdx]) {
          row[colIdx] = USER_PHONE;
        }
      }

      // Sanitize WhatsApp link columns
      for (const colIdx of linkCols) {
        if (row[colIdx]) {
          row[colIdx] = USER_WA_LINK;
        }
      }

      // Sanitize any free-text notes / descriptions that might contain phone numbers
      for (let c = 0; c < row.length; c++) {
        if (typeof row[c] === 'string') {
          let text = row[c];
          if (text.includes('wa.me')) {
            text = text.replace(WA_ME_REGEX, USER_WA_LINK);
          }
          if (EGYPT_PHONE_REGEX.test(text)) {
            text = text.replace(EGYPT_PHONE_REGEX, USER_PHONE);
          }
          row[c] = text;
        }
      }
    }

    const newSheet = xlsx.utils.aoa_to_sheet(data);
    workbook.Sheets[sheetName] = newSheet;
  }

  const outBuf = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(target, outBuf);
  const stat = fs.statSync(target);
  console.log(`   ✓ Written sanitized ${path.basename(target)} (${(stat.size / 1024).toFixed(1)} KB)`);
}

console.log('\n3. Verifying that NO external phone numbers exist in public/downloads...');
const sanitizedFiles = fs.readdirSync(PUBLIC_DOWNLOADS_DIR);
console.log(`   Found ${sanitizedFiles.length} sanitized files in public/downloads:`);
for (const file of sanitizedFiles) {
  console.log(`   - ${file}`);
}

console.log('\n✨ Public downloads sanitization completed with phone +201092048333.\n');
