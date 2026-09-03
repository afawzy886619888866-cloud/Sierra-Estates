import { NextRequest, NextResponse } from 'next/server';
import { PFIntegrationService } from '@/lib/services/PFIntegrationService';
import { insertRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { verifyCronRequest } from '@/lib/server/cron-auth';

/**
 * sierra estates — CRON: PROPERTY FINDER LISTING SYNC
 * Runs every 6 hours via Vercel Cron to pull listings from PF into Firestore.
 */

export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  try {
    logger.info('🔄 [CRON] Starting Property Finder listing sync...');

    const summary = await PFIntegrationService.syncIncomingListings();

    if (summary.imported > 0 || summary.updated > 0) {
      await insertRecord('activities', {
        type: 'sync_completed',
        actorId: 'system',
        actorName: 'Sync Gateway',
        description: `PF listing sync: **${summary.imported} new** listings imported, **${summary.updated}** updated.`,
        text: `PF listing sync: **${summary.imported} new** listings imported, **${summary.updated}** updated.`,
        color: 'var(--blue-light)',
        createdAt: new Date().toISOString(),
      });
    }

    logger.info(`✅ [CRON] Listing sync complete: ${summary.imported} imported, ${summary.updated} updated`);

    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('🚨 [CRON] Listing sync failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Listing sync failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
