#!/usr/bin/env node
/**
 * build-inventory-snapshot.mjs
 *
 * Regenerates `lib/inventory/snapshot.json` — the committed, PII-free fallback
 * that `/api/inventory` serves when the live Google Sheet can't be reached.
 *
 * The sheet (owner CRM) contains owner NAMES and MOBILE numbers. Those columns
 * are deliberately dropped here — the snapshot and the public map only ever
 * carry unit facts (location, price, beds, type, area, availability).
 *
 * Usage:
 *   node scripts/build-inventory-snapshot.mjs
 *   INVENTORY_SHEET_ID=... INVENTORY_SHEET_GID=... node scripts/build-inventory-snapshot.mjs
 *
 * Keep the normalization rules here in sync with lib/inventory/normalize.ts —
 * both turn a raw sheet row into the same InventoryUnit shape.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { GAZETTEER, resolveLocation } from '../lib/inventory/gazetteer.js';
import { normalizeRows } from '../lib/inventory/normalize.js';

/**
 * Minimal RFC-4180 CSV → array-of-objects parser. Self-contained so the
 * generator runs without installed node_modules; the Next.js runtime uses
 * papaparse instead (see app/api/inventory/route.ts).
 */
function parseCsv(text) {
  const rows = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { record.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.length > 1 || record[0] !== '') rows.push(record);
      record = [];
    } else field += c;
  }
  if (field !== '' || record.length) { record.push(field); rows.push(record); }
  const header = rows.shift() || [];
  return rows.map((r) => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = r[idx] ?? ''; });
    return obj;
  });
}

const SHEET_ID =
  process.env.INVENTORY_SHEET_ID || '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';
const SHEET_GID = process.env.INVENTORY_SHEET_GID || '1127958606';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../lib/inventory/snapshot.json');

async function main() {
  console.log(`[inventory] fetching ${CSV_URL}`);
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`sheet fetch failed: ${res.status}`);
  const csv = await res.text();
  const rows = parseCsv(csv);
  const units = normalizeRows(rows, { resolveLocation });

  const unresolved = units.filter((u) => u.approxLocation).length;
  console.log(
    `[inventory] ${units.length} units · ${unresolved} placed at an approximate (zone-center) location`,
  );
  console.log(`[inventory] gazetteer covers ${Object.keys(GAZETTEER).length} location aliases`);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: { sheetId: SHEET_ID, gid: SHEET_GID },
    count: units.length,
    units,
  };
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(`[inventory] wrote ${OUT}`);
}

main().catch((err) => {
  console.error('[inventory] failed:', err);
  process.exit(1);
});
