import { NextRequest, NextResponse } from 'next/server';
import { PFIntegrationService } from '@/lib/services/PFIntegrationService';
import { insertRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { verifyCronRequest } from '@/lib/server/cron-auth';
import { drainWhatsAppQueue } from '@/lib/server/whatsapp-drain';

/**
 * sierra estates — CRON: PROPERTY FINDER LEAD SYNC + WHATSAPP QUEUE DRAIN
 * Scheduled daily via Vercel Cron at 10:00 UTC (13:00 Africa/Cairo in summer,
 * 12:00 in winter — inside the WhatsApp outreach window either way).
 *
 * Two jobs, one trigger (Hobby caps Vercel crons at 2 per project and both
 * slots are taken; GitHub Actions schedules are disabled by the account
 * spending limit):
 *   1. Pull new Property Finder leads so the team starts with a fresh inbox.
 *   2. Drain the WhatsApp greeting/outreach queue (see whatsapp-drain.ts) —
 *      without this piggyback the queue would never drain, since nothing
 *      else is scheduled to run /api/cron/whatsapp-dispatch.
 */
export const maxDuration = 60;

export async function GET(req: NextRequest) {
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

    // Piggyback the daily WhatsApp queue drain (same cron invocation, same
    // auth + cron-owner guard). Fails soft: a drain error must never mark the
    // lead sync itself as failed.
    let whatsapp: Awaited<ReturnType<typeof drainWhatsAppQueue>> | { error: string };
    try {
      whatsapp = await drainWhatsAppQueue();
      logger.info(`📨 [CRON] WhatsApp drain: ${whatsapp.sent} sent, ${whatsapp.failed} failed${'skippedQuota' in whatsapp ? `, ${whatsapp.skippedQuota} quota-skipped` : ''}${whatsapp.skipped ? ` (${whatsapp.skipped})` : ''}`);
    } catch (drainErr: any) {
      whatsapp = { error: drainErr?.message || 'drain failed' };
      logger.error('🚨 [CRON] WhatsApp drain failed (sync unaffected):', drainErr);
    }

    return NextResponse.json({
      success: true,
      summary,
      whatsapp,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("🚨 [CRON] Sync failed:", error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Sync pipeline interrupted',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
