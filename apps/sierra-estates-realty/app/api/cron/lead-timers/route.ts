/**
 * CRON: GET /api/cron/lead-timers — Phase 10 lead automation timers.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` (same as the other cron routes).
 *
 * Per run:
 *   1. flip overdue followups ('pending' past due → 'overdue');
 *   2. create REAL followups for leads parked past their stage SLA
 *      (deduped against any open followup for that lead);
 *   3. write one honest summary activity to the admin feed (zero-run says 0).
 *
 * SCHEDULING NOTE: vercel.json deliberately keeps only the two existing
 * Hobby-tier crons (sync-leads, sync-listings). This endpoint is invoked
 * externally (GitHub Actions / EC2 / manual curl with CRON_SECRET) — Phase 11
 * (automation unification) will consolidate scheduling off the Hobby limit.
 */
import { NextRequest, NextResponse } from 'next/server';
import { insertRecord, insertRecords, listRecords, updateRecord } from '@sierra-estates/db';
import { verifyCronRequest } from '@/lib/server/cron-auth';
import {
  selectOverdueFollowups,
  selectStaleLeads,
  type FollowupLike,
  type LeadLike,
} from '@/lib/server/lead-timers';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  try {
    const now = new Date();

    // Active leads + all open-ish followups (bounded read, newest 500).
    const [leads, followups] = await Promise.all([
      listRecords<LeadLike>('leads', {
        where: [{ column: 'archived', value: false }],
        orderBy: { column: 'updatedAt', ascending: false },
        limit: 500,
      }),
      listRecords<FollowupLike & { id: string }>('followups', { limit: 500 }),
    ]);

    // ── 1. Overdue flip ──────────────────────────────────────────────────
    const overdueIds = selectOverdueFollowups(followups, now);
    for (const id of overdueIds) {
      await updateRecord('followups', id, { status: 'overdue', updatedAt: now.toISOString() }).catch((err: unknown) =>
        logger.warn(`[cron/lead-timers] overdue flip failed for ${id}: ${err instanceof Error ? err.message : String(err)}`)
      );
    }

    // ── 2. Stale-lead followups ───────────────────────────────────────────
    const drafts = selectStaleLeads(leads, followups, now);
    if (drafts.length > 0) {
      await insertRecords(
        'followups',
        drafts.map((d) => ({
          ...d,
          status: 'pending',
          createdBy: 'lead-timers',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }))
      );
    }

    // ── 3. Honest summary in the admin activity feed ──────────────────────
    const summary =
      drafts.length === 0 && overdueIds.length === 0
        ? 'Lead timers: no stale leads, no overdue followups (nothing to do).'
        : `Lead timers: ${drafts.length} stale-lead followup(s) created, ${overdueIds.length} followup(s) flipped to overdue.`;
    await insertRecord('activities', {
      type: 'lead_timers_run',
      actorId: 'system',
      actorName: 'Lead Timers',
      description: summary,
      text: summary,
      color: 'var(--blue-light)',
      createdAt: now.toISOString(),
    }).catch((err: unknown) => {
      logger.warn(`[cron/lead-timers] activity write failed: ${err instanceof Error ? err.message : String(err)}`);
    });

    return NextResponse.json({ success: true, created: drafts.length, flippedOverdue: overdueIds.length });
  } catch (error) {
    logger.error('[cron/lead-timers] run failed:', error);
    return NextResponse.json(
      { error: 'Lead timers run failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
