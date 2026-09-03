import { NextResponse } from 'next/server';
import { PFIntegrationService } from '@/lib/services/PFIntegrationService';
import { insertRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { verifyCronRequest } from '@/lib/server/cron-auth';

/**
 * sierra estates — CRON: PROPERTY FINDER LEAD SYNC
 * Runs every 10 minutes via Vercel Cron to pull new leads.
 * This ensures "15-min response time" SLA compliance.
 */

export async function GET(req) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  try {
    logger.info("🔄 [CRON] Starting Property Finder lead sync...");

    const summary = await PFIntegrationService.syncIncomingLeads();

    // Log sync activity
    if (summary.created > 0 || summary.updated > 0) {
      await insertRecord('activities', {
        type: 'sync_completed',
        actorId: 'system',
        actorName: 'Sync Gateway',
        description: `Property Finder sync: **${summary.created} new** leads imported, **${summary.updated}** refreshed.`,
        text: `Property Finder sync: **${summary.created} new** leads imported, **${summary.updated}** refreshed.`,
        color: 'var(--blue-light)',
        createdAt: new Date().toISOString(),
      });
    }

    logger.info(`✅ [CRON] Sync complete: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped`);

    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("🚨 [CRON] Sync failed:", error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Sync pipeline interrupted',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
