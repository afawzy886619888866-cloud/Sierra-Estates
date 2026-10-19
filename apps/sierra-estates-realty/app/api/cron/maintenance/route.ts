import { NextRequest, NextResponse } from 'next/server';
import { MaintenanceMonitor } from '@/lib/services/MaintenanceMonitor';
import { insertRecord, listRecords } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { verifyCronRequest } from '@/lib/server/cron-auth';
import { getInventoryService } from '@/lib/services/inventory/ingest-bridge';
import type { InventoryListing } from '@/lib/services/inventory/types';

/**
 * sierra estates — CRON: MAINTENANCE HYGIENE AUDIT
 * Runs daily to flag stale listings and maintain portfolio integrity.
 *
 * G2 wiring (2026-10-19): the canonical 30-day freshness SLA
 * (InventoryDomainService.sweepStale — README integration step 2) now runs
 * alongside the legacy MaintenanceMonitor flagging. Published listings whose
 * verifiedAt is older than FRESHNESS_SLA_DAYS transition to `expired` through
 * the guarded lifecycle (audited status_history entry), which removes them
 * from the public site until a human re-verifies them.
 */

/** Batch size per sweep pass — keeps the cron inside a single request budget. */
const SWEEP_BATCH_SIZE = 500;

export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  try {
    logger.info("🔄 [CRON] Starting Portfolio Maintenance Audit...");

    const flaggedCount = await MaintenanceMonitor.flagStaleListings();

    // ── Canonical freshness sweep (G2 wiring) ────────────────────────────────
    // Only `published` rows with a verifiedAt timestamp are sweep-eligible;
    // the service re-checks staleness and drives the guarded transition.
    let sweptIds: string[] = [];
    try {
      const publishedRows = await listRecords<InventoryListing>('listings', {
        where: [{ column: 'status', op: 'eq', value: 'published' }],
        limit: SWEEP_BATCH_SIZE,
      });
      sweptIds = await getInventoryService().sweepStale(publishedRows);
      if (sweptIds.length > 0) {
        logger.info(`[CRON] Freshness sweep: ${sweptIds.length} published listings expired (30d SLA).`);
      }
    } catch (sweepErr) {
      // Honest failure: the sweep problem is reported, never swallowed — but
      // it must not erase the legacy flagging result above.
      logger.error('🚨 [CRON] Canonical freshness sweep failed:', sweepErr);
      return NextResponse.json({
        success: false,
        error: `Freshness sweep failed: ${sweepErr instanceof Error ? sweepErr.message : String(sweepErr)}`,
        flaggedCount,
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }

    // Log maintenance activity to the Supabase activity feed
    if (flaggedCount > 0 || sweptIds.length > 0) {
      await insertRecord('activities', {
        type: 'maintenance_completed',
        actorId: 'system',
        actorName: 'Maintenance Monitor',
        description: `Maintenance Audit: **${flaggedCount} assets** flagged as stale or archived due to inactivity. **${sweptIds.length} published listings** expired by the 30-day freshness SLA.`,
        text: `Maintenance Audit: **${flaggedCount} assets** flagged as stale or archived due to inactivity. **${sweptIds.length} published listings** expired by the 30-day freshness SLA.`,
        color: 'var(--amber-light)',
        createdAt: new Date().toISOString(),
      });
    }

    logger.info(`✅ [CRON] Maintenance complete: ${flaggedCount} assets flagged, ${sweptIds.length} expired by freshness SLA.`);

    return NextResponse.json({
      success: true,
      flaggedCount,
      sweptCount: sweptIds.length,
      sweptIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("🚨 [CRON] Maintenance failed:", error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Maintenance pipeline interrupted',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
