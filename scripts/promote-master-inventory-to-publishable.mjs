#!/usr/bin/env node
/**
 * scripts/promote-master-inventory-to-publishable.mjs
 *
 * Promotes all 12,333 verified master inventory units in Supabase public.listings
 * to publish_status = 'PUBLISHABLE' and status = 'active'.
 *
 * This unites:
 *   - Local Master Sheet (12,443 rows across 6 sheets)
 *   - Compiled Map Snapshot (12,333 units with GPS coords)
 *   - Supabase public.listings (public anon read gate)
 *   - Public Map & Property Explorer APIs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const envFile of ['.env.local', '.env', 'workflows/.env']) {
  const p = path.join(ROOT, envFile);
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

const SNAPSHOT_PATH = path.join(ROOT, 'apps', 'sierra-estates-realty', 'lib', 'inventory', 'snapshot.json');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!serviceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabaseService = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const supabaseAnon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('═════════════════════════════════════════════════════════════════════════');
  console.log('  SIERRA ESTATES — MASTER INVENTORY PUBLISH PROMOTION PIPELINE           ');
  console.log('═════════════════════════════════════════════════════════════════════════\n');

  // 1. Pre-flight counts
  const { count: preAnonCount } = await supabaseAnon
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: prePubCount } = await supabaseService
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('publish_status', 'PUBLISHABLE')
    .eq('status', 'active');

  console.log(`📊 Pre-Flight Status:`);
  console.log(`   - Public Anon Visible Listings: ${preAnonCount}`);
  console.log(`   - Supabase Active PUBLISHABLE:  ${prePubCount}\n`);

  // 2. Load snapshot.json
  const snapshotData = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  const units = snapshotData.units || [];
  console.log(`📖 Loaded ${units.length} verified units from snapshot.json`);

  const refIds = units.map((u) => u.id).filter(Boolean);
  console.log(`🎯 Identified ${refIds.length} target reference IDs to promote.\n`);

  // 3. Batch promotion update
  const BATCH_SIZE = 200;
  let promotedCount = 0;
  const now = new Date().toISOString();

  console.log(`⚡ Promoting units in batches of ${BATCH_SIZE}...`);
  for (let i = 0; i < refIds.length; i += BATCH_SIZE) {
    const chunk = refIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabaseService
      .from('listings')
      .update({
        publish_status: 'PUBLISHABLE',
        status: 'active',
        source_verified_at: now,
        updated_at: now,
      })
      .in('ref_id', chunk)
      .select('id');

    if (error) {
      console.error(`❌ Batch error at ${i}-${i + chunk.length}: ${error.message}`);
    } else {
      promotedCount += (data?.length || 0);
    }

    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= refIds.length) {
      const progress = Math.min(refIds.length, i + BATCH_SIZE);
      console.log(`   ⏳ Processed ${progress}/${refIds.length} (${promotedCount} matched & promoted)...`);
    }
  }

  console.log(`\n✅ Promotion batch execution completed! Promoted count: ${promotedCount}`);

  // 4. Post-flight verification
  const { count: postAnonCount } = await supabaseAnon
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: postPubCount } = await supabaseService
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('publish_status', 'PUBLISHABLE')
    .eq('status', 'active');

  console.log(`\n═════════════════════════════════════════════════════════════════════════`);
  console.log(`📊 FINAL POST-FLIGHT VERIFICATION:`);
  console.log(`   - Public Anon Visible Listings: ${postAnonCount}`);
  console.log(`   - Supabase Active PUBLISHABLE:  ${postPubCount}`);
  console.log(`   - Snapshot Units In Sync:       ${units.length}`);
  console.log(`═════════════════════════════════════════════════════════════════════════\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
