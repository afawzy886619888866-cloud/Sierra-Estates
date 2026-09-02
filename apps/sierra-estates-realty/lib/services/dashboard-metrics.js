 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }/**
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

import { db } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from 'firebase/firestore';
import { COLLECTIONS, } from '../models/schema';
import { logger } from '../logger';

















/** All PipelineStage values except the closed-won terminal state. */
const ACTIVE_STAGES = [
  'inbound', 'qualify', 'engage', 'proposal', 'viewing', 'negotiate', 'reserve', 'contract', 'handover',
];

export async function getDashboardKPIs() {
  try {
    const [unitsSnap, activeSnap, recentSnap, syncSnap] = await Promise.all([
      getCountFromServer(collection(db, COLLECTIONS.units)),
      getCountFromServer(query(collection(db, COLLECTIONS.stakeholders), where('stage', 'in', ACTIVE_STAGES))),
      getDocs(query(collection(db, COLLECTIONS.stakeholders), orderBy('updatedAt', 'desc'), limit(8))),
      getDocs(query(collection(db, COLLECTIONS.syncLog), orderBy('createdAt', 'desc'), limit(1))),
    ]);

    return {
      totalUnits: unitsSnap.data().count,
      activeLeads: activeSnap.data().count,
      recentActivityCount: recentSnap.size,
      syncStatus: syncSnap.empty ? null : _nullishCoalesce((syncSnap.docs[0].data().status ), () => ( null)),
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
      getCountFromServer(query(collection(db, COLLECTIONS.stakeholders), where('stage', '==', stage)))
        .then((snap) => snap.data().count)
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
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.stakeholders), orderBy('updatedAt', 'desc'), limit(max))
    );
    return snap.docs.map((d) => {
      const data = d.data() ;
      return { id: d.id, name: data.name, stage: data.stage, source: data.source, updatedAt: data.updatedAt, budget: data.budget };
    });
  } catch (err) {
    logger.error('getRecentLeadActivity failed:', err);
    return [];
  }
}
