import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('═════════════════════════════════════════════════════════════════════════');
console.log('  SIERRA ESTATES: 5-SHEET SEGREGATED MASTER INVENTORY GENERATOR          ');
console.log('  [Owners Rent] | [Owners Buy] | [Broker Rent] | [Broker Buy] | [Unknown]');
console.log('═════════════════════════════════════════════════════════════════════════\n');

// 1. Read Raw Catalog
const masterCsvPath = path.join(ROOT, 'Inventory_with_Photos_Airtable.csv');
console.log(`📖 Loading raw master catalog from: ${masterCsvPath}...`);
const masterWb = xlsx.readFile(masterCsvPath, { type: 'file', raw: true });
const masterSheet = masterWb.Sheets[masterWb.SheetNames[0]];
const uncleanedRows = xlsx.utils.sheet_to_json(masterSheet);
console.log(`📊 Initial raw records: ${uncleanedRows.length}`);

// Normalize keys to strip any BOM
const rawRows = uncleanedRows.map(r => {
  const clean = {};
  for (const [k, v] of Object.entries(r)) {
    const cleanKey = typeof k === 'string' ? k.replace(/^\uFEFF/, '').trim() : k;
    clean[cleanKey] = v;
  }
  return clean;
});

// Classification Logic
function getParty(r) {
  const sheet = String(r.SourceSheet || '').trim().toLowerCase();
  const ob = String(r.OwnerBroker || r.SourceType || '').trim().toLowerCase();
  const desc = String(r.Comment || r.AdditionalFeatures || '').toLowerCase();
  const contact = String(r.ContactName || '').toLowerCase();

  // Explicit Owner
  if (sheet.startsWith('owners') || sheet.includes('owners-') || sheet.includes('owner') ||
      ob.includes('direct owner') || ob.includes('owners') || ob.includes('from owner') ||
      desc.includes('من المالك') || desc.includes('مالك مباشر') || desc.includes('direct owner')) {
    return 'Owner';
  }

  // Explicit Broker
  if (sheet.includes('chat with') || sheet.includes('ovak') || sheet.includes('h. house') ||
      sheet.includes('broker') || sheet.includes('east twon') ||
      ob.includes('network') || ob.includes('elite brokers') || ob.includes('agency') ||
      contact.includes('broker') || contact.includes('advisor') ||
      desc.includes('بروكر') || desc.includes('عمولة')) {
    return 'Broker';
  }

  return 'Unknown';
}

function getOperation(r) {
  const sheet = String(r.SourceSheet || '').toLowerCase();
  const cat = String(r.ListingCategory || r.PropertyType || '').toLowerCase();
  const desc = String(r.Comment || r.AdditionalFeatures || '').toLowerCase();
  const price = parseFloat(String(r.PriceEGP || '0').replace(/,/g, '')) || 0;

  if (sheet.includes('rent') || sheet.includes('ايجار') || sheet.includes('إيجار') || sheet.includes('ايجارات') ||
      cat.includes('rent') || cat.includes('ايجار') ||
      desc.includes('للايجار') || desc.includes('ايجار') || desc.includes('شهريا') || desc.includes('شهري') ||
      (price > 0 && price <= 250000 && !desc.includes('مقدم') && !sheet.includes('resale') && !sheet.includes('sale'))) {
    return 'Rent';
  }
  return 'Buy';
}

function normCode(str) {
  if (!str) return null;
  const s = String(str).trim();
  let m = s.match(/code:\s*([A-Za-z0-9\-\.\+\_\s]+?)(?:\||$)/i);
  if (!m) m = s.match(/CODE\|([A-Za-z0-9\-\.\+\_\s]+?)(?:\||$)/i);
  if (!m) m = s.match(/\b([A-Z]{2,5}\-[A-Z0-9\-\.\+\_\s]{3,})\b/i);
  if (m) {
    const raw = m[1].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (raw.length >= 4) return raw;
  }
  const clean = s.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length >= 4 && clean.length <= 20 && /[0-9]/.test(clean) && /[A-Z]/.test(clean)) {
    return clean;
  }
  return null;
}

function getDisplayCode(r) {
  const add = r.AdditionalFeatures || r.features || '';
  const comment = r.Comment || r.Description || '';
  const fp = r.UnitFingerprint || '';
  const direct = r.UnitCode || '';
  if (direct && direct.length >= 3) return direct;
  
  const m1 = String(add).match(/code:\s*([A-Za-z0-9\-\.\+\_]+)/i);
  if (m1) return m1[1].trim().toUpperCase();
  const m2 = String(comment).match(/code:\s*([A-Za-z0-9\-\.\+\_]+)/i);
  if (m2) return m2[1].trim().toUpperCase();
  if (fp && String(fp).startsWith('CODE|')) {
    return String(fp).replace('CODE|', '').trim().replace(/\s+/g, '-').toUpperCase();
  }
  const m3 = String(add).match(/\b([A-Z]{2,5}\-[A-Z0-9\-\.\+\_]{3,})\b/i);
  if (m3) return m3[1].trim().toUpperCase();
  const m4 = String(comment).match(/\b([A-Z]{2,5}\-[A-Z0-9\-\.\+\_]{3,})\b/i);
  if (m4) return m4[1].trim().toUpperCase();
  return '';
}

function getArabicListingText(r) {
  const text = String(r.Comment || r.AdditionalFeatures || '');
  if (text.includes('location_unresolved') || text.includes('availability_not_explicit') || text.includes('price evidence')) {
    return null;
  }
  if (/[\u0600-\u06FF]/.test(text) && text.length > 20) {
    return text.slice(0, 70).replace(/[\s\r\n\t]+/g, ' ').trim().toLowerCase();
  }
  return null;
}

function getCleanPhone(phone) {
  if (!phone) return null;
  const p = String(phone).replace(/[^0-9]/g, '');
  if (p.length >= 9) return p.slice(-9);
  return null;
}

function formatWhatsAppLink(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.length >= 10) {
    let clean = digits;
    if (clean.startsWith('01')) clean = '20' + clean.slice(1);
    else if (!clean.startsWith('20') && clean.length === 10) clean = '20' + clean;
    return `https://wa.me/${clean}`;
  }
  return '';
}

function cleanCompound(r) {
  let comp = String(r.Location || r.Zone || '').trim();
  if (comp.includes('(')) comp = comp.replace(/\(.*?\)/g, '').trim();
  const lower = comp.toLowerCase();
  if (lower.includes('rehab')) return 'Al Rehab';
  if (lower.includes('mivida')) return 'Mivida';
  if (lower.includes('madinaty')) return 'Madinaty';
  if (lower.includes('hyde park')) return 'Hyde Park';
  if (lower.includes('eastown')) return 'Eastown';
  if (lower.includes('villette')) return 'Villette';
  if (lower.includes('badya')) return 'Badya';
  if (lower.includes('swan lake')) return 'Swan Lake';
  if (lower.includes('fifth square')) return 'Fifth Square';
  if (lower.includes('new cairo')) return 'New Cairo';
  return comp || 'New Cairo Prime';
}

function cleanPropertyType(r) {
  let t = String(r.PropertyType || '').trim();
  const lower = t.toLowerCase();
  if (lower.includes('standalone') || lower.includes('villa')) return 'Standalone Villa';
  if (lower.includes('penthouse')) return 'Penthouse';
  if (lower.includes('duplex')) return 'Duplex';
  if (lower.includes('townhouse') || lower.includes('town house')) return 'Townhouse';
  if (lower.includes('twinhouse') || lower.includes('twin house')) return 'Twin House';
  if (lower.includes('apartment') || lower.includes('flat')) return 'Apartment';
  if (lower.includes('chalet')) return 'Chalet';
  if (lower.includes('office') || lower.includes('clinic')) return 'Commercial / Office';
  return t || 'Apartment';
}

// Deduplicate function for each partitioned bucket
function deduplicateBucket(items, defaultOperation) {
  const map = new Map();
  items.forEach(r => {
    const code = normCode(r.AdditionalFeatures) || normCode(r.Comment) || normCode(r.UnitFingerprint) || normCode(r.UnitCode);
    const arabic = getArabicListingText(r);
    const rawPhone = r.ContactPhone || r['Contact Phone'] || '';
    const phone = getCleanPhone(rawPhone);
    const rawPriceStr = String(r.PriceEGP || r['Price (EGP)'] || '0').replace(/,/g, '');
    const price = Math.round(parseFloat(rawPriceStr) || 0);
    const loc = cleanCompound(r).toLowerCase();

    let key = null;
    if (code) {
      key = 'CODE:' + code;
    } else if (arabic && price > 0) {
      key = 'ARABIC:' + arabic + '|' + price;
    } else if (phone && loc && price > 0) {
      key = 'PHONE_LOC_PRICE:' + phone + '|' + loc + '|' + price;
    } else if (r.UnitFingerprint && String(r.UnitFingerprint).startsWith('SIG|')) {
      key = 'FP:' + String(r.UnitFingerprint).trim();
    }

    if (key && map.has(key)) {
      const target = map.get(key);
      for (const [k, v] of Object.entries(r)) {
        if ((target[k] === undefined || target[k] === '' || target[k] === null || target[k] === 'Unknown') && v) {
          target[k] = v;
        }
      }
      const targetId = String(target.RecordID || '');
      const currentId = String(r.RecordID || '');
      if (targetId.startsWith('INV-MEM-') && !currentId.startsWith('INV-MEM-') && currentId.length > 0) {
        target.RecordID = currentId;
      }
      if (r.PhotoURLs && !target.PhotoURLs) target.PhotoURLs = r.PhotoURLs;
      if (r.ContactPhone && (!target.ContactPhone || target.ContactPhone.length < r.ContactPhone.length)) {
        target.ContactPhone = r.ContactPhone;
      }
      if (r.ContactName && (!target.ContactName || target.ContactName.startsWith('+'))) {
        target.ContactName = r.ContactName;
      }
    } else {
      if (key) map.set(key, r);
      else map.set('ROW_' + Math.random(), r);
    }
  });

  const uniqueItems = Array.from(map.values());

  // Format into standardized final columns
  const formatted = uniqueItems.map(r => {
    const rawPriceStr = String(r.PriceEGP || r['Price (EGP)'] || '0').replace(/,/g, '');
    const priceNum = parseFloat(rawPriceStr) || 0;
    const rawAreaStr = String(r.AreaSqm || r['Area (sqm)'] || '0').replace(/,/g, '');
    const areaNum = parseFloat(rawAreaStr) || 0;
    const bedNum = parseInt(String(r.Bedrooms || '0'), 10) || '';
    const bathNum = parseInt(String(r.Bathrooms || '0'), 10) || '';
    const code = getDisplayCode(r);
    const compound = cleanCompound(r);
    const propType = cleanPropertyType(r);
    const phone = (r.ContactPhone || r['Contact Phone'] || '').trim();
    const contactName = (r.ContactName || r['Contact Name'] || '').trim() || 'Sierra Executive Contact';

    const op = defaultOperation || getOperation(r);

    return {
      'RecordID': r.RecordID || `INV-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      'UnitCode': code,
      'Compound': compound,
      'Location': r.Location || compound,
      'Zone': r.Zone || compound,
      'PropertyType': propType,
      'Operation': op,
      'Price (EGP)': priceNum,
      'Price Formatted': priceNum > 0 ? `${priceNum.toLocaleString()} EGP` : 'Price on Call',
      'Area (sqm)': areaNum > 0 ? areaNum : '',
      'Bedrooms': bedNum,
      'Bathrooms': bathNum,
      'Furnishing': r.Furnished || 'Standard',
      'Contact Name': contactName,
      'Contact Phone': phone,
      'WhatsApp Direct': formatWhatsAppLink(phone),
      'Inventory Status': r.InventoryStatus || 'Available',
      'Photo Match Status': r.PhotoMatchStatus || 'Catalog Photo Verified',
      'Photo URLs': r.PhotoURLs || '',
      'Description': r.Comment || r.AdditionalFeatures || r.Description || '',
      'Source': r.SourceSheet || r.SourceType || 'Verified Inventory',
      'Updated At': r.UpdatedAt || new Date().toISOString()
    };
  });

  // Sort by Price descending (highest value first)
  formatted.sort((a, b) => (b['Price (EGP)'] || 0) - (a['Price (EGP)'] || 0));
  return formatted;
}

// Partition rows into the 5 requested buckets
const buckets = {
  'Owners_Rent': [],
  'Owners_Buy': [],
  'Broker_Rent': [],
  'Broker_Buy': [],
  'Unknown_Broker_Owner': []
};

rawRows.forEach(r => {
  const party = getParty(r);
  const op = getOperation(r);
  if (party === 'Owner') {
    if (op === 'Rent') buckets['Owners_Rent'].push(r);
    else buckets['Owners_Buy'].push(r);
  } else if (party === 'Broker') {
    if (op === 'Rent') buckets['Broker_Rent'].push(r);
    else buckets['Broker_Buy'].push(r);
  } else {
    buckets['Unknown_Broker_Owner'].push(r);
  }
});

// Deduplicate and process each of the 5 buckets
const processedSheets = {
  'Owners_Rent': deduplicateBucket(buckets['Owners_Rent'], 'Rent'),
  'Owners_Buy': deduplicateBucket(buckets['Owners_Buy'], 'Buy'),
  'Broker_Rent': deduplicateBucket(buckets['Broker_Rent'], 'Rent'),
  'Broker_Buy': deduplicateBucket(buckets['Broker_Buy'], 'Buy'),
  'Unknown_Broker_Owner': deduplicateBucket(buckets['Unknown_Broker_Owner'], null)
};

console.log('✅ 5-Sheet Partitioning & Deduplication Results:');
console.log(`   1. Owners Rent             : ${processedSheets['Owners_Rent'].length} units`);
console.log(`   2. Owners Buy              : ${processedSheets['Owners_Buy'].length} units`);
console.log(`   3. Broker Rent             : ${processedSheets['Broker_Rent'].length} units`);
console.log(`   4. Broker Buy              : ${processedSheets['Broker_Buy'].length} units`);
console.log(`   5. Unknown Broker or Owner : ${processedSheets['Unknown_Broker_Owner'].length} units`);

const totalAll = processedSheets['Owners_Rent'].length + 
                 processedSheets['Owners_Buy'].length + 
                 processedSheets['Broker_Rent'].length + 
                 processedSheets['Broker_Buy'].length +
                 processedSheets['Unknown_Broker_Owner'].length;
console.log(`   Total Unique Across All 5 Sheets: ${totalAll} units\n`);

// 3. Assemble 5-Sheet Excel Workbook
const multiSheetWb = xlsx.utils.book_new();

const sheetConfig = [
  { key: 'Owners_Rent', title: 'Owners Rent' },
  { key: 'Owners_Buy', title: 'Owners Buy' },
  { key: 'Broker_Rent', title: 'Broker Rent' },
  { key: 'Broker_Buy', title: 'Broker Buy' },
  { key: 'Unknown_Broker_Owner', title: 'Unknown Broker or Owner' }
];

sheetConfig.forEach(({ key, title }) => {
  const ws = xlsx.utils.json_to_sheet(processedSheets[key]);
  xlsx.utils.book_append_sheet(multiSheetWb, ws, title);
});

// Save 5-Sheet Excel Workbook
const masterXlsxPath = path.join(ROOT, 'apps/sierra-estates-realty/public/downloads/sierra-estates-master-inventory.xlsx');
const rootXlsxPath = path.join(ROOT, 'Inventory_with_Photos.xlsx');

xlsx.writeFile(multiSheetWb, masterXlsxPath);
xlsx.writeFile(multiSheetWb, rootXlsxPath);
console.log(`💾 Saved 5-sheet Excel workbook → ${masterXlsxPath} (${(fs.statSync(masterXlsxPath).size / (1024 * 1024)).toFixed(2)} MB)`);
console.log(`💾 Saved 5-sheet Excel workbook → ${rootXlsxPath}`);

// 4. Export Individual Segment CSVs & Individual XLSX files
const downloadsDir = path.join(ROOT, 'apps/sierra-estates-realty/public/downloads');

sheetConfig.forEach(({ key, title }) => {
  const data = processedSheets[key];
  const ws = xlsx.utils.json_to_sheet(data);
  const slug = key.toLowerCase().replace(/_/g, '-');
  
  // Individual CSV
  const csvContent = '\uFEFF' + xlsx.utils.sheet_to_csv(ws);
  const csvFile = path.join(downloadsDir, `sierra-estates-${slug}.csv`);
  fs.writeFileSync(csvFile, csvContent, 'utf8');
  console.log(`   ✓ Exported individual CSV  → ${path.basename(csvFile)} (${(fs.statSync(csvFile).size / 1024).toFixed(1)} KB)`);

  // Individual single-sheet XLSX
  const singleWb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(singleWb, ws, title);
  const singleXlsx = path.join(downloadsDir, `sierra-estates-${slug}.xlsx`);
  xlsx.writeFile(singleWb, singleXlsx);
  console.log(`   ✓ Exported individual XLSX → ${path.basename(singleXlsx)} (${(fs.statSync(singleXlsx).size / 1024).toFixed(1)} KB)`);
});

// 5. Keep Full Combined Clean CSV
const allRowsCombined = [
  ...processedSheets['Owners_Rent'],
  ...processedSheets['Owners_Buy'],
  ...processedSheets['Broker_Rent'],
  ...processedSheets['Broker_Buy'],
  ...processedSheets['Unknown_Broker_Owner']
];
const combinedWs = xlsx.utils.json_to_sheet(allRowsCombined);
const combinedCsvContent = '\uFEFF' + xlsx.utils.sheet_to_csv(combinedWs);
fs.writeFileSync(path.join(downloadsDir, 'sierra-estates-clean-inventory.csv'), combinedCsvContent, 'utf8');
fs.writeFileSync(path.join(ROOT, 'inventory_master_unified.csv'), combinedCsvContent, 'utf8');
console.log(`💾 Synced full combined CSVs (${allRowsCombined.length} properties)`);

console.log('\n🎉 Successfully rebuilt master inventory into 5 dedicated sheets including Unknown Broker or Owner!');
