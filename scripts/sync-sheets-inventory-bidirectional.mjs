#!/usr/bin/env node
/**
 * sync-sheets-inventory-bidirectional.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Unifies the 4 inventory & automation surfaces end-to-end:
 *   1. Google Sheets Master Inventory (`UNITS_SHEET_ID` gid `1127958606`)
 *      ──▶ Supabase `public.listings` via Workflow `08-units-sync`
 *          (preserves Phase 6 `REVIEW_REQUIRED` & zero provenance fabrication).
 *   2. Lifecycle & Surface Parity Reconciliation in `public.listings`:
 *        - `publish_status = 'PUBLISHABLE'` + `status IN ('available', 'verified')`
 *          (and NOT marked Sold/Not available) ──▶ `status = 'active'` so the
 *          Client Page Map (`/api/inventory` under `anon` RLS) and Property
 *          Finder Feed (`/api/feeds/property-finder`) display identical verified units.
 *        - `availability IN ('Sold', 'Not available')` + `status = 'active'`
 *          ──▶ `status = 'off-market'` so sold/withdrawn units immediately leave
 *          the Client Page Map.
 *   3. Refreshes Property Finder OpenAPI 3.1.0 Selected Ads Manifest
 *      (`scripts/select-propertyfinder-ads.mjs`).
 *   4. Prints a 4-Surface Parity Report (Sheet ↔ Supabase ↔ Client Map ↔ PF Ads).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(ROOT, '.env.local'));
loadEnvFile(path.join(ROOT, '.env'));
loadEnvFile(path.join(ROOT, 'workflows', '.env'));

const dryRun = process.argv.includes('--dry-run');

async function reconcileClientMapParity() {
  const sbUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!sbUrl || !sbKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const headers = {
    apikey: sbKey,
    Authorization: `Bearer ${sbKey}`,
    'Content-Type': 'application/json',
  };

  // 1. Find PUBLISHABLE rows stranded on status='available'|'verified' (invisible to anon RLS on Client Map)
  const strandedRes = await fetch(
    `${sbUrl}/rest/v1/listings?publish_status=eq.PUBLISHABLE&status=in.(available,verified)&select=id,code,availability&limit=500`,
    { headers, signal: AbortSignal.timeout(15000) }
  );
  const stranded = strandedRes.ok ? await strandedRes.json() : [];
  const promoteIds = stranded
    .filter((r) => !/(sold|not available|اتباع|غير متاح)/i.test(String(r.availability || '')))
    .map((r) => r.id);

  let promotedToActive = 0;
  if (promoteIds.length > 0 && !dryRun) {
    const idList = promoteIds.map((id) => `"${id}"`).join(',');
    const patchRes = await fetch(
      `${sbUrl}/rest/v1/listings?id=in.(${encodeURIComponent(idList)})`,
      {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'active', updated_at: new Date().toISOString() }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (patchRes.ok) promotedToActive = promoteIds.length;
  }

  // 2. Find active rows whose owner/sheet availability says Sold or Not available
  const staleActiveRes = await fetch(
    `${sbUrl}/rest/v1/listings?status=eq.active&availability=in.("Sold","Not available","sold","not available")&select=id,code,availability&limit=500`,
    { headers, signal: AbortSignal.timeout(15000) }
  );
  const staleActive = staleActiveRes.ok ? await staleActiveRes.json() : [];
  const demoteIds = staleActive.map((r) => r.id);

  let demotedOffMarket = 0;
  if (demoteIds.length > 0 && !dryRun) {
    const idList = demoteIds.map((id) => `"${id}"`).join(',');
    const patchRes = await fetch(
      `${sbUrl}/rest/v1/listings?id=in.(${encodeURIComponent(idList)})`,
      {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'off-market', updated_at: new Date().toISOString() }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (patchRes.ok) demotedOffMarket = demoteIds.length;
  }

  // 3. Query unified parity counts across all surfaces
  const countHeaders = { ...headers, Prefer: 'count=exact' };
  const [totalRes, sheetSyncedRes, clientMapRes, pfLinkedRes] = await Promise.all([
    fetch(`${sbUrl}/rest/v1/listings?select=id&limit=1`, { headers: countHeaders }),
    fetch(`${sbUrl}/rest/v1/listings?sync_source=in.(sheets-units,master-owner-sheet)&select=id&limit=1`, { headers: countHeaders }),
    fetch(`${sbUrl}/rest/v1/listings?status=eq.active&publish_status=eq.PUBLISHABLE&select=id&limit=1`, { headers: countHeaders }),
    fetch(`${sbUrl}/rest/v1/listings?pf_reference_number=not.is.null&select=id&limit=1`, { headers: countHeaders }),
  ]);

  const parseTotal = (res) => Number((res.headers.get('content-range') || '0/0').split('/')[1]) || 0;

  return {
    dryRun,
    strandedPublishableFound: promoteIds.length,
    promotedToActive,
    staleUnavailableActiveFound: demoteIds.length,
    demotedOffMarket,
    counts: {
      supabaseTotalListings: parseTotal(totalRes),
      googleSheetSyncedUnits: parseTotal(sheetSyncedRes),
      clientMapLivePublishableActive: parseTotal(clientMapRes),
      pfLinkedListingsInDb: parseTotal(pfLinkedRes),
    },
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(' SIERRA ESTATES · 4-SURFACE INVENTORY & WORKFLOW PARITY SYNC');
  console.log('═══════════════════════════════════════════════════════════════════════');

  // Step 1: Google Sheet -> Supabase via canonical 08-units-sync
  if (!dryRun) {
    console.log('\n[1/3] Running Workflow 08 (`08-units-sync`): Google Sheet → Supabase...');
    const syncRun = spawnSync(process.execPath, [path.join(ROOT, 'workflows', '08-units-sync', 'sync.js')], {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    });
    if (syncRun.status !== 0) {
      throw new Error(`08-units-sync exited with status ${syncRun.status}`);
    }
  } else {
    console.log('\n[1/3] Skipping live 08-units-sync mutation (--dry-run)');
  }

  // Step 2: Reconcile Client Map / Lifecycle parity
  console.log('\n[2/3] Reconciling Supabase ↔ Client Page Map (`/api/inventory`) status parity...');
  const parity = await reconcileClientMapParity();
  console.log(`  • Stranded PUBLISHABLE promoted to active : ${parity.promotedToActive} (found ${parity.strandedPublishableFound})`);
  console.log(`  • Sold/Unavailable active moved off-market : ${parity.demotedOffMarket} (found ${parity.staleUnavailableActiveFound})`);

  // Step 3: Refresh Property Finder Selected Ads Manifest
  console.log('\n[3/3] Refreshing Property Finder Selected Ads Manifest...');
  const pfRun = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'select-propertyfinder-ads.mjs')], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (pfRun.status !== 0) {
    throw new Error(`select-propertyfinder-ads.mjs exited with status ${pfRun.status}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(' UNIFIED PARITY REPORT');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  • Google Sheet Synced Units (` + 'sheets-units' + `)     : ${parity.counts.googleSheetSyncedUnits}`);
  console.log(`  • Supabase Authoritative Listings (` + 'public.listings' + `) : ${parity.counts.supabaseTotalListings}`);
  console.log(`  • Client Page Map Live (` + 'active + PUBLISHABLE' + `)  : ${parity.counts.clientMapLivePublishableActive}`);
  console.log(`  • Property Finder Linked Units in DB            : ${parity.counts.pfLinkedListingsInDb}`);
  console.log('═══════════════════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('❌ Unified sync failed:', err.message);
  process.exit(1);
});
