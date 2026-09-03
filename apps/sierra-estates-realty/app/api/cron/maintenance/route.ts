import { NextRequest, NextResponse } from 'next/server';
import { MaintenanceMonitor } from '@/lib/services/MaintenanceMonitor';
import { insertRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { verifyCronRequest } from '@/lib/server/cron-auth';

/**
 * sierra estates — CRON: MAINTENANCE HYGIENE AUDIT
 * Runs daily to flag stale listings and maintain portfolio integrity.
 */

export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  try {
    logger.info("🔄 [CRON] Starting Portfolio Maintenance Audit...");

    const flaggedCount = await MaintenanceMonitor.flagStaleListings();

    // Log maintenance activity to the Supabase activity feed
    if (flaggedCount > 0) {
      await insertRecord('activities', {
        type: 'maintenance_completed',
        actorId: 'system',
        actorName: 'Maintenance Monitor',
        description: `Maintenance Audit: **${flaggedCount} assets** flagged as stale or archived due to inactivity.`,
        text: `Maintenance Audit: **${flaggedCount} assets** flagged as stale or archived due to inactivity.`,
        color: 'var(--amber-light)',
        createdAt: new Date().toISOString(),
      });
    }

    logger.info(`✅ [CRON] Maintenance complete: ${flaggedCount} assets flagged.`);

    return NextResponse.json({
      success: true,
      flaggedCount,
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
