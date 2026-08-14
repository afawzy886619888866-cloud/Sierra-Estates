import { NextRequest, NextResponse } from 'next/server';
import { MaintenanceMonitor } from '@/lib/services/MaintenanceMonitor';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

/**
 * sierra estates — CRON: MAINTENANCE HYGIENE AUDIT
 * Runs daily to flag stale listings and maintain portfolio integrity.
 */

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info("🔄 [CRON] Starting Portfolio Maintenance Audit...");

    const flaggedCount = await MaintenanceMonitor.flagStaleListings();

    // Log maintenance activity using adminDb
    if (flaggedCount > 0) {
      await adminDb.collection(COLLECTIONS.activities).add({
        type: 'maintenance_completed',
        actorId: 'system',
        actorName: 'Maintenance Monitor',
        description: `Maintenance Audit: **${flaggedCount} assets** flagged as stale or archived due to inactivity.`,
        text: `Maintenance Audit: **${flaggedCount} assets** flagged as stale or archived due to inactivity.`,
        color: 'var(--amber-light)',
        createdAt: Timestamp.now(),
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
