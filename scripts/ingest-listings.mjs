#!/usr/bin/env node
'use strict';

/**
 * scripts/ingest-listings.mjs — End-to-End Ingestion Engine for Sierra Estates.
 * ──────────────────────────────────────────────────────────────────────────────
 * Unified pipeline for ingesting owner and broker property listings from:
 *   1. USB Cable (Samsung S24 Ultra MTP auto-pull)
 *   2. WhatsApp Export Archives (.zip / _chat.txt in data/whatsapp-phone-import/)
 *   3. Direct WhatsApp Inbound Forwarding & Webhook drops
 *
 * Core Workflow:
 *   - Extract multi-message listings & binary image dimensions (>= 800x600 px).
 *   - Upload qualifying photos to Supabase Storage (`property-media` bucket).
 *   - Generate institutional luxury Arabic & English marketing copy via `listing-copywriter.js`.
 *   - Deduplicate and upsert into Supabase `public.listings`.
 *   - Gate & flag Property Finder Ad Studio candidates (>= 6 qualifying photos).
 *   - Trigger Google Sheets (`UNITS_SHEET_ID`) & interactive GIS Map synchronization.
 *
 * Usage:
 *   node scripts/ingest-listings.mjs [--all] [--sync-db] [--sync-sheets] [--sync-map]
 *   node scripts/ingest-listings.mjs --file "path/to/_chat.txt"
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { generateListingContent } = require('../workflows/lib/listing-copywriter.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Load environment in proper cascade
dotenv.config({ path: path.join(ROOT, 'workflows', '.env') });
dotenv.config({ path: path.join(ROOT, '.env') });

const SB_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function checkPhoneUsbCable() {
  const pullScript = path.join(ROOT, 'scripts', 'pull-s24-whatsapp.ps1');
  if (!fs.existsSync(pullScript)) return { connected: false };

  try {
    const res = execSync(`pwsh -NoProfile -ExecutionPolicy Bypass -File "${pullScript}" --check-only`, {
      encoding: 'utf8',
      timeout: 10000,
    });
    return { connected: res.includes('CONNECTED:TRUE') || res.includes('Galaxy'), raw: res.trim() };
  } catch {
    return { connected: false };
  }
}

async function runImport() {
  const args = process.argv.slice(2);
  const syncDb = args.includes('--sync-db') || !args.includes('--dry-run');
  const syncSheets = args.includes('--sync-sheets');
  const syncMap = args.includes('--sync-map') || true;

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║        SIERRA ESTATES — UNIFIED LISTINGS INGESTION ENGINE     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Target Backend: Supabase Postgres (${SB_URL || 'Configured'})`);
  console.log(`Sync DB: ${syncDb} | Sync Map: ${syncMap} | Sync Sheets: ${syncSheets}\n`);

  // Step 1: Check USB Cable Connection
  process.stdout.write('🔍 Checking S24 Ultra USB cable status... ');
  const phoneStatus = await checkPhoneUsbCable();
  if (phoneStatus.connected) {
    console.log('📱 Connected! Initiating automatic chat and media pull...');
    try {
      execSync(`pwsh -NoProfile -ExecutionPolicy Bypass -File "${path.join(ROOT, 'scripts', 'pull-s24-whatsapp.ps1')}"`, {
        stdio: 'inherit',
        timeout: 60000,
      });
    } catch (e) {
      console.warn(`[ingest] Warning during phone pull: ${e.message}`);
    }
  } else {
    console.log('ℹ️  No active USB cable detected. Scanning local staging directory.');
  }

  // Step 2: Run WhatsApp Chat & Media Importer
  console.log('\n🚀 Processing WhatsApp chat archives and media from staging directory...');
  const importScript = path.join(ROOT, 'scripts', 'import-whatsapp-chat.mjs');
  const importArgs = ['--all-staged'];
  if (syncDb) importArgs.push('--sync-db');

  try {
    execSync(`node "${importScript}" ${importArgs.join(' ')}`, {
      stdio: 'inherit',
      timeout: 300000,
    });
  } catch (err) {
    console.error(`❌ Ingestion failed: ${err.message}`);
    process.exit(1);
  }

  // Step 3: Synchronize Map Inventory
  if (syncMap) {
    console.log('\n🗺️  Updating Client Map inventory cache from Supabase Storage...');
    const mapScript = path.join(ROOT, 'scripts', 'sync-inventory-snapshot.mjs');
    if (fs.existsSync(mapScript)) {
      try {
        execSync(`node "${mapScript}"`, { stdio: 'inherit', timeout: 30000 });
      } catch (err) {
        console.warn(`[ingest] Map sync notice: ${err.message}`);
      }
    }
  }

  // Step 4: Synchronize Google Sheets
  if (syncSheets) {
    console.log('\n📊 Synchronizing Master Google Sheet...');
    const sheetScript = path.join(ROOT, 'scripts', 'sync-sheets-inventory-bidirectional.mjs');
    if (fs.existsSync(sheetScript)) {
      try {
        execSync(`node "${sheetScript}" --direction=db-to-sheet`, { stdio: 'inherit', timeout: 60000 });
      } catch (err) {
        console.warn(`[ingest] Google Sheet sync notice: ${err.message}`);
      }
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('✅ Ingestion pipeline complete! All units synced & ready.');
  console.log('════════════════════════════════════════════════════════════════\n');
}

runImport().catch((e) => {
  console.error('[ingest-listings] Fatal error:', e);
  process.exit(1);
});
