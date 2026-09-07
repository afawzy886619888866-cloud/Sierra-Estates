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
console.log('  SIERRA ESTATES: CONSOLIDATED RENT MASTER INVENTORY GENERATOR           ');
console.log('  [Direct Owners Rent (298)] + [Broker Rent (4,955)] = 5,253 Rent Units  ');
console.log('═════════════════════════════════════════════════════════════════════════\n');

// 1. Load Owners Rent
const ownersRentPath = path.join(ROOT, 'Sierra_Estates_Owners_Rent_Master.xlsx');
const ownersWb = xlsx.readFile(ownersRentPath);
const ownersRentRows = xlsx.utils.sheet_to_json(ownersWb.Sheets['Owners Rent Master (All)']);

// 2. Load Broker Rent
const brokerRentPath = path.join(ROOT, 'apps/sierra-estates-realty/public/downloads/sierra-estates-broker-rent.xlsx');
const brokerWb = xlsx.readFile(brokerRentPath);
const brokerRentRows = xlsx.utils.sheet_to_json(brokerWb.Sheets[brokerWb.SheetNames[0]]);

console.log(`Loaded Direct Owners Rent: ${ownersRentRows.length} units`);
console.log(`Loaded Broker Rent: ${brokerRentRows.length} units`);

// 3. Overview KPIs
const totalUnits = ownersRentRows.length + brokerRentRows.length;
const overviewKpis = [
  { 'Portfolio Segment': 'Total Sierra Estates Rental Fleet', 'Count / Total Units': totalUnits, 'Key Highlights': 'Complete rental inventory across East Cairo, West Cairo, and Coastal markets' },
  { 'Portfolio Segment': 'Direct Owners Rent Portfolio', 'Count / Total Units': ownersRentRows.length, 'Key Highlights': 'Direct intake from owners, 0% broker interference, direct WhatsApp links' },
  { 'Portfolio Segment': 'Broker & Co-Broke Rent Network', 'Count / Total Units': brokerRentRows.length, 'Key Highlights': 'Wide co-broking network across New Cairo, Eastown, Mivida, and Madinaty' },
  { 'Portfolio Segment': 'Top Rental Compound Coverage', 'Count / Total Units': '28+ Communities', 'Key Highlights': 'Madinaty, Al Rehab, Mivida, Eastown, Uptown Cairo, Fifth Square, Palm Hills' },
  { 'Portfolio Segment': 'Direct Contact Availability', 'Count / Total Units': '100% of Verified Units', 'Key Highlights': 'Phone and WhatsApp direct connectivity' }
];

// 4. Assemble Consolidated Workbook
const masterWb = xlsx.utils.book_new();

// Tab 1: Overview
const wsOverview = xlsx.utils.json_to_sheet(overviewKpis);
wsOverview['!cols'] = [{ wch: 35 }, { wch: 22 }, { wch: 65 }];
xlsx.utils.book_append_sheet(masterWb, wsOverview, 'Rental Portfolio Overview');

// Tab 2: Direct Owners Rent
const wsOwners = xlsx.utils.json_to_sheet(ownersRentRows);
wsOwners['!cols'] = [
  { wch: 16 }, { wch: 24 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
  { wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 25 },
  { wch: 25 }, { wch: 18 }, { wch: 32 }, { wch: 20 }, { wch: 22 },
  { wch: 60 }, { wch: 20 }
];
xlsx.utils.book_append_sheet(masterWb, wsOwners, 'Direct Owners Rent (298)');

// Tab 3: Broker Rent
const wsBroker = xlsx.utils.json_to_sheet(brokerRentRows);
wsBroker['!cols'] = [
  { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 18 },
  { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 12 },
  { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 24 }, { wch: 18 },
  { wch: 32 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 50 }
];
xlsx.utils.book_append_sheet(masterWb, wsBroker, 'Broker Rent Network (4955)');

// 5. Save files
const outDownloads = path.join(ROOT, 'apps/sierra-estates-realty/public/downloads/Sierra_Estates_Rent_Master_Inventory.xlsx');
const outData = path.join(ROOT, 'data/Sierra_Estates_Rent_Master_Inventory.xlsx');
const outRoot = path.join(ROOT, 'Sierra_Estates_Rent_Master_Inventory.xlsx');

xlsx.writeFile(masterWb, outDownloads);
xlsx.writeFile(masterWb, outData);
xlsx.writeFile(masterWb, outRoot);

console.log(`\n💾 Saved Consolidated Rent Master Workbook to:`);
console.log(`   1. ${outDownloads} (${(fs.statSync(outDownloads).size / (1024 * 1024)).toFixed(2)} MB)`);
console.log(`   2. ${outData}`);
console.log(`   3. ${outRoot}`);

console.log('\n🎉 Successfully generated Sierra Estates Consolidated Rent Master Inventory!');
