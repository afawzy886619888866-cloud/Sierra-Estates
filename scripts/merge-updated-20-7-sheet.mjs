import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ARCHIVE = path.join(ROOT, 'archive', 'legacy_inventory_sheets');

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// ─── Utility Helpers ─────────────────────────────────────────────────────────

function clean(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function normalizeArabicDigits(str) {
  return String(str || '')
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9');
}

function parsePrice(val) {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') {
    if (val > 0 && val < 500) return Math.round(val * 1_000_000);
    return val;
  }
  const s = normalizeArabicDigits(clean(val));
  if (!s) return 0;

  if (/مليون|million|\bm\b/i.test(s)) {
    const numPart = parseFloat(s.replace(/,/g, '').replace(/[^\d.]/g, ''));
    return Number.isFinite(numPart) ? Math.round(numPart * 1_000_000) : 0;
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    return Number(s.replace(/\./g, ''));
  }
  const cleaned = s.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  if (n > 0 && n < 500) return Math.round(n * 1_000_000);
  return Math.round(n);
}

function parseNum(val) {
  if (val === undefined || val === null) return 0;
  const s = normalizeArabicDigits(clean(val)).replace(/,/g, '').replace(/[^\d.-]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDeal(deal) {
  const d = clean(deal).toLowerCase();
  if (d.includes('rent') || d.includes('ايجار') || d.includes('إيجار') || d.includes('تم الايجار')) return 'rent';
  return 'resale';
}

function normalizePhone(v) {
  if (!v) return '';
  const d = normalizeArabicDigits(clean(v)).replace(/\D/g, '');
  if (!d) return '';
  let p = d;
  if (p.startsWith('20') && p.length >= 12) p = p.slice(2);
  if (p.length === 10 && p.startsWith('1')) p = '0' + p;
  return p.length === 11 && p.startsWith('01') ? p : (d.length >= 8 ? d : '');
}

function extractRoomsAndBaths(text) {
  if (!text) return { beds: 0, baths: 0, area: 0 };
  const normalized = normalizeArabicDigits(text);

  let beds = 0;
  if (/غرفتين|نومين/i.test(normalized)) beds = 2;
  else if (/ثلاث(?:\s*غرف|\s*نوم)/i.test(normalized)) beds = 3;
  else if (/أربع(?:\s*غرف|\s*نوم)|اربع(?:\s*غرف|\s*نوم)/i.test(normalized)) beds = 4;
  else {
    const m = normalized.match(/(\d+)\s*(?:غرف|غرفة|غرفه|نوم|beds?|bd)/i);
    if (m) beds = parseInt(m[1], 10);
  }

  let baths = 0;
  if (/حمامين/i.test(normalized)) baths = 2;
  else if (/ثلاث(?:\s*حمامات|\s*حمام)/i.test(normalized)) baths = 3;
  else {
    const m = normalized.match(/(\d+)\s*(?:حمامات|حمام|baths?|ba)/i);
    if (m) baths = parseInt(m[1], 10);
  }

  let area = 0;
  const areaMatch = normalized.match(/(\d+)\s*(?:متر|م²|m2|sqm)/i);
  if (areaMatch) area = parseInt(areaMatch[1], 10);

  return { beds, baths, area };
}

function normalizeCompound(c) {
  const lower = clean(c).toLowerCase();
  if (!lower || lower === 'new cairo' || lower === 'التجمع' || lower === 'other compound') return 'New Cairo';
  if (lower.includes('madinaty') || lower.includes('مدينت')) return 'Madinaty';
  if (lower.includes('rehab') || lower.includes('الرحاب')) return 'Al Rehab';
  if (lower.includes('mivida') || lower.includes('mevida') || lower.includes('ميفيدا')) return 'Mivida';
  if (lower.includes('hyde park') || lower.includes('هايد بارك')) return 'Hyde Park';
  if (lower.includes('mountain view') || lower.includes('ماونتن فيو')) return 'Mountain View';
  if (lower.includes('villette') || lower.includes('فيليت')) return 'Villette';
  if (lower.includes('palm hills') || lower.includes('بالم هيلز')) return 'Palm Hills';
  if (lower.includes('eastown') || lower.includes('ايست تاون')) return 'Eastown';
  if (lower.includes('swan lake') || lower.includes('سوان ليك')) return 'Swan Lake';
  if (lower.includes('katameya') || lower.includes('قطامية') || lower.includes('dunes')) return 'Katameya Dunes';
  if (lower.includes('andlos') || lower.includes('andalus') || lower.includes('الاندلس')) return 'Al Andalus';
  if (lower.includes('shorouk') || lower.includes('الشروق')) return 'El Shorouk';
  if (lower.includes('cfc') || lower.includes('cairo festival') || lower.includes('كايرو فيستيفال')) return 'Cairo Festival City';
  if (lower.includes('fifth square') || lower.includes('فيفت سكوير')) return 'Fifth Square';
  if (lower.includes('lake view') || lower.includes('ليك فيو')) return 'Lake View';
  if (lower.includes('village gate')) return 'The Village Gate';
  if (lower.includes('arbela') || lower.includes('ارابيلا')) return 'Arabella';
  if (lower.includes('uptown') || lower.includes('اب تاون')) return 'Uptown Cairo';
  return clean(c);
}

function normalizePropType(t) {
  const lower = clean(t).toLowerCase();
  if (lower.includes('villa') || lower.includes('فيلا') || lower.includes('vills') || lower.includes('standalone')) return 'Villa';
  if (lower.includes('townhouse') || lower.includes('تاون')) return 'Townhouse';
  if (lower.includes('twinhouse') || lower.includes('twin') || lower.includes('توين')) return 'Twin House';
  if (lower.includes('penthouse') || lower.includes('بنتهاوس') || lower.includes('roof')) return 'Penthouse';
  if (lower.includes('duplex') || lower.includes('دوبلكس')) return 'Duplex';
  if (lower.includes('chalet') || lower.includes('شاليه')) return 'Chalet';
  if (lower.includes('garden') || lower.includes('ارضي بجاردن') || lower.includes('floor with garden')) return 'Apartment with Garden';
  return 'Apartment';
}

function normalizeChannel(source, contact) {
  const s = (clean(source) + ' ' + clean(contact)).toLowerCase();
  if (s.includes('broker') || s.includes('سمسار') || s.includes('وسيط') || s.includes('team alpha')) return 'broker';
  return 'owner';
}

// ─── Canonical Listing Constructor ──────────────────────────────────────────

function toCanonicalItem(row, defaultDeal, defaultSource, sourceChannelName) {
  const rawCode = clean(row['Unit Code'] || row['Code'] || row['الكود'] || row['Reference Code'] || row['ref_id'] || row['Record ID'] || row['BNA865']);
  const rawCompound = clean(row['Compound'] || row['Compound / Community'] || row['Location '] || row['Location'] || row['الكمبوند'] || row['الموقع (الكمبوند)'] || row['compound'] || row['New Cairo']);
  const compound = normalizeCompound(rawCompound);
  const rawType = clean(row['Property Type'] || row['PropertyType'] || row['Property Tybe'] || row['نوع الوحده'] || row['نوع العقار'] || row['Type'] || row['Apartment']);
  const propType = normalizePropType(rawType);
  const rawDeal = clean(row['Deal Type'] || row['Operation'] || row['بيع/ ايجار'] || row['العملية'] || row['Type'] || row['rent'] || defaultDeal);
  const dealType = normalizeDeal(rawDeal);

  const price = parsePrice(row['Price (EGP)'] || row['Price'] || row['Monthly Rent (EGP)'] || row['Unit Price'] || row['السعر'] || row['السعر_1'] || row['السعر (EGP)'] || row['65,000'] || row['price']);
  let area = parseNum(row['Area (sqm)'] || row['Area'] || row['Space'] || row['المساحه'] || row['المساحة'] || row['area_sqm']);
  let beds = parseNum(row['Bedrooms'] || row['bedrooms'] || row['الغرف'] || row['rooms'] || row['beds']);
  let baths = parseNum(row['Bathrooms'] || row['bathrooms'] || row['الحمامات'] || row['baths']);

  const detailsText = clean(row['تفاصيل الوحده'] || row['بيان الواتساب'] || row['Comment'] || row['Description'] || row['Listing Notes'] || row['Farida']);
  if (detailsText) {
    const extracted = extractRoomsAndBaths(detailsText);
    if (!beds && extracted.beds) beds = extracted.beds;
    if (!baths && extracted.baths) baths = extracted.baths;
    if (!area && extracted.area) area = extracted.area;
  }

  const phone = normalizePhone(row['Contact Phone'] || row['Owner Phone'] || row['Mobile'] || row['تليفون'] || row['Phone'] || row['2.01115E+11'] || row['owner_phone']);
  const name = clean(row['Contact Name'] || row['Owner / Contact Name'] || row['Name'] || row['اسم السيلز'] || row['المرسل'] || row['اسما جابر'] || row['owner_name']);
  const status = clean(row['Listing Status'] || row['Inventory Status'] || row['Status'] || row['Availablty'] || row['متاحه /غير متاحه'] || row['status']) || 'Available';
  const furnishing = clean(row['Furnishing'] || row['Furnishing Status'] || row['Furnished or not'] || row['التشطيب'] || row['finishing_type'] || row['Furnished']);
  const desc = detailsText || clean(row['Listing Description / Notes'] || row['Description'] || row['notes']);
  let photos = clean(row['Photo URLs'] || row['Photo URL'] || row['Photos'] || row['Images'] || row['images'] || row['photos']);
  if (Array.isArray(row['images'])) photos = row['images'].join('\n');
  if (Array.isArray(row['photos'])) photos = row['photos'].join('\n');

  const garden = parseNum(row['Garden'] || row['garden']);
  const pool = clean(row['Pool'] || row['pool']);

  const stableCode = rawCode || (phone && price ? `SE-${phone.slice(-6)}-${dealType.toUpperCase()}` : `SE-${Math.abs(price).toString(36)}-${Math.trunc(area).toString(36)}`.toUpperCase());

  return {
    'Reference Code': stableCode,
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
    'WhatsApp Direct': phone.length >= 10 ? `https://wa.me/20${phone.slice(-10)}` : '',
    'Photo URLs': photos,
    'Source Channel': sourceChannelName || defaultSource,
    'Description': desc,
    'Garden (sqm)': garden || 0,
    'Pool': pool || '',
  };
}

// ─── Fingerprint for Smart Deduplication ─────────────────────────────────────

function computeKeys(item) {
  const keys = [];
  const code = clean(item['Reference Code']).toUpperCase();
  const phone = normalizePhone(item['Contact Phone']);
  const compound = clean(item['Compound']).toLowerCase();
  const deal = clean(item['Deal Type']).toLowerCase();
  const price = item['Price (EGP)'] || 0;
  const area = item['Area (sqm)'] || 0;
  const beds = item['Bedrooms'] || 0;
  const type = clean(item['Property Type']).toLowerCase();

  if (code && code.length > 3 && !['NULL', 'UNDEFINED', 'NADA'].includes(code)) {
    keys.push(`CODE:${code}`);
  }
  if (phone && phone.length >= 8) {
    if (compound && compound !== 'new cairo') {
      keys.push(`PH_CMP_DEAL:${phone}|${compound}|${deal}`);
    }
    if (price > 0) {
      keys.push(`PH_PRICE:${phone}|${price}`);
    }
  }
  if (compound && price > 0 && area > 0) {
    keys.push(`ATTR:${compound}|${type}|${deal}|${beds}|${area}|${price}`);
  }
  return keys;
}

// ─── Smart Merge / Enrichment Function ───────────────────────────────────────

function mergeListing(target, incoming, incomingIsNewer) {
  if (incomingIsNewer) {
    // Incoming is updated: update price, status, contact, etc.
    if (incoming['Price (EGP)'] > 0) target['Price (EGP)'] = incoming['Price (EGP)'];
    if (incoming['Listing Status'] && incoming['Listing Status'] !== 'Available') {
      target['Listing Status'] = incoming['Listing Status'];
    }
    if (incoming['Contact Name']) target['Contact Name'] = incoming['Contact Name'];
    if (incoming['Contact Phone']) {
      target['Contact Phone'] = incoming['Contact Phone'];
      target['WhatsApp Direct'] = incoming['WhatsApp Direct'];
    }
    if (incoming['Furnishing']) target['Furnishing'] = incoming['Furnishing'];
    if (incoming['Compound'] && incoming['Compound'] !== 'New Cairo') target['Compound'] = incoming['Compound'];
    if (incoming['Description'] && incoming['Description'].length > clean(target['Description']).length) {
      target['Description'] = incoming['Description'];
    }
  }

  // Backfill any missing/sparse fields in target from incoming
  if (!target['Bedrooms'] && incoming['Bedrooms']) target['Bedrooms'] = incoming['Bedrooms'];
  if (!target['Bathrooms'] && incoming['Bathrooms']) target['Bathrooms'] = incoming['Bathrooms'];
  if (!target['Area (sqm)'] && incoming['Area (sqm)']) target['Area (sqm)'] = incoming['Area (sqm)'];
  if (!target['Price (EGP)'] && incoming['Price (EGP)']) target['Price (EGP)'] = incoming['Price (EGP)'];
  if ((!target['Photo URLs'] || !target['Photo URLs'].includes('http')) && incoming['Photo URLs']) {
    target['Photo URLs'] = incoming['Photo URLs'];
  }
  if (!target['Garden (sqm)'] && incoming['Garden (sqm)']) target['Garden (sqm)'] = incoming['Garden (sqm)'];
  if (!target['Pool'] && incoming['Pool']) target['Pool'] = incoming['Pool'];
  if (target['Compound'] === 'New Cairo' && incoming['Compound'] && incoming['Compound'] !== 'New Cairo') {
    target['Compound'] = incoming['Compound'];
  }
  if (!target['Description'] && incoming['Description']) target['Description'] = incoming['Description'];
}

// ─── Main Execution ─────────────────────────────────────────────────────────

async function runMerge20_7() {
  console.log('═════════════════════════════════════════════════════════════════════');
  console.log('  SIERRA ESTATES: MASTER INVENTORY MERGE (UPDATED 20-7 SHEET)');
  console.log('═════════════════════════════════════════════════════════════════════\n');

  const p20_7 = path.join(ARCHIVE, '20-7-2026.xlsx');
  if (!fs.existsSync(p20_7)) {
    throw new Error(`Target sheet not found at: ${p20_7}`);
  }

  // Master Registries
  const rentOwners = new Map();     // primaryKey -> CanonicalItem
  const resaleOwners = new Map();   // primaryKey -> CanonicalItem
  const rentBrokers = new Map();    // primaryKey -> CanonicalItem
  const resaleBrokers = new Map();  // primaryKey -> CanonicalItem

  // Inverted Index: keyString -> primaryKey (for cross-key deduplication)
  const keyToPrimary = new Map();

  let totalUpdated20_7Processed = 0;
  let enrichedCount = 0;
  let newlyAdded20_7 = 0;

  function registerListing(item, isNewerPriority) {
    const keys = computeKeys(item);
    let matchedPrimary = null;

    for (const k of keys) {
      if (keyToPrimary.has(k)) {
        matchedPrimary = keyToPrimary.get(k);
        break;
      }
    }

    const isRent = item['Deal Type'] === 'Rent';
    const isOwner = normalizeChannel(item['Source Channel'], item['Contact Name']) === 'owner';
    const targetMap = isRent ? (isOwner ? rentOwners : rentBrokers) : (isOwner ? resaleOwners : resaleBrokers);

    if (matchedPrimary) {
      // Find where matchedPrimary resides across all 4 maps
      const existing = rentOwners.get(matchedPrimary) || resaleOwners.get(matchedPrimary) || rentBrokers.get(matchedPrimary) || resaleBrokers.get(matchedPrimary);
      if (existing) {
        mergeListing(existing, item, isNewerPriority);
        enrichedCount++;
        // Associate any new keys with this primary
        for (const k of keys) keyToPrimary.set(k, matchedPrimary);
        return existing;
      }
    }

    // New unique listing
    const primaryKey = keys[0] || `AUTO:${item['Reference Code']}`;
    targetMap.set(primaryKey, item);
    for (const k of keys) keyToPrimary.set(k, primaryKey);
    if (isNewerPriority) newlyAdded20_7++;
    return item;
  }

  // ── STEP 1: LOAD UPDATED 20-7-2026.xlsx AS PRIMARY AUTHORITATIVE SOURCE ─────
  console.log('📖 [1/3] Ingesting updated 20-7-2026.xlsx with highest priority...');
  const wb20_7 = XLSX.readFile(p20_7);

  // 1a. Owners-Rent (320 rows)
  if (wb20_7.Sheets['Owners-Rent']) {
    const rows = XLSX.utils.sheet_to_json(wb20_7.Sheets['Owners-Rent']);
    for (const r of rows) {
      const item = toCanonicalItem(r, 'rent', 'owner', 'Direct Owner (20-7 Update)');
      registerListing(item, true);
      totalUpdated20_7Processed++;
    }
    console.log(`   • Owners-Rent: ${rows.length} rows processed.`);
  }

  // 1b. Owners-Resale (167 rows)
  if (wb20_7.Sheets['Owners-Resale ']) {
    const rows = XLSX.utils.sheet_to_json(wb20_7.Sheets['Owners-Resale ']);
    for (const r of rows) {
      const item = toCanonicalItem(r, 'resale', 'owner', 'Direct Owner (20-7 Update)');
      registerListing(item, true);
      totalUpdated20_7Processed++;
    }
    console.log(`   • Owners-Resale: ${rows.length} rows processed.`);
  }

  // 1c. Available Properties (67 rows)
  if (wb20_7.Sheets['Available Properties']) {
    const rows = XLSX.utils.sheet_to_json(wb20_7.Sheets['Available Properties']);
    for (const r of rows) {
      const isRent = String(r['Type'] || '').toLowerCase().includes('rent');
      const item = toCanonicalItem(r, isRent ? 'rent' : 'resale', 'owner', 'Direct Owner (20-7 Available)');
      item['Listing Status'] = 'Available';
      registerListing(item, true);
      totalUpdated20_7Processed++;
    }
    console.log(`   • Available Properties: ${rows.length} rows processed.`);
  }

  // 1d. Not Available Properties (56 rows)
  if (wb20_7.Sheets['Not Available Properties']) {
    const rows = XLSX.utils.sheet_to_json(wb20_7.Sheets['Not Available Properties']);
    for (const r of rows) {
      const isRent = String(r['Type'] || '').toLowerCase().includes('rent');
      const item = toCanonicalItem(r, isRent ? 'rent' : 'resale', 'owner', 'Direct Owner (20-7 Archived)');
      item['Listing Status'] = clean(r['Availablty']) || 'Unavailable';
      registerListing(item, true);
      totalUpdated20_7Processed++;
    }
    console.log(`   • Not Available Properties: ${rows.length} rows processed.`);
  }

  // 1e. Brokers Rent (42 raw / 14 data rows)
  if (wb20_7.Sheets['Brokers Rent']) {
    const rawRows = XLSX.utils.sheet_to_json(wb20_7.Sheets['Brokers Rent'], { header: 1 });
    let brokerRentCount = 0;
    for (const row of rawRows) {
      if (!row || row.length < 5) continue;
      // Skip empty or invalid lines
      const phone = normalizePhone(row[3]);
      const price = parsePrice(row[6]);
      if (!phone && !price) continue;

      const item = {
        'Reference Code': clean(row[4]) || `SE-BR-${phone.slice(-6)}`,
        'Compound': normalizeCompound(row[5]),
        'Zone / Area': 'New Cairo',
        'Property Type': normalizePropType(row[11] || 'Apartment'),
        'Deal Type': 'Rent',
        'Price (EGP)': price,
        'Area (sqm)': 0,
        'Bedrooms': 0,
        'Bathrooms': 0,
        'Furnishing': clean(row[10]),
        'Listing Status': 'Available',
        'Contact Name': clean(row[2]),
        'Contact Phone': phone,
        'WhatsApp Direct': phone.length >= 10 ? `https://wa.me/20${phone.slice(-10)}` : '',
        'Photo URLs': '',
        'Source Channel': 'Broker Network (20-7 Update)',
        'Description': clean(row[9] || row[7]),
        'Garden (sqm)': 0,
        'Pool': '',
      };
      // Extract rooms/baths if row[9] has rich details
      const ext = extractRoomsAndBaths(item['Description']);
      if (ext.beds) item['Bedrooms'] = ext.beds;
      if (ext.baths) item['Bathrooms'] = ext.baths;
      if (ext.area) item['Area (sqm)'] = ext.area;

      registerListing(item, true);
      brokerRentCount++;
      totalUpdated20_7Processed++;
    }
    console.log(`   • Brokers Rent: ${brokerRentCount} valid rows processed.`);
  }

  // 1f. Team Units (102 rows)
  if (wb20_7.Sheets['Team Units']) {
    const rows = XLSX.utils.sheet_to_json(wb20_7.Sheets['Team Units']);
    for (const r of rows) {
      const isRent = String(r['العملية'] || 'Rent').toLowerCase().includes('rent');
      const item = {
        'Reference Code': `SE-TU-${Math.abs(parsePrice(r['السعر (EGP)'])).toString(36)}-${Math.trunc(parseNum(r['المساحة'])).toString(36)}`.toUpperCase(),
        'Compound': normalizeCompound(r['الموقع (الكمبوند)']),
        'Zone / Area': 'New Cairo',
        'Property Type': normalizePropType(r['نوع العقار']),
        'Deal Type': isRent ? 'Rent' : 'Resale',
        'Price (EGP)': parsePrice(r['السعر (EGP)']),
        'Area (sqm)': parseNum(r['المساحة']),
        'Bedrooms': parseNum(r['الغرف']),
        'Bathrooms': parseNum(r['الحمامات']),
        'Furnishing': '',
        'Listing Status': 'Available',
        'Contact Name': clean(r['المرسل']),
        'Contact Phone': '',
        'WhatsApp Direct': '',
        'Photo URLs': '',
        'Source Channel': `Team Agency Units (${clean(r['اسم الجروب']) || 'Internal'})`,
        'Description': `Team harvested unit by ${clean(r['المرسل'])} in ${clean(r['الموقع (الكمبوند)'])}`,
        'Garden (sqm)': 0,
        'Pool': '',
      };
      registerListing(item, true);
      totalUpdated20_7Processed++;
    }
    console.log(`   • Team Units: ${rows.length} rows processed.`);
  }

  console.log(`\n✅ Completed Step 1: ${totalUpdated20_7Processed} rows processed from 20-7-2026.xlsx.`);
  console.log(`   Current Unique Owners: Rent=${rentOwners.size}, Resale=${resaleOwners.size}`);

  // ── STEP 2: MERGE HISTORICAL BASELINE & ENRICH SPARSE FIELDS ─────────────────
  console.log('\n📖 [2/3] Merging historical baseline sheets and back-filling sparse fields...');

  // 2a. Primary Owners Workbook
  const primaryOwnersWb = path.join(ARCHIVE, 'Sierra_Estates_Owners_Units_Rent_and_Resale.xlsx');
  if (fs.existsSync(primaryOwnersWb)) {
    const wb = XLSX.readFile(primaryOwnersWb);
    for (const sheet of wb.SheetNames) {
      const isRent = sheet.toLowerCase().includes('rent');
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet]);
      for (const r of rows) {
        const item = toCanonicalItem(r, isRent ? 'rent' : 'resale', 'owner', 'Direct Owner Archive');
        registerListing(item, false); // false = historical baseline (don't overwrite newer 20-7 values)
      }
    }
    console.log('   • Merged Sierra_Estates_Owners_Units_Rent_and_Resale.xlsx');
  }

  // 2b. WhatsApp Garden Owners Campaign
  const gardenPath = path.join(ARCHIVE, 'whatsapp_garden_owners_campaign.xlsx');
  if (fs.existsSync(gardenPath)) {
    const wb = XLSX.readFile(gardenPath);
    for (const sheet of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet]);
      for (const r of rows) {
        const item = toCanonicalItem(r, 'resale', 'owner', 'Direct Owner (Garden Campaign)');
        registerListing(item, false);
      }
    }
    console.log('   • Merged whatsapp_garden_owners_campaign.xlsx');
  }

  // 2c. Owners Rent With Photos CSV
  const photosCsvPath = path.join(ARCHIVE, 'owners_rent_with_photos.csv');
  if (fs.existsSync(photosCsvPath)) {
    const wb = XLSX.readFile(photosCsvPath);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    for (const r of rows) {
      const item = toCanonicalItem(r, 'rent', 'owner', 'Direct Owner Intake');
      registerListing(item, false);
    }
    console.log('   • Merged owners_rent_with_photos.csv');
  }

  // 2d. Broker Networks
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
      const isRentDefault = sheet.toLowerCase().includes('rent') || fileName.toLowerCase().includes('rent');

      for (const r of rows) {
        const item = toCanonicalItem(r, isRentDefault ? 'rent' : 'resale', 'broker', 'Broker Network Archive');
        registerListing(item, false);
      }
    }
  }
  console.log('   • Merged all broker network archives.');

  // ── STEP 3: PHOTO CLASSIFICATION & CANONICAL OUTPUT WORKBOOKS ────────────────
  console.log('\n📦 [3/3] Assembling canonical workbooks with verified photos...');

  const photoUnits = {
    ownersRent: [],
    ownersResale: [],
    brokersRent: [],
    brokersResale: [],
  };

  for (const item of rentOwners.values()) {
    if (item['Photo URLs'] && item['Photo URLs'].includes('http')) photoUnits.ownersRent.push(item);
  }
  for (const item of resaleOwners.values()) {
    if (item['Photo URLs'] && item['Photo URLs'].includes('http')) photoUnits.ownersResale.push(item);
  }
  for (const item of rentBrokers.values()) {
    if (item['Photo URLs'] && item['Photo URLs'].includes('http')) photoUnits.brokersRent.push(item);
  }
  for (const item of resaleBrokers.values()) {
    if (item['Photo URLs'] && item['Photo URLs'].includes('http')) photoUnits.brokersResale.push(item);
  }

  const totalOwners = rentOwners.size + resaleOwners.size;
  const totalBrokers = rentBrokers.size + resaleBrokers.size;
  const totalPhotos = photoUnits.ownersRent.length + photoUnits.ownersResale.length + photoUnits.brokersRent.length + photoUnits.brokersResale.length;

  console.log(`\n═════════════════════════════════════════════════════════════════════`);
  console.log(`  MERGED & DEDUPLICATED INVENTORY SUMMARY:`);
  console.log(`  ─────────────────────────────────────────────────────────────────`);
  console.log(`  ✅ REAL DIRECT OWNERS:`);
  console.log(`     - Rent Owners:   ${rentOwners.size} units`);
  console.log(`     - Resale Owners: ${resaleOwners.size} units`);
  console.log(`     - Total Owners:  ${totalOwners} verified direct owners`);
  console.log(`  ─────────────────────────────────────────────────────────────────`);
  console.log(`  🏢 BROKER NETWORK & TEAM LISTINGS:`);
  console.log(`     - Rent Brokers:   ${rentBrokers.size} units`);
  console.log(`     - Resale Brokers: ${resaleBrokers.size} units`);
  console.log(`     - Total Brokers:  ${totalBrokers} units`);
  console.log(`  ─────────────────────────────────────────────────────────────────`);
  console.log(`  📸 UNITS WITH VERIFIED ONLINE PHOTOS:`);
  console.log(`     - Owners Rent:    ${photoUnits.ownersRent.length}`);
  console.log(`     - Owners Resale:  ${photoUnits.ownersResale.length}`);
  console.log(`     - Brokers Rent:   ${photoUnits.brokersRent.length}`);
  console.log(`     - Brokers Resale: ${photoUnits.brokersResale.length}`);
  console.log(`     - Total Photo Ads: ${totalPhotos} units`);
  console.log(`  ─────────────────────────────────────────────────────────────────`);
  console.log(`  🔍 Cross-matched & Enriched records: ${enrichedCount}`);
  console.log(`  ➕ New direct additions from 20-7:   ${newlyAdded20_7}`);
  console.log(`═════════════════════════════════════════════════════════════════════\n`);

  // WORKBOOK 1: Sierra_Estates_Rent_Master.xlsx
  const wbRent = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbRent, XLSX.utils.json_to_sheet(Array.from(rentOwners.values())), 'Direct_Owners');
  XLSX.utils.book_append_sheet(wbRent, XLSX.utils.json_to_sheet(Array.from(rentBrokers.values())), 'Brokers');
  const rentPath = path.join(ROOT, 'Sierra_Estates_Rent_Master.xlsx');
  XLSX.writeFile(wbRent, rentPath);
  console.log(`[✓] Generated ${rentPath}`);

  // WORKBOOK 2: Sierra_Estates_Resale_Master.xlsx
  const wbResale = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbResale, XLSX.utils.json_to_sheet(Array.from(resaleOwners.values())), 'Direct_Owners');
  XLSX.utils.book_append_sheet(wbResale, XLSX.utils.json_to_sheet(Array.from(resaleBrokers.values())), 'Brokers');
  const resalePath = path.join(ROOT, 'Sierra_Estates_Resale_Master.xlsx');
  XLSX.writeFile(wbResale, resalePath);
  console.log(`[✓] Generated ${resalePath}`);

  // WORKBOOK 3: Sierra_Estates_Units_With_Photos.xlsx
  const wbPhotos = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbPhotos, XLSX.utils.json_to_sheet(photoUnits.ownersRent), 'Owners Rent');
  XLSX.utils.book_append_sheet(wbPhotos, XLSX.utils.json_to_sheet(photoUnits.ownersResale), 'Owners Resale');
  XLSX.utils.book_append_sheet(wbPhotos, XLSX.utils.json_to_sheet(photoUnits.brokersRent), 'Brokers Rent');
  XLSX.utils.book_append_sheet(wbPhotos, XLSX.utils.json_to_sheet(photoUnits.brokersResale), 'Brokers Resale');
  const photosPath = path.join(ROOT, 'Sierra_Estates_Units_With_Photos.xlsx');
  XLSX.writeFile(wbPhotos, photosPath);
  console.log(`[✓] Generated ${photosPath}`);

  return {
    rentOwners: rentOwners.size,
    resaleOwners: resaleOwners.size,
    totalOwners,
    rentBrokers: rentBrokers.size,
    resaleBrokers: resaleBrokers.size,
    totalBrokers,
    totalPhotos,
    enrichedCount,
    newlyAdded20_7,
  };
}

runMerge20_7().catch(console.error);
