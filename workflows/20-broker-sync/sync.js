'use strict';
/**
 * Workflow 20: Broker & WhatsApp Harvester Sync
 * ─────────────────────────────────────────────────────────────────────────────
 * Aggregates, deduplicates, and synchronizes real-time WhatsApp broker group
 * listings, inbound owner submissions, and buyer requests across all active
 * lines into Google Sheets and Supabase (public.listings).
 *
 * Targets:
 *   - Google Sheets (UNITS_SHEET_ID):
 *       • Brokers_Inventory (verified broker listings with phone)
 *       • Owners_Rent_Master & Owners_Resale_Master (direct owner listings)
 *       • Client_Requests (buyer requests / مطلوب)
 *       • Rejected_No_Mobile (quarantined entries lacking mobile numbers)
 *       • Daily_Outreach_Report (daily ingestion & outreach metrics)
 *   - Supabase:
 *       • public.listings (as REVIEW_REQUIRED with source_channel='whatsapp_broker'
 *         or 'whatsapp_owner')
 *
 * Cadence: every 30 minutes (runner cron lane: every 30 mins).
 * Exit: 0 ok · 1 error · 2 unconfigured
 */

const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const LOCAL_SCRIPT = path.join(__dirname, 'sync-scraped-owners-brokers.mjs');
const SCRIPT_PATH = fs.existsSync(LOCAL_SCRIPT)
  ? LOCAL_SCRIPT
  : path.join(REPO_ROOT, 'scripts', 'sync-scraped-owners-brokers.mjs');
const WORKING_DIR = fs.existsSync(LOCAL_SCRIPT) ? path.resolve(__dirname, '..') : REPO_ROOT;

async function runBrokerSync() {
  console.log(`broker-sync: starting → executing ${path.basename(SCRIPT_PATH)}`);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT_PATH], {
      cwd: WORKING_DIR,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });

    child.stderr.on('data', (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('broker-sync: completed successfully');
        resolve();
      } else {
        const err = new Error(`broker-sync failed with exit code ${code}: ${stderr || stdout}`);
        err.code = code;
        reject(err);
      }
    });
  });
}

if (require.main === module) {
  runBrokerSync()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`broker-sync FAILED: ${err.message}`);
      process.exit(err.code || 1);
    });
}

module.exports = { runBrokerSync };
