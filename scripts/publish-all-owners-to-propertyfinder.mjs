/**
 * publish-all-owners-to-propertyfinder.mjs
 * ─────────────────────────────────────────
 * Reads ALL Direct Owner units (Rent + Resale) from the master consolidated
 * workbook, injects photos from existing PF feeds, and publishes as PF ads:
 *
 *   1. propertyfinder-owners-full.xml      <- PF XML feed (all owner units)
 *   2. propertyfinder-owners-full.csv      <- Portal upload CSV
 *   3. propertyfinder-owners-missing-photos.csv <- Units needing photos
 *
 * Usage:
 *   node scripts/publish-all-owners-to-propertyfinder.mjs
 *   node scripts/publish-all-owners-to-propertyfinder.mjs --dry-run
 *   node scripts/publish-all-owners-to-propertyfinder.mjs --available-only
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// CLI flags
const DRY_RUN = process.argv.includes('--dry-run');
const AVAILABLE_ONLY = process.argv.includes('--available-only');

// Config
const WORKBOOK = path.join(ROOT, 'data', 'Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx');
const OUT_DIR  = path.join(ROOT, 'apps', 'sierra-estates-realty', 'public', 'feeds');

const SKIP_AVAILABILITY = new Set(['not available', 'sold', 'rented', 'cancelled', 'not_available']);

/**
 * loadExistingPhotos() — scans existing PF feed XMLs + CSV for all photo URLs.
 * Returns Map<reference_number, string[]> and Map<phone_suffix, string[]>
 * so we can match owner units by ref OR by phone.
 */
function loadExistingPhotos() {
  const byRef   = new Map(); // ref -> [url, ...]
  const byPhone = new Map(); // last-9-digits-of-phone -> [url, ...]

  const feedDir = path.join(ROOT, 'apps', 'sierra-estates-realty', 'public', 'feeds');
  const xmlFiles = ['propertyfinder-photos-only.xml', 'propertyfinder-feed.xml'];

  for (const fname of xmlFiles) {
    const fpath = path.join(feedDir, fname);
    if (!fs.existsSync(fpath)) continue;
    const raw = fs.readFileSync(fpath, 'utf8');
    // parse each <property>...</property> block
    const propMatches = raw.matchAll(/<property[^>]*>([\s\S]*?)<\/property>/g);
    for (const pm of propMatches) {
      const block = pm[1];
      const refMatch = block.match(/<reference_number[^>]*>([^<]+)<\/reference_number>/);
      const phoneMatch = block.match(/<phone[^>]*>([^<]+)<\/phone>/);
      // extract all http URLs from <url>...</url> tags
      const urls = [...block.matchAll(/<url[^>]*>([^<]+)<\/url>/g)]
        .map(m => m[1].trim())
        .filter(u => u.startsWith('http'));
      if (!urls.length) continue;
      if (refMatch) {
        const ref = refMatch[1].trim();
        byRef.set(ref, [...(byRef.get(ref) || []), ...urls]);
      }
      if (phoneMatch) {
        const phone = phoneMatch[1].trim().replace(/[^0-9]/g, '').slice(-9);
        if (phone) byPhone.set(phone, [...(byPhone.get(phone) || []), ...urls]);
      }
    }
  }

  // Also scan the portal CSV for Photo URL columns
  const csvFile = path.join(feedDir, 'propertyfinder-photos-only.csv');
  if (fs.existsSync(csvFile)) {
    const lines = fs.readFileSync(csvFile, 'utf8').split(/\r?\n/);
    const headers = lines[0]?.split(',').map(h => h.replace(/^"|"$/g, '').replace(/^\uFEFF/, ''));
    const photoIdxs = headers?.map((h, i) => h.startsWith('Photo URL') ? i : -1).filter(i => i >= 0) ?? [];
    const refIdx = headers?.indexOf('Reference') ?? -1;
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''));
      const ref = refIdx >= 0 ? cols[refIdx] : null;
      const urls = photoIdxs.map(i => cols[i]).filter(u => u && u.startsWith('http'));
      if (urls.length && ref) byRef.set(ref, [...(byRef.get(ref) || []), ...urls]);
    }
  }

  // deduplicate
  for (const [k, v] of byRef) byRef.set(k, [...new Set(v)]);
  for (const [k, v] of byPhone) byPhone.set(k, [...new Set(v)]);

  const total = byRef.size;
  console.log(`  Loaded ${total} refs with photos from existing feeds.`);
  return { byRef, byPhone };
}

// PF type mappers
function mapOfferingType(dealType, sheetType) {
  const d = String(dealType || sheetType || '').toLowerCase();
  if (d.includes('rent') || d.includes('ايجار') || d.includes('rent')) return 'RR';
  return 'RS';
}

function mapPropertyType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('villa') || t.includes('standalone')) return 'VH';
  if (t.includes('townhouse') || t.includes('town house') || t.includes('town')) return 'TH';
  if (t.includes('twinhouse') || t.includes('twin')) return 'TW';
  if (t.includes('penthouse') || t.includes('roof')) return 'PH';
  if (t.includes('duplex')) return 'DU';
  if (t.includes('chalet')) return 'CH';
  if (t.includes('commercial') || t.includes('retail') || t.includes('shop')) return 'RE';
  if (t.includes('office')) return 'OF';
  if (t.includes('studio')) return 'ST';
  return 'AP';
}

// Compound normaliser
const COMPOUND_CANONICAL = {
  'rehab': 'Al Rehab', 'al rehab': 'Al Rehab', 'rehab city': 'Al Rehab',
  'madinaty': 'Madinaty',
  'new cairo': 'New Cairo', 'new-cairo': 'New Cairo', 'cairo new': 'New Cairo',
  'hyde park': 'Hyde Park', 'hydepark': 'Hyde Park',
  'mivida': 'Mivida', 'mevida': 'Mivida',
  'mountain view': 'Mountain View iCity', 'mountain view icity': 'Mountain View iCity',
  'palm hills': 'Palm Hills New Cairo',
  'katameya': 'Katameya Heights', 'katamiya': 'Katameya Heights',
  'eastown': 'Eastown', 'east town': 'Eastown',
  // canonical: Up Town Cairo
  'uptown': 'Up Town Cairo', 'up town': 'Up Town Cairo', 'uptown cairo': 'Up Town Cairo',
  'up town cairo': 'Up Town Cairo', 'uptowncairo': 'Up Town Cairo',
  'galleria': 'Galleria Moon Valley', 'moon valley': 'Galleria Moon Valley',
  'galleria moon valley': 'Galleria Moon Valley',
  'el patio': 'El Patio', 'patio': 'El Patio',
  'sarai': 'Sarai',
  'beit el watan': 'Beit El Watan',
  'cairo festival': 'Cairo Festival City', 'cairo festival city': 'Cairo Festival City',
  'andorra': 'Andorra New Cairo',
  'fifth square': 'Fifth Square',
  'lake view': 'Lake View Residence', 'lake view residence': 'Lake View Residence',
  'new capital': 'New Administrative Capital', 'new-capital': 'New Administrative Capital',
};

function normalizeCompound(raw) {
  if (!raw) return null;
  const key = String(raw).toLowerCase().trim();
  return COMPOUND_CANONICAL[key] || String(raw).trim();
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stableRef(category, row) {
  const existing = row['Unit Code'] || row['Code'] || row['Reference Code'] || row['reference_code'];
  if (existing && String(existing).trim()) return String(existing).trim();
  const key = [
    category,
    normalizeCompound(row['Compound / Project'] || row['Compound'] || row['compound']) || '',
    row['Owner Phone'] || row['Phone'] || row['phone'] || '',
    String(row['Monthly Rent (EGP)'] || row['Price (EGP)'] || row['price'] || 0),
    String(row['Area (sqm)'] || row['area_sqm'] || 0),
  ].join('|');
  const hash = crypto.createHash('md5').update(key).digest('hex').slice(0, 10).toUpperCase();
  const prefix = category === 'rent' ? 'OWN-R' : 'OWN-S';
  return `${prefix}-${hash}`;
}

function buildTitle(propType, compound, zone, offeringType) {
  const action = offeringType === 'RR' ? 'for Rent' : 'for Sale';
  const loc = compound || zone || 'New Cairo';
  const pfType = mapPropertyType(propType);
  const typeLabel = {
    VH: 'Villa', TH: 'Townhouse', TW: 'Twin House', PH: 'Penthouse',
    DU: 'Duplex', CH: 'Chalet', RE: 'Commercial Unit', OF: 'Office',
    ST: 'Studio', AP: 'Apartment',
  }[pfType] || 'Property';
  return `${typeLabel} ${action} in ${loc}`;
}

function buildDesc(row, offeringType, compound, zone) {
  const existing = row['Description'] || row['description'];
  if (existing && String(existing).trim().length > 20) return String(existing).trim();
  const beds = row['Bedrooms'] || row['bedrooms'] || '';
  const area = row['Area (sqm)'] || row['area_sqm'] || '';
  const furnish = row['Furnishing'] || row['finishing'] || row['Finishing'] || '';
  const loc = compound || zone || 'New Cairo';
  const action = offeringType === 'RR' ? 'for rent' : 'for sale';
  let desc = `Direct owner unit ${action} in ${loc}, New Cairo.`;
  if (beds) desc += ` ${beds} bedrooms.`;
  if (area) desc += ` Area: ${area} sqm.`;
  if (furnish) desc += ` ${furnish}.`;
  desc += ` No broker fees. Contact Sierra Estates for private viewing: +201092048333.`;
  return desc.trim();
}

function extractPhotos(row) {
  const candidates = [
    row['Photo URLs'], row['Photo URL 1'], row['Photos'], row['Images'],
    row['image_urls'], row['photo_urls'], row['photos'],
  ];
  const urls = [];
  for (const c of candidates) {
    if (!c) continue;
    const parts = String(c).split(/[\n,;|]+/).map(s => s.trim()).filter(s => s.startsWith('http'));
    urls.push(...parts);
  }
  for (let i = 2; i <= 8; i++) {
    const v = row[`Photo URL ${i}`];
    if (v && String(v).trim().startsWith('http')) urls.push(String(v).trim());
  }
  return [...new Set(urls)];
}

function normaliseRent(row) {
  const compound = normalizeCompound(row['Compound / Project'] || row['Compound']);
  const zone = String(row['Zone'] || row['Zone / Area'] || 'New Cairo').trim();
  const avail = String(row['Availability'] || 'Available').toLowerCase().trim();
  return {
    _type: 'rent',
    ref: stableRef('rent', row),
    compound, zone,
    propType: String(row['Property Type'] || 'Apartment').trim(),
    offeringType: 'RR',
    price: Number(String(row['Monthly Rent (EGP)'] || row['price'] || 0).replace(/[^0-9.]/g, '')) || 0,
    area: Number(row['Area (sqm)'] || 0) || 0,
    beds: Number(row['Bedrooms'] || 0) || 0,
    baths: Number(row['Bathrooms'] || 0) || 0,
    furnishing: String(row['Furnishing'] || '').trim(),
    availability: avail,
    isAvailable: !SKIP_AVAILABILITY.has(avail),
    phone: String(row['Owner Phone'] || '').replace(/[^0-9]/g, ''),
    ownerName: String(row['Owner / Contact Name'] || '').trim(),
    sourceHeritage: String(row['Source Heritage'] || '').trim(),
    photos: extractPhotos(row),
    description: row['Description'] || '',
  };
}

function normaliseResale(row) {
  const compound = normalizeCompound(row['Compound'] || row['Compound / Project']);
  const zone = String(row['Zone'] || row['Zone / Area'] || 'New Cairo').trim();
  const avail = String(row['Availability'] || 'Available').toLowerCase().trim();
  return {
    _type: 'resale',
    ref: stableRef('resale', row),
    compound, zone,
    propType: String(row['Property Type'] || 'Apartment').trim(),
    offeringType: 'RS',
    price: Number(String(row['Price (EGP)'] || row['price'] || 0).replace(/[^0-9.]/g, '')) || 0,
    area: Number(row['Area (sqm)'] || 0) || 0,
    beds: Number(row['Bedrooms'] || 0) || 0,
    baths: Number(row['Bathrooms'] || 0) || 0,
    furnishing: String(row['Finishing'] || row['Furnishing'] || '').trim(),
    availability: avail,
    isAvailable: !SKIP_AVAILABILITY.has(avail),
    phone: String(row['Phone'] || '').replace(/[^0-9]/g, ''),
    ownerName: String(row['Owner Name'] || '').trim(),
    sourceHeritage: String(row['Source Heritage'] || '').trim(),
    photos: extractPhotos(row),
    description: row['Description'] || '',
  };
}

const MIN_RENT   = 3000;
const MIN_RESALE = 500000;

function meetsMinimum(unit) {
  if (unit.offeringType === 'RR') return unit.price === 0 || unit.price >= MIN_RENT;
  return unit.price === 0 || unit.price >= MIN_RESALE;
}

function buildPropertyXml(unit) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const compound = unit.compound || unit.zone || '5th Settlement';
  const zone = unit.zone || '5th Settlement';
  const title = buildTitle(unit.propType, compound, zone, unit.offeringType);
  const desc = buildDesc(
    { Description: unit.description, Furnishing: unit.furnishing, Bedrooms: unit.beds, 'Area (sqm)': unit.area, Availability: unit.availability },
    unit.offeringType, compound, zone,
  );
  const pfPropType = mapPropertyType(unit.propType);

  let xml = `  <property last_update="${now}">\n`;
  xml += `    <reference_number>${escapeXml(unit.ref)}</reference_number>\n`;
  xml += `    <offering_type>${unit.offeringType}</offering_type>\n`;
  xml += `    <property_type>${pfPropType}</property_type>\n`;
  xml += `    <price_on_application>${unit.price <= 0 ? '1' : '0'}</price_on_application>\n`;
  if (unit.price > 0) xml += `    <price>${unit.price}</price>\n`;
  if (unit.offeringType === 'RR') xml += `    <rental_period>M</rental_period>\n`;
  xml += `    <currency>EGP</currency>\n`;
  xml += `    <city>Cairo</city>\n`;
  xml += `    <community>${escapeXml(zone)}</community>\n`;
  if (compound && compound !== zone) xml += `    <sub_community>${escapeXml(compound)}</sub_community>\n`;
  xml += `    <title_en><![CDATA[${title}]]></title_en>\n`;
  xml += `    <description_en><![CDATA[${desc}]]></description_en>\n`;
  if (unit.area > 0) xml += `    <size>${unit.area}</size>\n`;
  if (unit.beds > 0) xml += `    <bedroom>${unit.beds}</bedroom>\n`;
  if (unit.baths > 0) xml += `    <bathroom>${unit.baths}</bathroom>\n`;
  if (unit.furnishing) {
    const fl = unit.furnishing.toLowerCase();
    const fval = fl.includes('unfurnish') ? 'unfurnished' : fl.includes('semi') ? 'semi_furnished' : fl.includes('furnished') ? 'furnished' : null;
    if (fval) xml += `    <furnished>${fval}</furnished>\n`;
  }
  xml += `    <agent>\n`;
  xml += `      <name>Sierra Estates</name>\n`;
  xml += `      <email>info@sierra-estates.net</email>\n`;
  xml += `      <phone>+201092048333</phone>\n`;
  xml += `    </agent>\n`;
  if (unit.photos.length > 0) {
    xml += `    <photo>\n`;
    for (const url of unit.photos.slice(0, 20)) {
      xml += `      <url>${escapeXml(url)}</url>\n`;
    }
    xml += `    </photo>\n`;
  }
  xml += `  </property>\n`;
  return xml;
}

function csvStr(s) {
  return `"${String(s ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

function buildCsvRow(unit, photoCount = 8) {
  const compound = unit.compound || unit.zone || '';
  const zone = unit.zone || 'New Cairo';
  const photos = unit.photos.slice(0, photoCount);
  const photoCols = Array.from({ length: photoCount }, (_, i) => csvStr(photos[i] || ''));
  return [
    csvStr(unit.ref),
    csvStr(unit._type === 'rent' ? 'Owners Rent' : 'Owners Resale'),
    csvStr(unit.offeringType),
    csvStr(mapPropertyType(unit.propType)),
    csvStr(compound),
    csvStr(zone),
    unit.price || '',
    csvStr(unit.offeringType === 'RR' ? 'Monthly' : ''),
    unit.beds || '',
    unit.baths || '',
    unit.area || '',
    ...photoCols,
    csvStr(unit.photos.join(' | ')),
    csvStr(buildTitle(unit.propType, compound, zone, unit.offeringType)),
    csvStr(buildDesc({ Description: unit.description, Furnishing: unit.furnishing, Bedrooms: unit.beds, 'Area (sqm)': unit.area }, unit.offeringType, compound, zone)),
  ].join(',');
}

async function main() {
  console.log('\n  Sierra Estates -- All Owners -> Property Finder Publisher');
  console.log(`  Workbook: ${WORKBOOK}`);
  console.log(`  Flags: dry-run=${DRY_RUN} | available-only=${AVAILABLE_ONLY}\n`);

  const wb = loadWorkbook();

  const rentRaw = XLSX.utils.sheet_to_json(wb.Sheets['Direct Owners - Rent'] || {});
  const rentUnits = rentRaw.map(normaliseRent);

  const resaleRaw = XLSX.utils.sheet_to_json(wb.Sheets['Direct Owners - Resale'] || {});
  const resaleUnits = resaleRaw.map(normaliseResale);

  const allUnits = [...rentUnits, ...resaleUnits];
  console.log(`Raw totals: ${rentUnits.length} Owners Rent + ${resaleUnits.length} Owners Resale = ${allUnits.length} total`);

  // Inject existing photos from PF feeds
  console.log(`  Loading existing photos from PF feeds...`);
  const { byRef, byPhone } = loadExistingPhotos();
  let injectedCount = 0;
  for (const unit of allUnits) {
    if (unit.photos.length > 0) continue; // already has photos
    // match by stable ref first
    if (byRef.has(unit.ref)) {
      unit.photos = byRef.get(unit.ref);
      injectedCount++;
      continue;
    }
    // fallback: match by last 9 digits of phone
    const phoneSuffix = unit.phone.slice(-9);
    if (phoneSuffix && byPhone.has(phoneSuffix)) {
      unit.photos = byPhone.get(phoneSuffix);
      injectedCount++;
    }
  }
  console.log(`  Injected photos into ${injectedCount} units from existing feeds.\n`);

  const available = allUnits.filter(u => u.isAvailable);
  const filtered = AVAILABLE_ONLY ? available : allUnits;
  const publishable = filtered.filter(u => (u.compound || u.zone) && u.phone);
  const priceFiltered = publishable.filter(meetsMinimum);

  console.log(`Available: ${available.length} | With compound+phone: ${publishable.length} | Meet price minimum: ${priceFiltered.length}`);

  const withPhotos    = priceFiltered.filter(u => u.photos.length > 0);
  const missingPhotos = priceFiltered.filter(u => u.photos.length === 0);

  console.log(`With photos: ${withPhotos.length} | Missing photos: ${missingPhotos.length}\n`);


  // Compound stats
  const compoundStats = {};
  for (const u of priceFiltered) {
    const c = u.compound || u.zone || 'Unknown';
    if (!compoundStats[c]) compoundStats[c] = { rent: 0, resale: 0, withPhotos: 0 };
    if (u._type === 'rent') compoundStats[c].rent++;
    else compoundStats[c].resale++;
    if (u.photos.length > 0) compoundStats[c].withPhotos++;
  }

  const topCompounds = Object.entries(compoundStats)
    .sort((a, b) => (b[1].rent + b[1].resale) - (a[1].rent + a[1].resale))
    .slice(0, 15);

  console.log('Top compounds (publishable units):');
  for (const [name, s] of topCompounds) {
    console.log(`  ${name.padEnd(30)} Rent: ${String(s.rent).padStart(4)} | Resale: ${String(s.resale).padStart(4)} | Photos: ${String(s.withPhotos).padStart(4)}`);
  }
  console.log();

  if (DRY_RUN) {
    console.log('\nDRY RUN -- no files written.');
    console.log(`  Would generate:`);
    console.log(`    propertyfinder-owners-full.xml     (${priceFiltered.length} listings)`);
    console.log(`    propertyfinder-owners-full.csv     (${priceFiltered.length} listings)`);
    console.log(`    propertyfinder-owners-missing-photos.csv (${missingPhotos.length} listings)`);
    return;
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1. Full XML Feed
  const xmlPath = path.join(OUT_DIR, 'propertyfinder-owners-full.xml');
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<!-- Sierra Estates -- Direct Owners Property Finder Feed -->\n`;
  xml += `<!-- Generated: ${new Date().toISOString()} | Units: ${priceFiltered.length} -->\n`;
  xml += `<list last_update="${new Date().toISOString()}">\n`;
  for (const unit of priceFiltered) {
    xml += buildPropertyXml(unit);
  }
  xml += `</list>\n`;
  fs.writeFileSync(xmlPath, xml, 'utf8');
  console.log(`[OK] XML Feed -> ${xmlPath} (${priceFiltered.length} listings, ${(fs.statSync(xmlPath).size / 1024).toFixed(1)} KB)`);

  // 2. Portal CSV
  const csvPath = path.join(OUT_DIR, 'propertyfinder-owners-full.csv');
  const MAX_PHOTOS = 8;
  const photoHeaders = Array.from({ length: MAX_PHOTOS }, (_, i) => `Photo URL ${i + 1}`);
  const csvHeaders = [
    'Reference', 'Category', 'Offering Type', 'Property Type',
    'Compound', 'Community / Zone', 'Price (EGP)', 'Rental Period',
    'Bedrooms', 'Bathrooms', 'Area (sqm)',
    ...photoHeaders,
    'All Photo URLs', 'Title (EN)', 'Description (EN)',
  ];
  const csvRows = [csvHeaders.join(',')];
  for (const unit of priceFiltered) {
    csvRows.push(buildCsvRow(unit, MAX_PHOTOS));
  }
  fs.writeFileSync(csvPath, '\uFEFF' + csvRows.join('\n'), 'utf8');
  console.log(`[OK] Portal CSV -> ${csvPath} (${priceFiltered.length} listings)`);

  // 3. Missing Photos Report
  const missingPath = path.join(OUT_DIR, 'propertyfinder-owners-missing-photos.csv');
  const missingHeaders = ['Reference', 'Type', 'Compound', 'Zone', 'Price (EGP)', 'Beds', 'Area', 'Owner Phone', 'Availability', 'Source'];
  const missingRows = [missingHeaders.join(',')];
  for (const u of missingPhotos) {
    missingRows.push([
      csvStr(u.ref),
      csvStr(u._type),
      csvStr(u.compound || ''),
      csvStr(u.zone || ''),
      u.price || '',
      u.beds || '',
      u.area || '',
      csvStr(u.phone || ''),
      csvStr(u.availability),
      csvStr(u.sourceHeritage.split('+')[0].trim()),
    ].join(','));
  }
  fs.writeFileSync(missingPath, '\uFEFF' + missingRows.join('\n'), 'utf8');
  console.log(`[OK] Missing Photos Report -> ${missingPath} (${missingPhotos.length} units need photos)`);

  // Final summary
  console.log('\n' + '-'.repeat(60));
  console.log('DONE -- Property Finder Owner Feed Published');
  console.log('-'.repeat(60));
  console.log(`  Total owners in workbook:         ${allUnits.length}`);
  console.log(`  Available:                        ${available.length}`);
  console.log(`  Publishable (compound + phone):   ${publishable.length}`);
  console.log(`  Meet PF price minimum:            ${priceFiltered.length}`);
  console.log(`  -> With photos (ready to submit): ${withPhotos.length}`);
  console.log(`  -> Missing photos (need harvest): ${missingPhotos.length}`);
  console.log(`\n  Upload CSV at:`);
  console.log(`  https://propertyfinder.eg/dashboard -> Listings -> Bulk Upload\n`);
}

function loadWorkbook() {
  if (!fs.existsSync(WORKBOOK)) {
    console.error(`ERROR: Workbook not found: ${WORKBOOK}`);
    process.exit(1);
  }
  return XLSX.readFile(WORKBOOK);
}

main().catch(err => { console.error(err); process.exit(1); });
