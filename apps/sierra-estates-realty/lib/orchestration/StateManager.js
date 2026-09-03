 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import 'server-only';
import { getRecord, insertRecord, updateRecord, getSupabaseAdmin } from '@sierra-estates/db';
import { COLLECTIONS } from '../models/schema';


// Linear stage order, used to make stage advances monotonic (forward-only) so
// two concurrent agents can't double-advance or regress the pipeline.
const STAGE_ORDER = [
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10',
];
const stageIndex = (s) =>
  STAGE_ORDER.indexOf(s );

/** The parent row's orchestration bookkeeping, stored in one JSONB column. */















const table = (collection) => COLLECTIONS[collection];

/**
 * Read the current orchestration state.
 *
 * Firestore addressed these fields with dotted paths ('orchestrationState.stage'),
 * which merged into the parent object server-side. Postgres has no equivalent for
 * a JSONB column through PostgREST, so every mutation is a read-merge-write; the
 * merge is shallow, matching what a dotted-path update did.
 */
async function readState(
  docId,
  collection
) {
  const row = await getRecord(table(collection), docId);
  return _nullishCoalesce(_optionalChain([row, 'optionalAccess', _ => _.orchestrationState]), () => ( {}));
}

async function mergeState(
  docId,
  collection,
  patch,
  extra
) {
  const current = await readState(docId, collection);
  await updateRecord(table(collection), docId, {
    ...extra,
    orchestrationState: { ...current, ...patch },
  });
}

/**
 * Centralized State Manager for orchestration.
 * Agents call StateManager methods instead of writing to the database directly.
 * This creates a seam for:
 * - Testing (mock StateManager)
 * - Auditing (log all state changes)
 * - Consistency (centralized mutation logic)
 */
export class StateManager {
  /**
   * Update row stage and mark as processing.
   */
  static async startStage(
    docId,
    collection,
    stage
  ) {
    await mergeState(docId, collection, {
      stage,
      status: 'processing',
      lastTriggeredAt: new Date().toISOString(),
    });
  }

  /**
   * Mark stage as complete and advance to next.
   *
   * Monotonic (forward-only): if another concurrent agent has already moved the
   * row to `nextStage` or beyond, this advance is skipped so the pipeline can't
   * double-advance or regress. Any non-stage `updates` are still applied.
   *
   * Firestore enforced this inside runTransaction. The Postgres equivalent is a
   * compare-and-set: the UPDATE only matches while the stage is still the one we
   * read, so a racing writer invalidates it and we re-read and re-decide. Without
   * the guard a lost update could silently skip a stage.
   */
  static async completeStage(
    docId,
    collection,
    nextStage,
    updates
  ) {
    const hasUpdates = Boolean(updates && Object.keys(updates).length > 0);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const current = await readState(docId, collection);

      // Already at or past the target — apply non-stage updates only, don't regress.
      if (stageIndex(current.stage) >= stageIndex(nextStage)) {
        if (hasUpdates) await updateRecord(table(collection), docId, updates);
        return;
      }

      const applied = await StateManager.casState(docId, collection, current, {
        ...current,
        stage: nextStage,
        status: 'completed',
        lastCompletedAt: new Date().toISOString(),
      }, updates);

      if (applied) return;
    }

    throw new Error(
      `[StateManager] completeStage(${docId} -> ${nextStage}) lost the compare-and-set race 5 times; ` +
      'another writer is advancing the same row continuously.'
    );
  }

  /**
   * Write `next` only while the stored stage still equals the one in `observed`.
   * Returns false when a concurrent writer moved it first, so the caller re-reads.
   *
   * `is`/`eq` on a JSONB path needs the raw client: the record layer snake_cases
   * column names, which would corrupt the path expression. Keys inside JSONB are
   * stored snake_cased by that same layer, hence `->>stage` (single word, so
   * unchanged) is safe to address directly.
   */
   static async casState(
    docId,
    collection,
    observed,
    next,
    updates
  ) {
    const payload = {
      ...(_nullishCoalesce(updates, () => ( {}))),
      orchestration_state: next,
    };

    let query = getSupabaseAdmin()
      .from(table(collection))
      .update(payload)
      .eq('id', docId);

    query = observed.stage
      ? query.eq('orchestration_state->>stage', observed.stage)
      : query.is('orchestration_state->>stage', null);

    const { data, error } = await query.select('id');
    if (error) {
      throw new Error(`[supabase:completeStage ${table(collection)}] ${error.message}`);
    }
    return (_nullishCoalesce(_optionalChain([data, 'optionalAccess', _2 => _2.length]), () => ( 0))) > 0;
  }

  /**
   * Mark stage as failed with error reason.
   */
  static async failStage(
    docId,
    collection,
    stage,
    errorMessage
  ) {
    await mergeState(docId, collection, {
      status: 'failed',
      error: errorMessage,
      failedAt: new Date().toISOString(),
    });
  }

  /**
   * Pause pipeline for human review.
   */
  static async pauseForReview(
    docId,
    collection,
    stage,
    reason
  ) {
    await mergeState(docId, collection, {
      status: 'waiting_agent_review',
      stage,
      reviewReason: reason,
    });
  }

  /**
   * Update any row fields (S1, S2, S3, etc. agent-specific data).
   * Agents call this instead of writing to the table directly.
   */
  static async updateFields(
    docId,
    collection,
    updates
  ) {
    await updateRecord(table(collection), docId, updates);
  }

  /**
   * Fetch current row state.
   * Agents should call this to read before making decisions.
   */
  static async getDocument(
    docId,
    collection
  ) {
    return getRecord(table(collection), docId);
  }

  /**
   * Check if the row exists.
   */
  static async exists(
    docId,
    collection
  ) {
    const row = await getRecord(table(collection), docId, 'id');
    return row !== null;
  }

  /**
   * Add to orchestration history.
   *
   * Firestore kept this in an `orchestrationHistory` SUBCOLLECTION (one doc per
   * entry) rather than an array field on the parent, because an unbounded
   * arrayUnion would eventually blow the 1 MB document-size limit. The Postgres
   * equivalent is a separate append-only table keyed by (parent table, parent id),
   * which keeps the same unbounded-log shape.
   */
  static async addHistoryEntry(
    docId,
    collection,
    stage,
    status,
    details
  ) {
    await insertRecord('orchestration_history', {
      parentTable: table(collection),
      parentId: docId,
      stage,
      status,
      engineVersion: '12.0.0-quiet-luxury',
      details: _nullishCoalesce(details, () => ( {})),
    });
  }
}
