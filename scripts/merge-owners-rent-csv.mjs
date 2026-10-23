#!/usr/bin/env node
/**
 * merge-owners-rent-csv.mjs
 * ─────────────────────────
 * Merges a new "Owners-Rent" CSV (the Google Form / CRM export format) into the
 * existing Sierra_Estates_Owners_Rent_Master.csv.
 *
 * Dedupe: phone (last 10 digits) + unit code. When both match, the record with
 * more filled fields wins; sparse fields from the other row are back-filled.
 * Status is updated if the newer source says "Not available" / "اتباعت".
 *
 * Usage:
 *   node scripts/merge-owners-rent-csv.mjs <path-to-new-csv>
 *   node scripts/merge-owners-rent-csv.mjs <path-to-new-csv> --dry-run
 *
 * Output:
 *   Sierra_Estates_Owners_Rent_Master.csv  (overwritten)
 *   Sierra_Estates_Owners_Rent_Master.xlsx (overwritten)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Papa = require('papaparse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');
const newCsvPath = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]);

if (!newCsvPath) {
  console.error('Usage: node scripts/merge-owners-rent-csv.mjs <path-to-new-csv> [--dry-run]');
  process.exit(1);
}

const MASTER_CSV = path.join(ROOT, 'Sierra_Estates_Owners_Rent_Master.csv');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  SIERRA ESTATES: OWNERS-RENT CSV MERGER');
console.log(`  Master: ${MASTER_CSV}`);
console.log(`  Import: ${newCsvPath}`);
console.log(`  Mode:   ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE MERGE'}`);
console.log('═══════════════════════════════════════════════════════════════\n');

// ── Master CSV columns ──────────────────────────────────────────────────────
const MASTER_COLS = [
  'Unit Code',
  'Compound / Community',
  'Zone / Area',
  'Property Type',
  'Monthly Rent (EGP)',
  'Rent Display',
  'Area (sqm)',
  'Bedrooms',
  'Bathrooms',
  'Furnishing',
  'Owner / Contact Name',
  'Owner Phone',
  'Direct WhatsApp',
  'Listing Status',
  'Source Channel',
  'Listing Notes',
  'Record ID',
  // New extended columns
  'Garden (sqm)',
  'Pool',
  'Availability Raw',
  'Deal Type',
  'Last Updated',
];

// ── Location gazetteer (simplified subset for compound resolution) ──────────
const LOCATION_MAP = {
  madinaty: { compound: 'Madinaty', zone: 'Madinaty' },
  'new cairo': { compound: 'New Cairo', zone: 'New Cairo' },
  rehab: { compound: 'Al Rehab', zone: 'Al Rehab' },
  'al rehab': { compound: 'Al Rehab', zone: 'Al Rehab' },
  'up town cairo': { compound: 'Uptown Cairo', zone: 'Mokattam' },
  'uptown cairo': { compound: 'Uptown Cairo', zone: 'Mokattam' },
  uptown: { compound: 'Uptown Cairo', zone: 'Mokattam' },
  'fifth square': { compound: 'Fifth Square', zone: '5th Settlement' },
  '5th square': { compound: 'Fifth Square', zone: '5th Settlement' },
  mevida: { compound: 'Mivida', zone: '5th Settlement' },
  mivida: { compound: 'Mivida', zone: '5th Settlement' },
  cfc: { compound: 'Cairo Festival City', zone: 'New Cairo' },
  'cairo festival city': { compound: 'Cairo Festival City', zone: 'New Cairo' },
  sodic: { compound: 'SODIC East', zone: '5th Settlement' },
  eastown: { compound: 'Eastown', zone: '5th Settlement' },
  'east town': { compound: 'Eastown', zone: '5th Settlement' },
  'hyde park': { compound: 'Hyde Park', zone: '5th Settlement' },
  'lake view residence': { compound: 'Lake View Residence', zone: 'New Cairo' },
  narges: { compound: 'Al Narges', zone: 'New Cairo' },
  oriana: { compound: 'Oriana', zone: 'New Cairo' },
  'galleria moon valley': { compound: 'Galleria Moon Valley', zone: 'New Cairo' },
  'new-capital': { compound: 'New Administrative Capital', zone: 'New Capital' },
  'new capital': { compound: 'New Administrative Capital', zone: 'New Capital' },
  'palm-hills': { compound: 'Palm Hills', zone: '5th Settlement' },
  'palm hills': { compound: 'Palm Hills', zone: '5th Settlement' },
  waterway: { compound: 'The Waterway', zone: '5th Settlement' },
  'el shorouk city': { compound: 'El Shorouk', zone: 'El Shorouk' },
  'el shorouk': { compound: 'El Shorouk', zone: 'El Shorouk' },
  zaid: { compound: 'Sheikh Zayed', zone: 'Sheikh Zayed' },
  'south academ': { compound: 'South Academy', zone: 'New Cairo' },
  'south academy': { compound: 'South Academy', zone: 'New Cairo' },
  'north 90': { compound: 'North 90th', zone: 'New Cairo' },
  'gardina city': { compound: 'Gardenia City', zone: 'New Cairo' },
  'gardenia city': { compound: 'Gardenia City', zone: 'New Cairo' },
  'eypet hose elkurfenl': { compound: 'Dar Misr (El Koronfel)', zone: 'New Cairo' },
  banfcg: { compound: 'Al Banafsaj', zone: 'New Cairo' },
  banafseg: { compound: 'Al Banafsaj', zone: 'New Cairo' },
  andlos: { compound: 'Al Andalus', zone: 'New Cairo' },
  villette: { compound: 'Villette', zone: '5th Settlement' },
  other: { compound: 'New Cairo', zone: 'New Cairo' },
};

function resolveCompound(raw) {
  const key = String(raw || '').trim().toLowerCase()
    .replace(/[\u200B-\u200F\u061C\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .replace(/\s+/g, ' ');
  if (!key) return { compound: 'Unresolved', zone: 'Unresolved' };
  if (LOCATION_MAP[key]) return LOCATION_MAP[key];
  for (const [k, v] of Object.entries(LOCATION_MAP)) {
    if (k.length >= 4 && (key.includes(k) || k.includes(key))) return v;
  }
  return { compound: raw.trim() || 'Unresolved', zone: 'Unresolved' };
}

// ── Phone normalization ─────────────────────────────────────────────────────
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.slice(-10);
}

function formatPhone(raw) {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+20${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+2${digits}`;
  if (digits.startsWith('20') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('201') && digits.length === 13) return `+${digits.slice(1)}`;
  if (digits.length > 10) return `+${digits}`;
  return digits;
}

function makeWhatsApp(phone) {
  const formatted = formatPhone(phone);
  if (!formatted) return '';
  const digits = formatted.replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}`;
}

// ── Price normalization ─────────────────────────────────────────────────────
function parsePrice(raw) {
  const s = String(raw || '').trim();
  if (!s || s === 'Price on Call') return { numeric: 0, display: 'Price on Call' };
  if (s.includes('$')) {
    const usd = parseInt(s.replace(/[^0-9]/g, ''), 10);
    if (usd && usd < 10000) {
      const egp = usd * 50;
      return { numeric: egp, display: `${egp.toLocaleString('en-US')} EGP / Month` };
    }
  }
  if (/per\s*meter|negotiable/i.test(s)) return { numeric: 0, display: 'Price on Call' };
  const digits = s.replace(/[^0-9]/g, '');
  if (!digits) return { numeric: 0, display: 'Price on Call' };
  const n = parseInt(digits, 10);
  if (!n || !Number.isFinite(n)) return { numeric: 0, display: 'Price on Call' };
  return { numeric: n, display: `${n.toLocaleString('en-US')} EGP / Month` };
}

// ── Status mapping ──────────────────────────────────────────────────────────
function mapStatus(avail, type) {
  const a = String(avail || '').toLowerCase();
  const t = String(type || '').toLowerCase();
  if (/اتباعت|تم الايجار|تم البيع|sold/.test(t) || /sold/.test(a)) return 'Unavailable';
  if (/تم الايجار/.test(t)) return 'Unavailable';
  if (/not available/.test(a)) return 'Unavailable';
  if (a.includes('available') && !a.includes('not')) return 'Available for Rent';
  if (/follow/i.test(a)) return 'Follow Up';
  if (/no answer/i.test(a)) return 'No Answer';
  return 'No Answer';
}

function mapDealType(type, price) {
  const t = String(type || '').toLowerCase();
  if (/sale|بيع|للبيع/.test(t)) return 'sale';
  if (/rent|ايجار|إيجار|furnished rent/i.test(t)) return 'rent';
  if (price >= 1_000_000) return 'sale';
  return 'rent';
}

// ── Record ID generation ────────────────────────────────────────────────────
function generateRecordId(phone, code) {
  const key = `${normalizePhone(phone)}|${String(code || '').trim().toUpperCase()}`;
  return 'INV-' + createHash('sha256').update(key).digest('hex').slice(0, 12).toUpperCase();
}

// ── Count filled fields ─────────────────────────────────────────────────────
function fieldScore(row) {
  let score = 0;
  for (const v of Object.values(row)) {
    const s = String(v || '').trim();
    if (s && s !== 'Upon Request' && s !== 'Price on Call' && s !== 'Unknown' && s !== 'Unresolved') score++;
  }
  return score;
}

// ── Main ────────────────────────────────────────────────────────────────────

// 1. Load master CSV
const masterRaw = fs.readFileSync(MASTER_CSV, 'utf8');
const masterParsed = Papa.parse(masterRaw, { header: true, skipEmptyLines: true });
console.log(`✓ Loaded master: ${masterParsed.data.length} rows`);

// 2. Load new CSV
const newRaw = fs.readFileSync(path.resolve(newCsvPath), 'utf8');
const newParsed = Papa.parse(newRaw, { header: true, skipEmptyLines: true });
console.log(`✓ Loaded import:  ${newParsed.data.length} rows\n`);

// 3. Index master by phone+code
const masterMap = new Map();
for (const row of masterParsed.data) {
  const phone = normalizePhone(row['Owner Phone']);
  const code = String(row['Unit Code'] || '').trim().toUpperCase();
  const key = `${phone}|${code}`;
  if (phone || code) masterMap.set(key, { ...row });
}
const masterByCode = new Map();
for (const row of masterParsed.data) {
  const code = String(row['Unit Code'] || '').trim().toUpperCase();
  if (code) masterByCode.set(code, { ...row });
}

// 4. Transform new CSV rows to master schema
const stats = { added: 0, updated: 0, statusChanged: 0, skippedEmpty: 0 };

for (const newRow of newParsed.data) {
  const rawPhone = String(newRow['Mobile'] || '').trim();
  const rawCode = String(newRow['Code'] || '').trim();
  const rawLocation = String(newRow['Location '] || newRow['Location'] || '').trim();
  const rawAvail = String(newRow['Availablty'] || newRow['Availability'] || '').trim();
  const rawType = String(newRow['Type'] || '').trim();
  const rawPrice = String(newRow['Unit Price'] || '').trim();
  const rawName = String(newRow['Name'] || '').trim();
  const rawBeds = String(newRow['bedrooms'] || '').trim();
  const rawFurnished = String(newRow['Furnished or not'] || '').trim();
  const rawPropType = String(newRow['Property Tybe'] || '').trim();
  const rawGarden = String(newRow['Garden'] || '').trim();
  const rawSpace = String(newRow['Space'] || '').trim();
  const rawPool = String(newRow['Pool'] || '').trim();
  const rawComment = String(newRow['Comment'] || '').trim();
  const rawTimestamp = String(newRow['Timestamp'] || '').trim();
  const rawUpdated = String(newRow['تاريخ اخر تحديث '] || newRow['تاريخ اخر تحديث'] || '').trim();

  if (!rawPhone && !rawCode && !rawLocation && !rawPrice) {
    stats.skippedEmpty++;
    continue;
  }

  const phone10 = normalizePhone(rawPhone);
  const codeUpper = rawCode.toUpperCase();
  const { numeric: priceNum, display: priceDisplay } = parsePrice(rawPrice);
  const dealType = mapDealType(rawType, priceNum);
  const status = mapStatus(rawAvail, rawType);
  const { compound, zone } = resolveCompound(rawLocation);

  const transformed = {
    'Unit Code': rawCode || '',
    'Compound / Community': compound,
    'Zone / Area': zone,
    'Property Type': rawPropType && rawPropType !== 'Property Tybe'
      ? rawPropType.replace(/\b\w/g, (c) => c.toUpperCase())
      : '',
    'Monthly Rent (EGP)': priceNum > 0 ? String(priceNum) : 'Price on Call',
    'Rent Display': priceNum > 0 ? priceDisplay : 'Price on Call',
    'Area (sqm)': rawSpace || 'Upon Request',
    'Bedrooms': rawBeds || 'Upon Request',
    'Bathrooms': 'Upon Request',
    'Furnishing': rawFurnished || 'Unknown',
    'Owner / Contact Name': rawName || '',
    'Owner Phone': formatPhone(rawPhone),
    'Direct WhatsApp': makeWhatsApp(rawPhone),
    'Listing Status': status,
    'Source Channel': 'Direct Owner Intake',
    'Listing Notes': rawComment || '',
    'Record ID': generateRecordId(rawPhone, rawCode),
    'Garden (sqm)': rawGarden || '',
    'Pool': rawPool || '',
    'Availability Raw': rawAvail || '',
    'Deal Type': dealType,
    'Last Updated': rawUpdated || rawTimestamp || '',
  };

  const key = `${phone10}|${codeUpper}`;
  let matched = false;

  if ((phone10 || codeUpper) && masterMap.has(key)) {
    matched = true;
    const existing = masterMap.get(key);

    const winner = { ...existing };
    for (const col of MASTER_COLS) {
      const existVal = String(existing[col] || '').trim();
      const newVal = String(transformed[col] || '').trim();
      if ((!existVal || existVal === 'Upon Request' || existVal === 'Price on Call' || existVal === 'Unknown' || existVal === 'Unresolved') && newVal && newVal !== 'Upon Request' && newVal !== 'Price on Call') {
        winner[col] = newVal;
      } else if (existVal) {
        winner[col] = existVal;
      } else {
        winner[col] = newVal;
      }
    }

    if (status === 'Unavailable' && existing['Listing Status'] === 'Available for Rent') {
      winner['Listing Status'] = 'Unavailable';
      stats.statusChanged++;
    }

    masterMap.set(key, winner);
    stats.updated++;
  }

  if (!matched && codeUpper && masterByCode.has(codeUpper)) {
    matched = true;
    const existing = masterByCode.get(codeUpper);
    const existingPhone = normalizePhone(existing['Owner Phone']);
    const existKey = `${existingPhone}|${codeUpper}`;

    if (masterMap.has(existKey)) {
      const existInMap = masterMap.get(existKey);
      for (const col of MASTER_COLS) {
        const existVal = String(existInMap[col] || '').trim();
        const newVal = String(transformed[col] || '').trim();
        if ((!existVal || existVal === 'Upon Request' || existVal === 'Price on Call' || existVal === 'Unknown') && newVal && newVal !== 'Upon Request' && newVal !== 'Price on Call') {
          existInMap[col] = newVal;
        }
      }
      if (status === 'Unavailable' && existInMap['Listing Status'] === 'Available for Rent') {
        existInMap['Listing Status'] = 'Unavailable';
        stats.statusChanged++;
      }
      masterMap.set(existKey, existInMap);
      stats.updated++;
    }
  }

  if (!matched) {
    masterMap.set(key || `new-${stats.added}`, transformed);
    stats.added++;
  }
}

// 5. Collect all rows, sort by compound then code
const merged = [...masterMap.values()].sort((a, b) => {
  const cmpA = String(a['Compound / Community'] || '');
  const cmpB = String(b['Compound / Community'] || '');
  if (cmpA !== cmpB) return cmpA.localeCompare(cmpB);
  return String(a['Unit Code'] || '').localeCompare(String(b['Unit Code'] || ''));
});

console.log('─── MERGE REPORT ──────────────────────────────────────────────');
console.log(`  Master (before):  ${masterParsed.data.length} rows`);
console.log(`  Import:           ${newParsed.data.length} rows`);
console.log(`  ────────────────────────────────────`);
console.log(`  Added (new):      ${stats.added}`);
console.log(`  Updated (merged): ${stats.updated}`);
console.log(`  Status changed:   ${stats.statusChanged}`);
console.log(`  Skipped (empty):  ${stats.skippedEmpty}`);
console.log(`  ────────────────────────────────────`);
console.log(`  Merged total:     ${merged.length} rows`);
console.log('───────────────────────────────────────────────────────────────');

const compoundCounts = {};
for (const r of merged) {
  const c = r['Compound / Community'] || 'Unknown';
  compoundCounts[c] = (compoundCounts[c] || 0) + 1;
}
console.log('\n  Compounds:');
Object.entries(compoundCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([c, n]) => console.log(`    ${String(n).padStart(4)}  ${c}`));

if (DRY_RUN) {
  console.log('\n⚠️  DRY RUN — no files written.\n');
  process.exit(0);
}

// 6. Write merged CSV
const csvOut = Papa.unparse(merged, { columns: MASTER_COLS });
fs.writeFileSync(MASTER_CSV, csvOut, 'utf8');
console.log(`\n💾 Written: ${MASTER_CSV} (${merged.length} rows)`);

// 7. Write XLSX if xlsx module is available
try {
  const xlsx = require('xlsx');
  const ws = xlsx.utils.json_to_sheet(merged, { header: MASTER_COLS });
  ws['!cols'] = MASTER_COLS.map((h) => ({ wch: Math.max(h.length + 2, 16) }));
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, `Owners Rent Master (${merged.length})`);
  const xlsxPath = MASTER_CSV.replace('.csv', '.xlsx');
  xlsx.writeFile(wb, xlsxPath);
  console.log(`💾 Written: ${xlsxPath}`);
} catch (e) {
  console.warn('⚠️  xlsx module not available — skipping .xlsx output');
}

console.log('\n🎉 Merge complete!\n');
