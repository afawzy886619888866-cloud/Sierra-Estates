/**
 * CRON: GET /api/cron/price-index
 *
 * Monthly automated snapshot calculation for Sierra Price Index.
 * Computes benchmarks for all New Cairo compounds, updates the
 * snapshot cache, and logs to the activity feed.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET`
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/server/cron-auth';
import { PriceIndexService } from '@/lib/services/PriceIndexService';
import { insertRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  try {
    const nowPeriod = new Date().toISOString().substring(0, 7);
    const index = await PriceIndexService.recordMonthlySnapshot(nowPeriod);

    // Record activity feed entry
    await insertRecord('activities', {
      type: 'price_index_snapshot',
      actorId: 'system',
      actorName: 'Sierra Price Index Cron',
      description: `Monthly price index snapshot recorded for ${nowPeriod} (${index.marketSummary.totalTrackedCompounds} compounds, avg ${index.marketSummary.avgPricePerSqm.toLocaleString()} EGP/m²)`,
      text: `Monthly price index snapshot recorded for ${nowPeriod}`,
      color: 'var(--brand-gold, #c5a880)',
      createdAt: new Date().toISOString(),
    }).catch((err: unknown) => {
      logger.warn({ err }, '[PriceIndexCron] Non-blocking activity record failure');
    });

    return NextResponse.json({
      success: true,
      period: nowPeriod,
      totalCompounds: index.compounds.length,
      avgPricePerSqm: index.marketSummary.avgPricePerSqm,
      publishedAt: index.publishedAt,
    });
  } catch (err: any) {
    logger.error({ err }, '[PriceIndexCron] Failed to record monthly snapshot');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to record snapshot' },
      { status: 500 },
    );
  }
}
