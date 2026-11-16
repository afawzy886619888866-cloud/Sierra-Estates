#!/usr/bin/env node
'use strict';

/**
 * backfill-all-outreach-claims.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-Platform Outreach Deduplication Claim Synchronizer
 *
 * Populates public.owner_outreach_claims with phone numbers from:
 *   1. public.owner_outreach_log (all historical sends)
 *   2. public.owners (all registered owners)
 *   3. public.leads (all client / buyer inquiries — prevents cross-messaging)
 *   4. workflows/.state/*.jsonl (local container & multi-session ledgers)
 *   5. Excel campaign & inventory workbooks
 *
 * Primary key on `phone` guarantees no worker/lane/campaign can EVER
 * send a duplicate message to any of these numbers.
 *
 * Usage:
 *   node scripts/ops/supabase/backfill-all-outreach-claims.mjs           # Dry Run Report
 *   node scripts/ops/supabase/backfill-all-outreach-claims.mjs --apply   # Execute DB Sync
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');

const require = createRequire(import.meta.url);
require('dotenv').config();
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const { normalizePhone } = require(path.join(ROOT, 'workflows', 'lib', 'phone-utils'));

const APPLY = process.argv.includes('--apply');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, columns = '*') {
  const records = [];
  const pageSize = 1000;
  let page = 0;
  while (page < 100) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error || !data || !data.length) break;
    records.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  return records;
}

async function run() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Sierra Estates — Global Zero-Duplicate Claim Synchronization');
  console.log(`  Mode: ${APPLY ? '⚡ APPLY (Live DB Write)' : '🔍 DRY RUN (Audit Only)'}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  const claimsMap = new Map(); // phone -> claimObject

  // 1. Existing DB claims
  console.log('📡 Fetching existing claims from public.owner_outreach_claims...');
  const existingClaims = await fetchAll('owner_outreach_claims', 'phone, source, listing_code, session_name, claimed_at');
  for (const c of existingClaims) {
    const p = normalizePhone(c.phone);
    if (p) {
      claimsMap.set(p, {
        phone: p,
        source: c.source || 'existing_claim',
        listing_code: c.listing_code || null,
        session_name: c.session_name || null,
        claimed_at: c.claimed_at || new Date().toISOString(),
        isNew: false,
      });
    }
  }
  console.log(`   Found ${existingClaims.length} existing claims in DB.\n`);

  // 2. Outreach logs
  console.log('📡 Fetching records from public.owner_outreach_log...');
  const logs = await fetchAll('owner_outreach_log', 'phone, listing_code, session_name, sent_at, host_side');
  let newFromLogs = 0;
  for (const l of logs) {
    const p = normalizePhone(l.phone);
    if (p && !claimsMap.has(p)) {
      claimsMap.set(p, {
        phone: p,
        source: l.host_side || 'historical_outreach_log',
        listing_code: l.listing_code || null,
        session_name: l.session_name || null,
        claimed_at: l.sent_at || new Date().toISOString(),
        isNew: true,
      });
      newFromLogs++;
    }
  }
  console.log(`   Scanned ${logs.length} logs -> ${newFromLogs} new unique phones.\n`);

  // 3. Owners table
  console.log('📡 Fetching records from public.owners...');
  const owners = await fetchAll('owners', 'primary_mobile, created_at');
  let newFromOwners = 0;
  for (const o of owners) {
    const p = normalizePhone(o.primary_mobile);
    if (p && !claimsMap.has(p)) {
      claimsMap.set(p, {
        phone: p,
        source: 'owners_table',
        listing_code: null,
        session_name: null,
        claimed_at: o.created_at || new Date().toISOString(),
        isNew: true,
      });
      newFromOwners++;
    }
  }
  console.log(`   Scanned ${owners.length} owners -> ${newFromOwners} new unique phones.\n`);

  // 4. Leads table
  console.log('📡 Fetching records from public.leads...');
  const leads = await fetchAll('leads', 'phone, created_at');
  let newFromLeads = 0;
  for (const ld of leads) {
    const p = normalizePhone(ld.phone);
    if (p && !claimsMap.has(p)) {
      claimsMap.set(p, {
        phone: p,
        source: 'leads_table',
        listing_code: null,
        session_name: null,
        claimed_at: ld.created_at || new Date().toISOString(),
        isNew: true,
      });
      newFromLeads++;
    }
  }
  console.log(`   Scanned ${leads.length} leads -> ${newFromLeads} new unique phones.\n`);

  // 5. Local JSONL Ledgers
  console.log('📂 Scanning local JSONL ledgers in workflows/.state/...');
  const ledgerFiles = [
    path.join(ROOT, 'workflows', '.state', 'owner-outreach-ledger.jsonl'),
    path.join(ROOT, 'workflows', '.state', 'paced-outreach-ledger.jsonl'),
  ];
  let newFromLedgers = 0;
  for (const file of ledgerFiles) {
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          const p = normalizePhone(entry.phone);
          if (p && !claimsMap.has(p)) {
            claimsMap.set(p, {
              phone: p,
              source: 'local_outreach_ledger',
              listing_code: entry.listingCode || null,
              session_name: entry.sessionName || null,
              claimed_at: entry.timestamp || new Date().toISOString(),
              isNew: true,
            });
            newFromLedgers++;
          }
        } catch (_) {}
      }
    }
  }
  console.log(`   Scanned local ledgers -> ${newFromLedgers} new unique phones.\n`);

  // 6. Campaign & Inventory Excel sheets
  console.log('📊 Scanning campaign & inventory Excel spreadsheets...');
  const excelFiles = [
    path.join(ROOT, 'quarantine', 'dumps', 'whatsapp_garden_owners_campaign.xlsx'),
    path.join(ROOT, 'data', 'Sierra_Estates_WhatsApp_Inventory_By_Date.xlsx'),
    path.join(ROOT, 'patches', 'Sierra_Estates_WhatsApp_Inventory_By_Date.xlsx'),
  ];
  let newFromExcel = 0;
  for (const ef of excelFiles) {
    if (fs.existsSync(ef)) {
      try {
        const wb = XLSX.readFile(ef);
        for (const sheetName of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
          for (const row of rows) {
            if (!Array.isArray(row)) continue;
            for (const cell of row) {
              if (cell !== null && cell !== undefined) {
                const str = String(cell).trim();
                if (/^[+0-9\s-]{8,20}$/.test(str)) {
                  const p = normalizePhone(str);
                  if (p && !claimsMap.has(p)) {
                    claimsMap.set(p, {
                      phone: p,
                      source: 'campaign_sheet',
                      listing_code: null,
                      session_name: null,
                      claimed_at: new Date().toISOString(),
                      isNew: true,
                    });
                    newFromExcel++;
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn(`   Warning: error parsing ${path.basename(ef)}: ${err.message}`);
      }
    }
  }
  console.log(`   Scanned Excel spreadsheets -> ${newFromExcel} new unique phones.\n`);

  // Summary Metrics
  const allClaims = Array.from(claimsMap.values());
  const newClaims = allClaims.filter(c => c.isNew);

  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  Total Unique Contacts Across All Sources : ${allClaims.length}`);
  console.log(`  Existing Claims in DB                    : ${existingClaims.length}`);
  console.log(`  New Candidates to Claim                  : ${newClaims.length}`);
  console.log('──────────────────────────────────────────────────────────────');

  const sourceBreakdown = {};
  for (const c of newClaims) {
    sourceBreakdown[c.source] = (sourceBreakdown[c.source] || 0) + 1;
  }
  console.log('  New Candidates Breakdown by Source:');
  for (const [src, cnt] of Object.entries(sourceBreakdown)) {
    console.log(`    • ${src.padEnd(25)}: ${cnt}`);
  }
  console.log('──────────────────────────────────────────────────────────────\n');

  if (!APPLY) {
    console.log('ℹ️  DRY RUN complete. No rows written to Supabase.');
    console.log('   Run with `--apply` to write the new claims to public.owner_outreach_claims.\n');
    return;
  }

  // Live Batch Insertion
  console.log(`🚀 Inserting ${newClaims.length} claims into public.owner_outreach_claims...`);
  const batchSize = 100;
  let insertedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < newClaims.length; i += batchSize) {
    const chunk = newClaims.slice(i, i + batchSize).map(c => ({
      phone: c.phone,
      source: c.source,
      listing_code: c.listing_code,
      session_name: c.session_name,
      claimed_at: c.claimed_at,
    }));

    const { error } = await supabase
      .from('owner_outreach_claims')
      .upsert(chunk, { onConflict: 'phone', ignoreDuplicates: true });

    if (error) {
      console.error(`   ❌ Batch ${i / batchSize + 1} failed:`, error.message);
      errorCount += chunk.length;
    } else {
      insertedCount += chunk.length;
      process.stdout.write(`   ✓ Processed ${insertedCount}/${newClaims.length} rows...\r`);
    }
  }

  console.log(`\n\n✅ Done! Successfully inserted ${insertedCount} claims (${errorCount} errors).`);

  // Final verification
  const { count: finalTotal } = await supabase
    .from('owner_outreach_claims')
    .select('*', { count: 'exact', head: true });
  console.log(`🏆 Final Total Claims in public.owner_outreach_claims: ${finalTotal}`);
  console.log('══════════════════════════════════════════════════════════════\n');
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
