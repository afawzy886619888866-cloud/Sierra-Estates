import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const projectRoot = process.cwd();
const csvPath = path.join(projectRoot, 'apps', 'sierra-estates-realty', 'data', 'sierra-estates-master-inventory.csv');
const targetDir = path.join(projectRoot, 'apps', 'sierra-estates-realty', 'public', 'downloads');
const dataTargetDir = path.join(projectRoot, 'apps', 'sierra-estates-realty', 'data');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Read CSV
let rows = [];
if (fs.existsSync(csvPath)) {
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const workbook = XLSX.read(csvContent, { type: 'string' });
  const sheetName = workbook.SheetNames[0];
  rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  console.log(`Loaded ${rows.length} units from master CSV`);
}

// 2. Create Categorized Sheets
const wb = XLSX.utils.book_new();

// Sheet 1: All Units
const wsAll = XLSX.utils.json_to_sheet(rows);
XLSX.utils.book_append_sheet(wb, wsAll, 'All_Master_Units');

// Sheet 2: Sale & Resale
const saleRows = rows.filter(r => {
  const t = String(r.DealType || r.Type || r.type || r.deal_type || '').toLowerCase();
  return t.includes('sale') || t.includes('بيع') || t.includes('resale') || !t.includes('rent');
});
if (saleRows.length > 0) {
  const wsSale = XLSX.utils.json_to_sheet(saleRows);
  XLSX.utils.book_append_sheet(wb, wsSale, 'Owners_Sale_Resale');
}

// Sheet 3: Rentals
const rentRows = rows.filter(r => {
  const t = String(r.DealType || r.Type || r.type || r.deal_type || '').toLowerCase();
  return t.includes('rent') || t.includes('إيجار') || t.includes('ايجار');
});
if (rentRows.length > 0) {
  const wsRent = XLSX.utils.json_to_sheet(rentRows);
  XLSX.utils.book_append_sheet(wb, wsRent, 'Luxury_Rentals');
}

// Sheet 4: Cairo Plaza
const cpRows = rows.filter(r => {
  const c = String(r.Compound || r.compound || r.title || r.Title || '').toLowerCase();
  return c.includes('cairo plaza') || c.includes('كايرو بلازا') || c.includes('nile');
});
if (cpRows.length > 0) {
  const wsCp = XLSX.utils.json_to_sheet(cpRows);
  XLSX.utils.book_append_sheet(wb, wsCp, 'Cairo_Plaza_Towers');
}

// Sheet 5: Compound Index Summary
const compoundStats = [
  { Compound: 'Mivida (Emaar)', AvgPriceSqmEGP: '115,000', YieldPercentage: '8.5%', PrimaryZones: 'Golden Square / 5th Settlement', Liquidity: 'High' },
  { Compound: 'Hyde Park New Cairo', AvgPriceSqmEGP: '75,000', YieldPercentage: '7.8%', PrimaryZones: '90th South / Park Avenue', Liquidity: 'Very High' },
  { Compound: 'Mountain View iCity', AvgPriceSqmEGP: '70,000', YieldPercentage: '8.2%', PrimaryZones: 'New Cairo Club Side', Liquidity: 'High' },
  { Compound: 'Palm Hills New Cairo', AvgPriceSqmEGP: '125,000', YieldPercentage: '9.0%', PrimaryZones: 'Golden Square Extension', Liquidity: 'Prime Luxury' },
  { Compound: 'Cairo Plaza Towers', AvgPriceSqmEGP: '145,000', YieldPercentage: '19.5%', PrimaryZones: 'Nile Corniche, Downtown', Liquidity: 'Institutional' },
  { Compound: 'Villette by SODIC', AvgPriceSqmEGP: '95,000', YieldPercentage: '8.0%', PrimaryZones: 'Golden Square', Liquidity: 'High' },
  { Compound: 'Uptown Cairo (Emaar)', AvgPriceSqmEGP: '130,000', YieldPercentage: '9.4%', PrimaryZones: 'Mokattam Hills', Liquidity: 'High' },
  { Compound: 'Madinaty & Rehab', AvgPriceSqmEGP: '50,000', YieldPercentage: '7.2%', PrimaryZones: 'East Cairo Gated', Liquidity: 'Maximum Resale' },
];
const wsIndex = XLSX.utils.json_to_sheet(compoundStats);
XLSX.utils.book_append_sheet(wb, wsIndex, 'Compound_Price_Index');

// Write buffer using fs
const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

const excelDest1 = path.join(targetDir, 'sierra-estates-master-inventory.xlsx');
const excelDest2 = path.join(dataTargetDir, 'sierra-estates-master-inventory.xlsx');

fs.writeFileSync(excelDest1, excelBuffer);
fs.writeFileSync(excelDest2, excelBuffer);

console.log(`✅ Excel Workbook created successfully at:`);
console.log(`- ${excelDest1}`);
console.log(`- ${excelDest2}`);
