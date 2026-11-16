/**
 * SIERRA ESTATES — ADMIN DASHBOARD METRICS
 *
 * Reference logic for the incoming admin dashboard UI. No JSX/UI here —
 * the next frontend session wires this into whatever the designer's HTML
 * produces. Pattern (parallel aggregate counts + recent-activity list +
 * sync health) is adapted from an older sibling repo's dashboard, but the
 * queries below are rewritten against this repo's ACTUAL schema
 * (lib/models/schema.ts) — the sibling repo queried a `deals`/`sync_jobs`
 * schema that doesn't exist here, and its "S1-S10 pipeline" numbers were
 * hardcoded placeholders, not live data. Do not reintroduce that pattern.
 */

import { countRecords, listRecords } from '@sierra-estates/db';
import { COLLECTIONS, type Lead, type PipelineStage } from '../models/schema';
import { logger } from '../logger';

export interface DashboardKPIs {
  totalUnits: number;
  activeLeads: number;
  recentActivityCount: number;
  syncStatus: string | null;
}

export interface RecentLeadActivity {
  id: string;
  name: string;
  stage: PipelineStage;
  source: Lead['source'];
  updatedAt: unknown;
  budget?: number;
}

/** All PipelineStage values except the closed-won terminal state. */
const ACTIVE_STAGES: PipelineStage[] = [
  'inbound', 'qualify', 'engage', 'proposal', 'viewing', 'negotiate', 'reserve', 'contract', 'handover',
];

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  try {
    const [totalUnits, activeLeads, recent, sync] = await Promise.all([
      countRecords(COLLECTIONS.units),
      countRecords(COLLECTIONS.stakeholders, [{ column: 'stage', op: 'in', value: ACTIVE_STAGES }]),
      listRecords(COLLECTIONS.stakeholders, {
        orderBy: { column: 'updatedAt', ascending: false },
        limit: 8,
        select: 'id',
      }),
      listRecords<{ status?: string }>(COLLECTIONS.syncLog, {
        orderBy: { column: 'createdAt', ascending: false },
        limit: 1,
      }),
    ]);

    return {
      totalUnits,
      activeLeads,
      recentActivityCount: recent.length,
      syncStatus: sync[0]?.status ?? null,
    };
  } catch (err) {
    logger.error('getDashboardKPIs failed:', err);
    return { totalUnits: 0, activeLeads: 0, recentActivityCount: 0, syncStatus: null };
  }
}

/** Live count per real PipelineStage (replaces the sibling repo's hardcoded S1-S10 numbers). */
export async function getPipelineStageBreakdown(): Promise<Record<PipelineStage, number>> {
  const stages: PipelineStage[] = [...ACTIVE_STAGES, 'closed-won'];
  const counts = await Promise.all(
    stages.map((stage) =>
      countRecords(COLLECTIONS.stakeholders, [{ column: 'stage', value: stage }])
        .catch((err) => {
          logger.error(`getPipelineStageBreakdown failed for stage=${stage}:`, err);
          return 0;
        })
    )
  );
  return Object.fromEntries(stages.map((s, i) => [s, counts[i]])) as Record<PipelineStage, number>;
}

export async function getRecentLeadActivity(max = 8): Promise<RecentLeadActivity[]> {
  try {
    const rows = await listRecords<Lead & { id: string; fullName?: string }>(
      COLLECTIONS.stakeholders,
      { orderBy: { column: 'updatedAt', ascending: false }, limit: max }
    );
    // `full_name` is the column; the admin API is what renames it to `name`.
    return rows.map((data) => ({
      id: data.id,
      name: data.fullName ?? data.name,
      stage: data.stage,
      source: data.source,
      updatedAt: data.updatedAt,
      budget: data.budget,
    }));
  } catch (err) {
    logger.error('getRecentLeadActivity failed:', err);
    return [];
  }
}
