/**
 * POST /api/admin/properties/refresh-freshness — bulk inventory freshness
 * recompute for the Inventory & Freshness Control console (/admin/properties).
 *
 * Executes the public.refresh_all_listing_freshness() RPC (migration 037):
 *   · recomputes listings.freshness_score from updated_at (2 pts/day, floor 20)
 *   · applies the 30-day stale SLA (verified/published rows untouched for a
 *     month are flagged stale)
 *   · returns (refreshed, avg_freshness, fresh_over_90, stale_flagged)
 *
 * The result is written to the operational activity feed so the overview
 * dashboard and the Curator bot run history tell the same story.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, insertRecord } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FreshnessStats {
  refreshed: number;
  avg_freshness: number;
  fresh_over_90: number;
  stale_flagged: number;
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const { data, error } = await getSupabaseAdmin()
      .rpc('refresh_all_listing_freshness');

    if (error) {
      // A database that has not applied migration 037 yet must degrade
      // honestly instead of 500-ing the console.
      return NextResponse.json(
        {
          error:
            'Freshness recompute is unavailable — apply migration 037 (unified command center) first.',
          detail: error.message,
          code: 'FRESHNESS_RPC_MISSING',
        },
        { status: 503 },
      );
    }

    const stats = (Array.isArray(data) ? data[0] : data) as
      | FreshnessStats
      | null
      | undefined;

    const result = {
      refreshed: Number(stats?.refreshed ?? 0),
      avgFreshness: Number(stats?.avg_freshness ?? 0),
      freshOver90: Number(stats?.fresh_over_90 ?? 0),
      staleFlagged: Number(stats?.stale_flagged ?? 0),
    };

    try {
      await insertRecord('activities', {
        type: 'inventory_freshness_recompute',
        actorId: 'system',
        actorName: 'Command Center',
        description: `Freshness recompute: ${result.refreshed} listings refreshed, ${result.staleFlagged} flagged stale (avg ${result.avgFreshness}%)`,
        text: `Freshness recompute — ${result.refreshed} refreshed · ${result.staleFlagged} stale`,
        color: 'var(--blue-light)',
      });
    } catch {
      // Activity feed is best-effort.
    }

    return NextResponse.json({ success: true, stats: result });
  } catch (error) {
    logger.error('[ADMIN_FRESHNESS_REFRESH_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to refresh inventory freshness.' },
      { status: 500 },
    );
  }
}
