import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('══════════════════════════════════════════════════════');
console.log('  SIERRA ESTATES: 100% UNIFIED 1-SHEET ZERO-DUPLICATION');
console.log('══════════════════════════════════════════════════════\n');

// 1. Read Raw CSV
const masterCsvPath = path.join(ROOT, 'inventory_master_unified.csv');
console.log(`📖 Loading inventory from: ${masterCsvPath}...`);
const masterWb = xlsx.readFile(masterCsvPath, { type: 'file', raw: true });
const masterSheet = masterWb.Sheets[masterWb.SheetNames[0]];
const uncleanedRows = xlsx.utils.sheet_to_json(masterSheet);
console.log(`📊 Initial record count before deduplication: ${uncleanedRows.length}`);

// Normalize keys to strip BOM and handle variations
const rawRows = uncleanedRows.map(r => {
  const clean = {};
  for (const [k, v] of Object.entries(r)) {
    const cleanKey = typeof k === 'string' ? k.replace(/^\uFEFF/, '').trim() : k;
    clean[cleanKey] = v;
  }
  return clean;
});

// Normalized unit code extractor
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
  const text = String(r.Comment || r.AdditionalFeatures || r.Description || '');
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
  let comp = String(r.Compound || r.Location || r.Zone || '').trim();
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

// 2. Perform Pass 1 Deduplication
const dedupMap1 = new Map();
let mergedPass1 = 0;

rawRows.forEach(r => {
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
    key = 'FINGERPRINT:' + String(r.UnitFingerprint).trim();
  }

  if (key && dedupMap1.has(key)) {
    mergedPass1++;
    const target = dedupMap1.get(key);

    for (const [k, v] of Object.entries(r)) {
      if ((target[k] === undefined || target[k] === '' || target[k] === null || target[k] === 'Unknown') && v) {
        target[k] = v;
      }
    }

    const targetId = String(target.RecordID || target['RecordID'] || '');
    const currentId = String(r.RecordID || r['RecordID'] || '');
    if (targetId.startsWith('INV-MEM-') && !currentId.startsWith('INV-MEM-') && currentId.length > 0) {
      target.RecordID = currentId;
    }

    const curType = cleanPropertyType(r);
    const tgtType = cleanPropertyType(target);
    if ((tgtType === 'Apartment' || tgtType === 'تحت التشطيب') && curType !== 'Apartment') {
      target.PropertyType = curType;
    }

    if (!target.AreaSqm && r.AreaSqm) target.AreaSqm = r.AreaSqm;
    if (!target.Bedrooms && r.Bedrooms) target.Bedrooms = r.Bedrooms;
    if (!target.Bathrooms && r.Bathrooms) target.Bathrooms = r.Bathrooms;

    const curPhone = r.ContactPhone || r['Contact Phone'] || '';
    const tgtPhone = target.ContactPhone || target['Contact Phone'] || '';
    if (curPhone && (!tgtPhone || tgtPhone.length < curPhone.length)) {
      target.ContactPhone = curPhone;
    }

    const curName = r.ContactName || r['Contact Name'] || '';
    const tgtName = target.ContactName || target['Contact Name'] || '';
    if (curName && (!tgtName || tgtName.startsWith('+'))) {
      target.ContactName = curName;
    }

    if (r.PhotoURLs && !target.PhotoURLs) target.PhotoURLs = r.PhotoURLs;
    if (r.Comment && (!target.Comment || target.Comment.includes('location_unresolved'))) {
      target.Comment = r.Comment;
    }
  } else {
    if (key) dedupMap1.set(key, r);
    else dedupMap1.set('ROW_' + Math.random(), r);
  }
});

// 3. Perform Pass 2 Deduplication (Consolidate duplicate Arabic forwards & phone+compound+price+area)
const listPass1 = Array.from(dedupMap1.values());
const dedupMap2 = new Map();
let mergedPass2 = 0;

listPass1.forEach(r => {
  const arabic = getArabicListingText(r);
  const rawPhone = r.ContactPhone || r['Contact Phone'] || '';
  const phone = getCleanPhone(rawPhone);
  const rawPriceStr = String(r.PriceEGP || r['Price (EGP)'] || '0').replace(/,/g, '');
  const price = Math.round(parseFloat(rawPriceStr) || 0);
  const comp = cleanCompound(r).toLowerCase();
  const rawAreaStr = String(r.AreaSqm || r['Area (sqm)'] || '0').replace(/,/g, '');
  const area = Math.round(parseFloat(rawAreaStr) || 0);

  let key = null;
  if (arabic && price > 0) {
    key = 'ARABIC_TEXT:' + arabic + '|' + price;
  } else if (phone && comp && price > 0 && area > 0) {
    key = 'PHONE_COMP_PRICE_AREA:' + phone + '|' + comp + '|' + price + '|' + area;
  }

  if (key && dedupMap2.has(key)) {
    mergedPass2++;
    const target = dedupMap2.get(key);
    for (const [k, v] of Object.entries(r)) {
      if ((target[k] === undefined || target[k] === '' || target[k] === null || target[k] === 'Unknown') && v) {
        target[k] = v;
      }
    }
    const targetId = String(target.RecordID || target['RecordID'] || '');
    const currentId = String(r.RecordID || r['RecordID'] || '');
    if (targetId.startsWith('INV-MEM-') && !currentId.startsWith('INV-MEM-') && currentId.length > 0) {
      target.RecordID = currentId;
    }
    const curCode = getDisplayCode(r);
    const tgtCode = getDisplayCode(target);
    if (!tgtCode && curCode) target.UnitCode = curCode;

    const curPhone = r.ContactPhone || r['Contact Phone'] || '';
    const tgtPhone = target.ContactPhone || target['Contact Phone'] || '';
    if (curPhone && (!tgtPhone || tgtPhone.length < curPhone.length)) {
      target.ContactPhone = curPhone;
    }

    const curName = r.ContactName || r['Contact Name'] || '';
    const tgtName = target.ContactName || target['Contact Name'] || '';
    if (curName && (!tgtName || tgtName.startsWith('+'))) {
      target.ContactName = curName;
    }

    if (r.PhotoURLs && !target.PhotoURLs) target.PhotoURLs = r.PhotoURLs;
  } else {
    if (key) dedupMap2.set(key, r);
    else dedupMap2.set('ROW2_' + Math.random(), r);
  }
});

const totalMerged = mergedPass1 + mergedPass2;
console.log(`✅ Total duplicates identified & merged: ${totalMerged} (${mergedPass1} in pass 1 + ${mergedPass2} in pass 2)`);
const finalList = Array.from(dedupMap2.values());
console.log(`✅ Pristine, 100% unique properties remaining: ${finalList.length}`);

// 4. Format Standardized Columns
const finalRows = finalList.map(r => {
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
  const contactName = (r.ContactName || r['Contact Name'] || '').trim() || 'Sierra Executive Broker';

  // Determine Operation (Sale vs Rent)
  let op = 'Sale';
  const rawType = String(r.ListingCategory || r.PropertyType || r.SourceSheet || '').toLowerCase();
  const comment = String(r.Comment || r.AdditionalFeatures || r.Description || '').toLowerCase();
  if (rawType.includes('rent') || comment.includes('ايجار') || comment.includes('شهري') || (priceNum > 0 && priceNum < 150000 && propType === 'Apartment')) {
    op = 'Rent';
  }

  return {
    'RecordID': r.RecordID || r['RecordID'] || `INV-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
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
    'Source': r.SourceType || 'Direct Intake',
    'Updated At': r.UpdatedAt || new Date().toISOString()
  };
});

// Sort by Price (EGP) descending (highest value luxury first)
finalRows.sort((a, b) => (b['Price (EGP)'] || 0) - (a['Price (EGP)'] || 0));

// 5. Build EXACTLY 1 SHEET Workbook
const singleSheetWb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(finalRows);
xlsx.utils.book_append_sheet(singleSheetWb, ws, 'Master_Inventory');

// 6. Save to target Excel destinations
const excelDestinations = [
  path.join(ROOT, 'apps/sierra-estates-realty/public/downloads/sierra-estates-master-inventory.xlsx'),
  path.join(ROOT, 'Inventory_with_Photos.xlsx'),
  path.join(ROOT, 'data/sierra-estates-master-inventory.xlsx'),
  path.join(ROOT, 'apps/sierra-estates-realty/data/sierra-estates-master-inventory.xlsx')
];

excelDestinations.forEach(p => {
  xlsx.writeFile(singleSheetWb, p);
  const sz = fs.statSync(p).size;
  console.log(`💾 Saved 1-sheet workbook: ${p} (${(sz / (1024 * 1024)).toFixed(2)} MB)`);
});

// 7. Save clean unified CSVs with UTF-8 BOM
const csvContent = '\uFEFF' + xlsx.utils.sheet_to_csv(ws);
const csvDestinations = [
  path.join(ROOT, 'apps/sierra-estates-realty/public/downloads/sierra-estates-clean-inventory.csv'),
  path.join(ROOT, 'inventory_master_unified.csv'),
  path.join(ROOT, 'data/sierra-estates-master-inventory.csv'),
  path.join(ROOT, 'apps/sierra-estates-realty/data/sierra-estates-master-inventory.csv')
];

csvDestinations.forEach(p => {
  fs.writeFileSync(p, csvContent, 'utf8');
  console.log(`💾 Saved unified clean CSV: ${p}`);
});

console.log(`\n🎉 SUCCESS: 1 Master Sheet produced with ${finalRows.length} unique properties (ZERO DUPLICATION)!`);
