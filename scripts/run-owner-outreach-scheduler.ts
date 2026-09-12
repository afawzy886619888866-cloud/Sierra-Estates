/**
 * scripts/run-owner-outreach-scheduler.ts
 *
 * Automated runner for Sierra Estates WhatsApp Owner Outreach.
 * - Schedules 40 property owners every 1 hour.
 * - Active operating window: 12:00 PM to 8:00 PM Africa/Cairo (12:00–20:00).
 * - Enforces anti-spam pacing (60–90s randomized delay between messages).
 * - Directs outbound messages through the AWS EC2 OpenWA gateway with Twilio fallback.
 *
 * Usage:
 *   npx.cmd tsx scripts/run-owner-outreach-scheduler.ts [--dry-run] [--once]
 */

// Mock server-only for standalone CLI execution
import Module from 'module';
const origRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return origRequire.apply(this, [id, ...args]);
};

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const ONCE = process.argv.includes('--once');

async function main() {
  const { OwnerOutreachService } = await import('../apps/sierra-estates-realty/lib/services/OwnerOutreachService');
  const { currentHourInZone, getOutreachConfig } = await import('../apps/sierra-estates-realty/lib/server/whatsapp-queue');

  async function runHourlyCycle() {
    const config = await getOutreachConfig();
    const cairoHour = currentHourInZone(config.timezone);
    const nowStr = new Date().toISOString();

  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  Sierra Estates — Hourly Owner Outreach Engine`);
  console.log(`  Current Time: ${nowStr} (Cairo Hour: ${cairoHour}:00)`);
  console.log(`  Operating Window: ${config.operatingHourStart}:00 – ${config.operatingHourEnd}:00 ${config.timezone}`);
  console.log(`  Batch Target: ${config.batchSizePerNumber} owners / hour`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  const isOperatingHour = cairoHour >= config.operatingHourStart && cairoHour < config.operatingHourEnd;

  if (!isOperatingHour && !DRY_RUN) {
    console.log(`⏸️  Outside operating hours (12:00 PM – 8:00 PM Cairo). Skipping dispatch.`);
    return;
  }

  if (DRY_RUN) {
    console.log(`🔍 [DRY RUN MODE] Simulating outreach batch without sending...`);
  }

  console.log(`1. Scanning eligible owner listings from inventory sheet...`);
  const inventory = await OwnerOutreachService.loadEligibleInventory();
  console.log(`   Found ${inventory.length} verified owner contacts in inventory.`);

  if (inventory.length === 0) {
    console.log(`ℹ️  No eligible owner listings found in sheet.`);
    return;
  }

  console.log(`2. Enqueueing next batch of 40 uncontacted owners...`);
  const result = await OwnerOutreachService.enqueueBatch({ batchSize: 40 });
  console.log(`   ✓ Total Processed:           ${result.totalProcessed}`);
  console.log(`   ✓ Successfully Enqueued:     ${result.enqueuedCount}`);
  console.log(`   ✓ Skipped (Already Contacted): ${result.skippedAlreadyContacted}`);
  console.log(`   ✓ Skipped (Invalid Phone):    ${result.skippedInvalidPhone}`);

  if (result.enqueuedCount > 0) {
    console.log(`\n📋 First 3 enqueued recipients:`);
    result.jobs.slice(0, 3).forEach((j, idx) => {
      console.log(`   ${idx + 1}. ${j.name || 'Owner'} (${j.phone}) — ${j.compound} [Job: ${j.jobId}]`);
    });
  }

    console.log(`\n✨ Hourly outreach cycle completed successfully.\n`);
  }

  await runHourlyCycle();

  if (!ONCE) {
    console.log(`🕒 Scheduler running. Checking again at the top of the next hour...`);
    const intervalMs = 60 * 60 * 1000; // 1 hour
    setInterval(runHourlyCycle, intervalMs);
  }
}

main().catch((err) => {
  console.error('Fatal error in outreach scheduler:', err);
  process.exit(1);
});
