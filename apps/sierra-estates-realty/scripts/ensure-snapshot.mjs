import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
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

// 2026-10-19 baseline audit: data/consolidated-master-inventory.json (12.5 MB)
// is untracked by the data-hygiene contract (git rm --cached; see
// __tests__/data-hygiene-and-git-weight.test.ts). It is imported by
// lib/services/ListingAvailabilitySyncService (always via dynamic import), so
// webpack still resolves it during `next build` — a clean checkout therefore
// needs a stub until the operator regenerates the real file via
// `scripts/merge-inventory-master.ts` / `scripts/export-master-excel-csv.ts`.
// Same pattern as the snapshot stub above: build stays green, zero listings
// are fabricated (§21 — an empty array is the honest unknown).
const DATA_DIR = resolve(__dirname, '../data');
const CONSOLIDATED = resolve(DATA_DIR, 'consolidated-master-inventory.json');
if (!existsSync(CONSOLIDATED)) {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  console.log('[ensure-snapshot] consolidated-master-inventory.json not found, creating empty stub...');
  writeFileSync(CONSOLIDATED, JSON.stringify({ units: [], generatedAt: new Date().toISOString() }) + '\n');
  console.log(`[ensure-snapshot] created stub at ${CONSOLIDATED}`);
} else {
  console.log('[ensure-snapshot] consolidated-master-inventory.json already exists.');
}

