import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { obsidian } from '../packages/obsidian/src/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REAL_LISTINGS_PATH = path.join(ROOT, 'apps/sierra-estates-realty/data/real-listings.json');
const rawReal = JSON.parse(fs.readFileSync(REAL_LISTINGS_PATH, 'utf8'));

console.log(`🧠 Syncing ${rawReal.length} real property listings to Obsidian project memory...`);

let count = 0;
for (const item of rawReal) {
  const code = item.code || item.id || `SE-${count + 1}`;
  const id = `listing-${code.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;
  const compound = item.compound || 'New Cairo';
  const type = item.type || 'Apartment';

  await obsidian.set(id, {
    sierraCode: code,
    compound,
    location: compound,
    type,
    beds: Number(item.beds || 3),
    baths: Number(item.baths || 2),
    area_sqm: Number(item.area || 150),
    price: Number(item.price || 0),
    currency: 'EGP',
    status: item.status || 'Available',
    mode: item.mode || 'sale',
    agent: item.agent || 'Sierra Estates Advisor',
    source: 'Master Owner Google Sheet',
    updatedAt: new Date().toISOString()
  }, [
    'inventory-listing',
    'real-data',
    'master-sheet',
    compound.toLowerCase().replace(/\s+/g, '-'),
    type.toLowerCase().replace(/\s+/g, '-')
  ]);
  count++;
}

console.log(`✅ Successfully synced ${count} real listings to Obsidian memory store!`);
