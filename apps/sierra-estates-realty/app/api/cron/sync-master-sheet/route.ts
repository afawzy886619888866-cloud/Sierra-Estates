/**
 * CRON: GET /api/cron/sync-master-sheet
 *
 * Scheduled trigger for the canonical owner-inventory pipeline
 * (syncMasterOwnerSheet → the `units` collection, the single source of truth
 * for the AI Closer Agent, semantic search, admin, and the public inventory
 * map — see lib/services/inventory-query.ts). Previously this sync only ran
 * on an ad-hoc POST to /api/sync/master-sheet with no schedule at all, so
 * `units` never refreshed automatically.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` (matches the other cron routes).
 */
import { NextRequest, NextResponse } from 'next/server';
import { syncMasterOwnerSheet } from '@/lib/services/master-sheet-sync';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncMasterOwnerSheet();
  if (!result.success) {
    logger.error(`[cron/sync-master-sheet] failed: ${result.error}`);
    return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  }

  logger.info(`[cron/sync-master-sheet] synced ${result.count} units`);
  return NextResponse.json({
    success: true,
    count: result.count,
    timestamp: new Date().toISOString(),
  });
}
