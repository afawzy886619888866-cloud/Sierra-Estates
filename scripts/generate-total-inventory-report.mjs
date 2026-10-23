import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MERGED_EXCEL = path.join(ROOT, 'data', 'Sierra_Estates_Master_Combined_MERGED_2026-09-28.xlsx');
const SEED_TS = path.join(ROOT, 'apps', 'sierra-estates-realty', 'lib', 'seed.ts');
const SNAPSHOT_JSON = path.join(ROOT, 'apps', 'sierra-estates-realty', 'lib', 'inventory', 'snapshot.json');

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(ROOT, file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

async function runReport() {
  loadEnv();
  console.log('===============================================================');
  console.log('          SIERRA ESTATES — COMPREHENSIVE INVENTORY REPORT       ');
  console.log('===============================================================\n');

  // 1. Check Merged Excel Workbook
  if (fs.existsSync(MERGED_EXCEL)) {
    console.log(`📁 1. MERGED MASTER EXCEL WORKBOOK`);
    console.log(`   Path: ${MERGED_EXCEL}`);
    const wb = XLSX.readFile(MERGED_EXCEL);
    console.log(`   Sheet Count: ${wb.SheetNames.length}`);
    
    let grandTotalExcel = 0;
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      console.log(`   - Sheet [${sheetName}]: ${rows.length} rows`);
      if (sheetName !== 'Summary') {
        grandTotalExcel += rows.length;
      }
    }
    console.log(`   👉 Combined Inventory Units in Excel: ${grandTotalExcel}\n`);
  } else {
    console.log(`⚠️ Merged Excel file not found at: ${MERGED_EXCEL}\n`);
  }

  // 2. Check Supabase DB
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    console.log(`🗄️ 2. SUPABASE DATABASE (public.listings)`);
    console.log(`   Target: ${url}`);
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    const { count: totalListings, error: countErr } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.error(`   ❌ Failed to query listings count: ${countErr.message}`);
    } else {
      console.log(`   👉 Total Listings in Supabase: ${totalListings}`);

      // Query chunks to aggregate statistics
      const PAGE_SIZE = 1000;
      let allRecords = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('listings')
          .select('id, compound, property_type, deal_type, price, status, sync_source, owner_phone, source_channel')
          .range(from, from + PAGE_SIZE - 1);
        if (error || !data || data.length === 0) break;
        allRecords.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      // Deal type distribution
      const dealCounts = {};
      const statusCounts = {};
      const compoundCounts = {};
      const sourceCounts = {};
      let withPriceCount = 0;
      let totalRentSum = 0;
      let rentCount = 0;
      let totalSaleSum = 0;
      let saleCount = 0;
      let withPhoneCount = 0;

      for (const item of allRecords) {
        const dType = item.deal_type || 'unspecified';
        dealCounts[dType] = (dealCounts[dType] || 0) + 1;

        const st = item.status || 'unknown';
        statusCounts[st] = (statusCounts[st] || 0) + 1;

        const cmp = item.compound || 'Unknown';
        compoundCounts[cmp] = (compoundCounts[cmp] || 0) + 1;

        const src = item.source_channel || item.sync_source || 'direct';
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;

        if (item.owner_phone && item.owner_phone.trim().length > 3) {
          withPhoneCount++;
        }

        const p = Number(item.price);
        if (p > 0) {
          withPriceCount++;
          if (dType === 'rent') {
            totalRentSum += p;
            rentCount++;
          } else if (['sale', 'resale'].includes(dType)) {
            totalSaleSum += p;
            saleCount++;
          }
        }
      }

      console.log('\n   📊 Breakdown by Deal Type:');
      for (const [k, v] of Object.entries(dealCounts).sort((a,b)=>b[1]-a[1])) {
        console.log(`      • ${k.padEnd(14)}: ${v} (${((v/allRecords.length)*100).toFixed(1)}%)`);
      }

      console.log('\n   🟢 Breakdown by Status:');
      for (const [k, v] of Object.entries(statusCounts).sort((a,b)=>b[1]-a[1])) {
        console.log(`      • ${k.padEnd(14)}: ${v}`);
      }

      console.log('\n   🏙️ Top 15 Compounds by Volume:');
      const sortedCompounds = Object.entries(compoundCounts).sort((a,b)=>b[1]-a[1]);
      for (const [cmp, count] of sortedCompounds.slice(0, 15)) {
        console.log(`      • ${cmp.padEnd(28)}: ${count}`);
      }

      console.log('\n   💰 Pricing Metrics:');
      console.log(`      • Listings with Non-Zero Price: ${withPriceCount} / ${allRecords.length}`);
      if (rentCount > 0) {
        console.log(`      • Average Monthly Rent        : ${Math.round(totalRentSum / rentCount).toLocaleString()} EGP (${rentCount} units)`);
      }
      if (saleCount > 0) {
        console.log(`      • Average Sale / Resale Price : ${Math.round(totalSaleSum / saleCount).toLocaleString()} EGP (${saleCount} units)`);
      }
      console.log(`      • Units with Direct Contact Phone: ${withPhoneCount}`);
    }
  } else {
    console.log(`⚠️ Supabase environment variables not available.\n`);
  }

  // 3. Check App Client Seed / Snapshot State
  console.log(`\n💻 3. WEB CLIENT DEPLOYMENT ASSETS`);
  if (fs.existsSync(SNAPSHOT_JSON)) {
    const snap = JSON.parse(fs.readFileSync(SNAPSHOT_JSON, 'utf8'));
    console.log(`   - snapshot.json: ${snap.units ? snap.units.length : (Array.isArray(snap) ? snap.length : 'N/A')} real units (Generated: ${snap.generatedAt || 'N/A'})`);
  }
  if (fs.existsSync(SEED_TS)) {
    const seedContent = fs.readFileSync(SEED_TS, 'utf8');
    const match = seedContent.match(/export const SEED_LISTINGS: Listing\[\] = (\[[\s\S]*?\]);/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        console.log(`   - seed.ts: ${parsed.length} active seeded listings for immediate UI/SSR`);
      } catch {
        console.log(`   - seed.ts: SEED_LISTINGS active`);
      }
    }
  }

  console.log('\n===============================================================');
  console.log('                    END OF INVENTORY REPORT                    ');
  console.log('===============================================================\n');
}

runReport().catch(err => {
  console.error('Report failed:', err);
  process.exit(1);
});
