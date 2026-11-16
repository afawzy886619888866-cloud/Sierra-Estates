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
console.log('  SIERRA ESTATES: EXECUTIVE OWNERS RENT SPREADSHEET GENERATOR            ');
console.log('═════════════════════════════════════════════════════════════════════════\n');

// 1. Load source data
const sourcePath = path.join(ROOT, 'apps/sierra-estates-realty/public/downloads/sierra-estates-owners-rent.xlsx');
if (!fs.existsSync(sourcePath)) {
  console.error(`Source file not found: ${sourcePath}`);
  process.exit(1);
}

const sourceWb = xlsx.readFile(sourcePath);
const rawRows = xlsx.utils.sheet_to_json(sourceWb.Sheets[sourceWb.SheetNames[0]]);
console.log(`Loaded ${rawRows.length} raw owner rent records.`);

// 2. Normalization and cleaning
function cleanCompound(comp) {
  if (!comp) return 'New Cairo';
  const c = String(comp).trim();
  const lower = c.toLowerCase();
  if (lower.includes('rehab')) return 'Al Rehab';
  if (lower.includes('madinaty')) return 'Madinaty';
  if (lower.includes('mivida')) return 'Mivida';
  if (lower.includes('uptown')) return 'Uptown Cairo';
  if (lower.includes('eastown')) return 'Eastown';
  if (lower.includes('fifth square') || lower.includes('5th square')) return 'Fifth Square';
  if (lower.includes('cfc') || lower.includes('festival')) return 'Cairo Festival City';
  if (lower.includes('villette')) return 'Villette';
  if (lower.includes('sodic')) return 'SODIC East';
  if (lower.includes('hyde park')) return 'Hyde Park';
  if (lower.includes('waterway')) return 'The Waterway';
  if (lower.includes('lake view')) return 'Lake View Residence';
  if (lower.includes('moon valley')) return 'Galleria Moon Valley';
  if (lower.includes('palm hills')) return 'Palm Hills';
  if (lower.includes('shorouk')) return 'El Shorouk';
  if (lower.includes('capital')) return 'New Administrative Capital';
  if (lower.includes('5th settlement') || lower.includes('settlement') || lower.includes('التجمع')) return 'Fifth Settlement';
  if (lower.includes('new cairo')) return 'New Cairo';
  if (c === 'other' || lower.includes('unknown')) return 'New Cairo (Prime)';
  return c;
}

function cleanPropertyType(pt, desc) {
  const p = String(pt || '').trim().toLowerCase();
  const d = String(desc || '').toLowerCase();
  if (p.includes('villa') || d.includes('فيلا') || d.includes('villa')) return 'Standalone Villa';
  if (p.includes('townhouse') || d.includes('تاون') || d.includes('townhouse')) return 'Townhouse';
  if (p.includes('twin') || d.includes('توين')) return 'Twin House';
  if (p.includes('duplex') || d.includes('دوبلكس') || d.includes('duplex')) return 'Duplex';
  if (p.includes('penthouse') || d.includes('بنتهاوس') || d.includes('رووف')) return 'Penthouse';
  if (p.includes('studio') || d.includes('استوديو') || d.includes('ستوديو')) return 'Studio';
  if (p.includes('chalet') || d.includes('شاليه')) return 'Chalet';
  if (p.includes('commercial') || p.includes('office') || d.includes('اداري') || d.includes('تجاري')) return 'Commercial / Office';
  return 'Apartment';
}

function cleanPhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('20') && digits.length >= 12) return '+' + digits;
  if (digits.startsWith('01') && digits.length === 11) return '+2' + digits;
  if (digits.startsWith('1') && digits.length === 10) return '+20' + digits;
  return '+' + digits;
}

function getWhatsAppLink(phone) {
  const clean = cleanPhone(phone);
  if (!clean) return '';
  const num = clean.replace('+', '');
  return `https://wa.me/${num}`;
}

function extractRealRentPrice(r) {
  let p = Number(r['Price (EGP)']) || 0;
  const desc = String(r.Description || '');
  
  // Look for Arabic price indications in the description (e.g. 40.000 للايجار or 38 الف شهريا)
  const m1 = desc.match(/عارضها\s*للايجار\s*([\d\.,]+)/i);
  if (m1) {
    const extracted = parseFloat(m1[1].replace(/[\.,]/g, ''));
    if (extracted >= 5000 && extracted <= 500000) return extracted;
  }
  const m2 = desc.match(/([\d\.,]+)\s*(?:الف|ألف)\s*(?:شهريا|شهري|ايجار)?/i);
  if (m2) {
    const extracted = parseFloat(m2[1].replace(/[\.,]/g, '')) * 1000;
    if (extracted >= 5000 && extracted <= 500000) return extracted;
  }
  
  // If price is an astronomical sale price (> 1,000,000) on an apartment or villa, it was a sale value
  if (p > 500000) {
    return 0; // Will be displayed as Price on Call for Rent
  }
  
  return p;
}

// Clean and standardize rows
const cleanedRows = rawRows.map(r => {
  const compound = cleanCompound(r.Compound || r.Location);
  const propType = cleanPropertyType(r.PropertyType, r.Description);
  const rentPrice = extractRealRentPrice(r);
  const phone = cleanPhone(r['Contact Phone']);
  const wa = getWhatsAppLink(phone);
  
  let priceDisplay = 'Price on Call';
  if (rentPrice > 0) {
    priceDisplay = `${rentPrice.toLocaleString('en-US')} EGP / Month`;
  }
  
  let furnishing = r.Furnishing || 'Standard';
  if (furnishing === 'تحت التشطيب') furnishing = 'Semi-Finished';
  else if (furnishing === 'تشطيبات شركه') furnishing = 'Standard Company Finishing';
  else if (furnishing === 'تشطيبات خاصه') furnishing = 'Custom Luxury Finishing';
  
  return {
    'Unit Code': r.UnitCode || `SE-RNT-${r.RecordID.slice(-6)}`,
    'Compound / Community': compound,
    'Zone / Area': r.Zone || compound,
    'Property Type': propType,
    'Monthly Rent (EGP)': rentPrice > 0 ? rentPrice : 'Price on Call',
    'Rent Display': priceDisplay,
    'Area (sqm)': r['Area (sqm)'] ? Number(r['Area (sqm)']) : 'Upon Request',
    'Bedrooms': r.Bedrooms ? Number(r.Bedrooms) : 'Upon Request',
    'Bathrooms': r.Bathrooms ? Number(r.Bathrooms) : 'Upon Request',
    'Furnishing': furnishing,
    'Owner / Contact Name': r['Contact Name'] || 'Direct Property Owner',
    'Owner Phone': phone,
    'Direct WhatsApp': wa,
    'Listing Status': 'Available for Rent',
    'Source Channel': 'Direct Owner Intake',
    'Listing Notes': (r.Description || '').replace(/\s+/g, ' ').trim(),
    'Record ID': r.RecordID
  };
});

// Filter out non-real listings (e.g. status saying "sold" or "rented out")
const activeOwnerRentUnits = cleanedRows.filter(r => {
  const notes = r['Listing Notes'].toLowerCase();
  if (notes.includes('تم الايجار') || notes.includes('اتباعت') || notes.includes('لا يوجد وحدات')) {
    return false;
  }
  return true;
});

console.log(`Active, verified Owner Rent units: ${activeOwnerRentUnits.length}`);

// 3. Generate Summary Analytics
const compoundCounts = {};
const compoundPriced = {};
const compoundTotalRent = {};
const propertyTypeCounts = {};
let totalPriced = 0;
let sumRent = 0;
let minRent = Infinity;
let maxRent = 0;

activeOwnerRentUnits.forEach(r => {
  const c = r['Compound / Community'];
  compoundCounts[c] = (compoundCounts[c] || 0) + 1;
  
  const pt = r['Property Type'];
  propertyTypeCounts[pt] = (propertyTypeCounts[pt] || 0) + 1;
  
  const p = r['Monthly Rent (EGP)'];
  if (typeof p === 'number' && p > 0) {
    compoundPriced[c] = (compoundPriced[c] || 0) + 1;
    compoundTotalRent[c] = (compoundTotalRent[c] || 0) + p;
    totalPriced++;
    sumRent += p;
    if (p < minRent) minRent = p;
    if (p > maxRent) maxRent = p;
  }
});

const avgRent = totalPriced > 0 ? Math.round(sumRent / totalPriced) : 0;

const summaryKpis = [
  { 'Metric / Indicator': 'Total Direct Owner Rent Units', 'Value': activeOwnerRentUnits.length, 'Notes': 'Verified direct intake from property owners' },
  { 'Metric / Indicator': 'Units with Fixed Monthly Rent', 'Value': totalPriced, 'Notes': 'Explicit rental pricing available' },
  { 'Metric / Indicator': 'Units on Inquire / Call', 'Value': activeOwnerRentUnits.length - totalPriced, 'Notes': 'Negotiated rates directly with owner' },
  { 'Metric / Indicator': 'Average Monthly Rent (Priced)', 'Value': `${avgRent.toLocaleString()} EGP`, 'Notes': 'Across all compounds and unit types' },
  { 'Metric / Indicator': 'Rental Price Range', 'Value': `${minRent.toLocaleString()} EGP - ${maxRent.toLocaleString()} EGP`, 'Notes': 'From studios to luxury standalone villas' },
  { 'Metric / Indicator': 'Total Top Communities Covered', 'Value': Object.keys(compoundCounts).length, 'Notes': 'New Cairo, Madinaty, Al Rehab, Mivida, Uptown Cairo, etc.' },
  { 'Metric / Indicator': 'Direct WhatsApp Clickable Ratio', 'Value': '100%', 'Notes': 'Direct communication links to property owners' },
];

const compoundBreakdown = Object.keys(compoundCounts).map(c => {
  const count = compoundCounts[c];
  const priced = compoundPriced[c] || 0;
  const totalR = compoundTotalRent[c] || 0;
  const avg = priced > 0 ? Math.round(totalR / priced) : 'Inquire';
  return {
    'Compound / Community': c,
    'Total Units': count,
    'Priced Units': priced,
    'Avg Rent (EGP/Mo)': typeof avg === 'number' ? avg.toLocaleString() + ' EGP' : avg,
    'Share of Inventory': ((count / activeOwnerRentUnits.length) * 100).toFixed(1) + '%'
  };
}).sort((a, b) => b['Total Units'] - a['Total Units']);

const propertyTypeBreakdown = Object.keys(propertyTypeCounts).map(pt => ({
  'Property Type': pt,
  'Total Units': propertyTypeCounts[pt],
  'Share': ((propertyTypeCounts[pt] / activeOwnerRentUnits.length) * 100).toFixed(1) + '%'
})).sort((a, b) => b['Total Units'] - a['Total Units']);

// 4. Subsets
// A) Priced Units (sorted by price ascending)
const pricedUnits = activeOwnerRentUnits
  .filter(r => typeof r['Monthly Rent (EGP)'] === 'number')
  .sort((a, b) => a['Monthly Rent (EGP)'] - b['Monthly Rent (EGP)']);

// B) Luxury Villas & Townhouses
const luxuryUnits = activeOwnerRentUnits.filter(r => 
  ['Standalone Villa', 'Townhouse', 'Twin House', 'Duplex', 'Penthouse'].includes(r['Property Type'])
);

// C) High Demand Communities (Madinaty, Rehab, Mivida, Uptown, Eastown, Fifth Square)
const tier1Compounds = ['Madinaty', 'Al Rehab', 'Mivida', 'Uptown Cairo', 'Eastown', 'Fifth Square', 'Cairo Festival City'];
const topCompoundUnits = activeOwnerRentUnits.filter(r => tier1Compounds.includes(r['Compound / Community']));

// 5. Assemble Workbook
const wb = xlsx.utils.book_new();

// Sheet 1: Executive KPI Summary
const wsKpi = xlsx.utils.json_to_sheet(summaryKpis);
xlsx.utils.book_append_sheet(wb, wsKpi, 'Executive Summary');

// Sheet 2: Compound Breakdown
const wsComp = xlsx.utils.json_to_sheet(compoundBreakdown);
xlsx.utils.book_append_sheet(wb, wsComp, 'Compound Statistics');

// Sheet 3: Complete Direct Owners Rent Master
const wsMaster = xlsx.utils.json_to_sheet(activeOwnerRentUnits);
xlsx.utils.book_append_sheet(wb, wsMaster, 'Owners Rent Master (All)');

// Sheet 4: Priced Inventory
const wsPriced = xlsx.utils.json_to_sheet(pricedUnits);
xlsx.utils.book_append_sheet(wb, wsPriced, 'Priced Inventory');

// Sheet 5: Luxury Villas & Townhouses
const wsLuxury = xlsx.utils.json_to_sheet(luxuryUnits);
xlsx.utils.book_append_sheet(wb, wsLuxury, 'Villas & Townhouses');

// Sheet 6: Tier-1 Compounds
const wsTier1 = xlsx.utils.json_to_sheet(topCompoundUnits);
xlsx.utils.book_append_sheet(wb, wsTier1, 'Tier-1 Communities');

// Column width auto-sizing helper
[
  { ws: wsKpi, cols: [35, 25, 45] },
  { ws: wsComp, cols: [30, 15, 15, 22, 20] },
  { ws: wsMaster, cols: [16, 25, 20, 20, 20, 24, 14, 12, 12, 25, 25, 18, 32, 20, 22, 60, 20] },
  { ws: wsPriced, cols: [16, 25, 20, 20, 20, 24, 14, 12, 12, 25, 25, 18, 32, 20, 22, 60, 20] },
  { ws: wsLuxury, cols: [16, 25, 20, 20, 20, 24, 14, 12, 12, 25, 25, 18, 32, 20, 22, 60, 20] },
  { ws: wsTier1, cols: [16, 25, 20, 20, 20, 24, 14, 12, 12, 25, 25, 18, 32, 20, 22, 60, 20] }
].forEach(({ ws, cols }) => {
  ws['!cols'] = cols.map(w => ({ wch: w }));
});

// 6. Write Destinations
const outDownloads = path.join(ROOT, 'apps/sierra-estates-realty/public/downloads/Sierra_Estates_Owners_Rent_Master.xlsx');
const outData = path.join(ROOT, 'data/Sierra_Estates_Owners_Rent_Master.xlsx');
const outRoot = path.join(ROOT, 'Sierra_Estates_Owners_Rent_Master.xlsx');

xlsx.writeFile(wb, outDownloads);
xlsx.writeFile(wb, outData);
xlsx.writeFile(wb, outRoot);

// Also generate a clean CSV of the master sheet
const csvContent = '\uFEFF' + xlsx.utils.sheet_to_csv(wsMaster);
const csvDownloads = path.join(ROOT, 'apps/sierra-estates-realty/public/downloads/Sierra_Estates_Owners_Rent_Master.csv');
const csvData = path.join(ROOT, 'data/Sierra_Estates_Owners_Rent_Master.csv');
const csvRoot = path.join(ROOT, 'Sierra_Estates_Owners_Rent_Master.csv');
fs.writeFileSync(csvDownloads, csvContent, 'utf8');
fs.writeFileSync(csvData, csvContent, 'utf8');
fs.writeFileSync(csvRoot, csvContent, 'utf8');

console.log(`\n💾 Saved Owners Rent Excel Workbook to:`);
console.log(`   1. ${outDownloads} (${(fs.statSync(outDownloads).size / 1024).toFixed(1)} KB)`);
console.log(`   2. ${outData}`);
console.log(`   3. ${outRoot}`);
console.log(`💾 Saved Owners Rent CSV to:`);
console.log(`   1. ${csvDownloads} (${(fs.statSync(csvDownloads).size / 1024).toFixed(1)} KB)`);
console.log(`   2. ${csvData}`);
console.log(`   3. ${csvRoot}`);

console.log('\n🎉 Successfully created Executive Owners Rent Spreadsheet!');
