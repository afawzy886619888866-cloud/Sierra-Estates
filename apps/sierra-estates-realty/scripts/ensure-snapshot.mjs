import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../lib/inventory/snapshot.json');

if (!existsSync(OUT)) {
  console.log('[ensure-snapshot] snapshot.json not found, creating lightweight seed fallback...');
  const fallback = {
    updatedAt: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    totalUnits: 0,
    count: 0,
    compoundCounts: {},
    compoundSegmentCounts: {},
    segments: {},
    units: []
  };
  writeFileSync(OUT, JSON.stringify(fallback, null, 2) + '\n');
  console.log(`[ensure-snapshot] created stub at ${OUT}`);
} else {
  console.log('[ensure-snapshot] snapshot.json already exists.');
}
