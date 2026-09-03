 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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
import { COLLECTIONS, } from '../models/schema';
import { logger } from '../logger';

















/** All PipelineStage values except the closed-won terminal state. */
const ACTIVE_STAGES = [
  'inbound', 'qualify', 'engage', 'proposal', 'viewing', 'negotiate', 'reserve', 'contract', 'handover',
];

export async function getDashboardKPIs() {
  try {
    const [totalUnits, activeLeads, recent, sync] = await Promise.all([
      countRecords(COLLECTIONS.units),
      countRecords(COLLECTIONS.stakeholders, [{ column: 'stage', op: 'in', value: ACTIVE_STAGES }]),
      listRecords(COLLECTIONS.stakeholders, {
        orderBy: { column: 'updatedAt', ascending: false },
        limit: 8,
        select: 'id',
      }),
      listRecords(COLLECTIONS.syncLog, {
        orderBy: { column: 'createdAt', ascending: false },
        limit: 1,
      }),
    ]);

    return {
      totalUnits,
      activeLeads,
      recentActivityCount: recent.length,
      syncStatus: _nullishCoalesce(_optionalChain([sync, 'access', _ => _[0], 'optionalAccess', _2 => _2.status]), () => ( null)),
    };
  } catch (err) {
    logger.error('getDashboardKPIs failed:', err);
    return { totalUnits: 0, activeLeads: 0, recentActivityCount: 0, syncStatus: null };
  }
}

/** Live count per real PipelineStage (replaces the sibling repo's hardcoded S1-S10 numbers). */
export async function getPipelineStageBreakdown() {
  const stages = [...ACTIVE_STAGES, 'closed-won'];
  const counts = await Promise.all(
    stages.map((stage) =>
      countRecords(COLLECTIONS.stakeholders, [{ column: 'stage', value: stage }])
        .catch((err) => {
          logger.error(`getPipelineStageBreakdown failed for stage=${stage}:`, err);
          return 0;
        })
    )
  );
  return Object.fromEntries(stages.map((s, i) => [s, counts[i]])) ;
}

export async function getRecentLeadActivity(max = 8) {
  try {
    const rows = await listRecords(
      COLLECTIONS.stakeholders,
      { orderBy: { column: 'updatedAt', ascending: false }, limit: max }
    );
    // `full_name` is the column; the admin API is what renames it to `name`.
    return rows.map((data) => ({
      id: data.id,
      name: _nullishCoalesce(data.fullName, () => ( data.name)),
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
