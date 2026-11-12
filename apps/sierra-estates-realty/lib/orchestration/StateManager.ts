import 'server-only';
import { getRecord, insertRecord, updateRecord, getSupabaseAdmin } from '@sierra-estates/db';
import { COLLECTIONS } from '../models/schema';
import { OrchestrationStage } from '../services/orchestrator';

// Linear stage order, used to make stage advances monotonic (forward-only) so
// two concurrent agents can't double-advance or regress the pipeline.
const STAGE_ORDER: OrchestrationStage[] = [
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10',
];
const stageIndex = (s?: string): number =>
  STAGE_ORDER.indexOf(s as OrchestrationStage);

/** The parent row's orchestration bookkeeping, stored in one JSONB column. */
interface OrchestrationState {
  stage?: string;
  status?: string;
  error?: string;
  reviewReason?: string;
  lastTriggeredAt?: string;
  lastCompletedAt?: string;
  failedAt?: string;
  [key: string]: unknown;
}

interface StatefulRow {
  orchestrationState?: OrchestrationState | null;
}

const table = (collection: keyof typeof COLLECTIONS): string => COLLECTIONS[collection];

/**
 * Read the current orchestration state.
 *
 * Firestore addressed these fields with dotted paths ('orchestrationState.stage'),
 * which merged into the parent object server-side. Postgres has no equivalent for
 * a JSONB column through PostgREST, so every mutation is a read-merge-write; the
 * merge is shallow, matching what a dotted-path update did.
 */
async function readState(
  docId: string,
  collection: keyof typeof COLLECTIONS
): Promise<OrchestrationState> {
  const row = await getRecord<StatefulRow>(table(collection), docId);
  return row?.orchestrationState ?? {};
}

async function mergeState(
  docId: string,
  collection: keyof typeof COLLECTIONS,
  patch: OrchestrationState,
  extra?: Record<string, unknown>
): Promise<void> {
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
    docId: string,
    collection: keyof typeof COLLECTIONS,
    stage: OrchestrationStage
  ): Promise<void> {
    await mergeState(docId, collection, {
      stage,
      status: 'processing',
      lastTriggeredAt: new Date().toISOString(),
    });
  }

  /**
   * Translates incoming document-style or agent updates into valid table-specific
   * Postgres column values, merging nested objects into JSONB columns rather than
   * passing dotted keys to PostgREST.
   */
  static buildPayload(
    targetTable: string,
    currentRow: any,
    updates?: Record<string, any>,
    nextState?: OrchestrationState
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (nextState) {
      payload.orchestration_state = nextState;
    }

    if (!updates || Object.keys(updates).length === 0) {
      return payload;
    }

    if (targetTable === 'broker_listings') {
      const intelligence: Record<string, any> = { ...(currentRow?.intelligence || {}) };
      const extractedData: Record<string, any> = {
        ...(currentRow?.extractedData || currentRow?.extracted_data || {}),
      };

      for (const [key, val] of Object.entries(updates)) {
        if (key.startsWith('intelligence.')) {
          const subKey = key.slice('intelligence.'.length);
          intelligence[subKey] = val;
        } else if (key.startsWith('extractedData.') || key.startsWith('extracted_data.')) {
          const subKey = key.replace(/^extracted_?data\./i, '');
          extractedData[subKey] = val;
        } else if (key === 'beds' || key === 'rooms') {
          extractedData.bedrooms = val;
          extractedData.beds = val;
          intelligence.beds = val;
        } else if (key === 'baths' || key === 'bathrooms') {
          extractedData.bathrooms = val;
          extractedData.baths = val;
          intelligence.baths = val;
        } else if (key === 'intelligence' && typeof val === 'object' && val !== null) {
          Object.assign(intelligence, val);
        } else if (
          (key === 'extractedData' || key === 'extracted_data') &&
          typeof val === 'object' &&
          val !== null
        ) {
          Object.assign(extractedData, val);
        } else if (key === 'status') {
          payload.status = val;
        } else if (key === 'isVerified' || key === 'is_verified') {
          payload.is_verified = Boolean(val);
        } else if (key === 'senderInfo' || key === 'sender_info') {
          payload.sender_info = val;
        } else if (key === 'sourceGroup' || key === 'source_group') {
          payload.source_group = val;
        } else if (key === 'sourcePlatform' || key === 'source_platform') {
          payload.source_platform = val;
        } else if (key === 'rawMessage' || key === 'raw_message') {
          payload.raw_message = val;
        } else {
          if (key.includes('.')) {
            const parts = key.split('.');
            let cur = intelligence;
            for (let i = 0; i < parts.length - 1; i++) {
              cur[parts[i]] = cur[parts[i]] || {};
              cur = cur[parts[i]];
            }
            cur[parts[parts.length - 1]] = val;
          } else {
            intelligence[key] = val;
          }
        }
      }

      payload.intelligence = intelligence;
      payload.extracted_data = extractedData;
      payload.updated_at = new Date().toISOString();
      return payload;
    }

    if (targetTable === 'listings') {
      const automation: Record<string, any> = { ...(currentRow?.automation || {}) };

      const KNOWN_LISTING_COLS = new Set([
        'title', 'title_ar', 'description', 'description_ar', 'compound', 'developer',
        'location_area', 'city', 'property_type', 'deal_type', 'price', 'price_currency',
        'bedrooms', 'bathrooms', 'area_sqm', 'finishing_type', 'delivery_year', 'down_payment',
        'installment_years', 'monthly_installment', 'roi_percentage', 'cap_rate',
        'valuation_status', 'status', 'verified', 'publish_to_client', 'code', 'zone',
        'egp_m', 'usd', 'ai_score', 'tag', 'agent', 'ago', 'img', 'photos', 'garden_area',
        'owner_type', 'pf_reference_number', 'pf_status', 'sync_hash', 'sync_source',
        'last_sync_at', 'furnishing_status'
      ]);

      for (const [key, val] of Object.entries(updates)) {
        if (key.startsWith('automation.')) {
          const subKey = key.slice('automation.'.length);
          automation[subKey] = val;
        } else if (key === 'automation' && typeof val === 'object' && val !== null) {
          Object.assign(automation, val);
        } else if (key === 'descriptionEn' || key === 'description') {
          payload.description = val;
        } else if (key === 'descriptionAr' || key === 'description_ar') {
          payload.description_ar = val;
        } else if (key === 'beds' || key === 'rooms' || key === 'bedrooms') {
          payload.bedrooms = Number(val) || 0;
        } else if (key === 'baths' || key === 'bathrooms') {
          payload.bathrooms = Number(val) || 0;
        } else if (key === 'brandedMediaUrls' || key === 'photos') {
          payload.photos = Array.isArray(val) ? val : [val];
        } else if (key === 'tagline') {
          automation.tagline = val;
        } else if (key.includes('.')) {
          const parts = key.split('.');
          let cur = automation;
          for (let i = 0; i < parts.length - 1; i++) {
            cur[parts[i]] = cur[parts[i]] || {};
            cur = cur[parts[i]];
          }
          cur[parts[parts.length - 1]] = val;
        } else {
          const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
          if (KNOWN_LISTING_COLS.has(snakeKey)) {
            payload[snakeKey] = val;
          } else {
            automation[key] = val;
          }
        }
      }

      payload.automation = automation;
      payload.updated_at = new Date().toISOString();
      return payload;
    }

    if (targetTable === 'leads') {
      const aiProfiling: Record<string, any> = {
        ...(currentRow?.aiProfiling || currentRow?.ai_profiling || {}),
      };
      const automation: Record<string, any> = { ...(currentRow?.automation || {}) };
      const metadata: Record<string, any> = { ...(currentRow?.metadata || {}) };

      const KNOWN_LEAD_COLS = new Set([
        'full_name', 'phone', 'email', 'channel', 'lead_type', 'status', 'target_compound',
        'target_property_type', 'budget_min', 'budget_max', 'budget_currency',
        'preferred_bedrooms', 'preferred_delivery_year', 'lead_score', 'assigned_agent_id',
        'summary_notes', 'tags', 'external_message_id', 'source', 'mode', 'zone', 'phase',
        'priority', 'via', 'interest', 'capital_allocation', 'locale', 'stage', 'whatsapp'
      ]);

      for (const [key, val] of Object.entries(updates)) {
        if (key.startsWith('aiProfiling.') || key.startsWith('ai_profiling.')) {
          const subKey = key.replace(/^ai_?profiling\./i, '');
          aiProfiling[subKey] = val;
        } else if (key.startsWith('automation.')) {
          const subKey = key.slice('automation.'.length);
          automation[subKey] = val;
        } else if (key.startsWith('metadata.')) {
          const subKey = key.slice('metadata.'.length);
          metadata[subKey] = val;
        } else if (key.includes('.')) {
          const parts = key.split('.');
          let cur = metadata;
          for (let i = 0; i < parts.length - 1; i++) {
            cur[parts[i]] = cur[parts[i]] || {};
            cur = cur[parts[i]];
          }
          cur[parts[parts.length - 1]] = val;
        } else {
          const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
          if (KNOWN_LEAD_COLS.has(snakeKey)) {
            payload[snakeKey] = val;
          } else {
            metadata[key] = val;
          }
        }
      }

      payload.ai_profiling = aiProfiling;
      payload.automation = automation;
      payload.metadata = metadata;
      return payload;
    }

    // Generic fallback for any other table
    for (const [key, val] of Object.entries(updates)) {
      if (!key.includes('.')) {
        const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        payload[snakeKey] = val;
      }
    }
    return payload;
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
    docId: string,
    collection: keyof typeof COLLECTIONS,
    nextStage: OrchestrationStage,
    updates?: Record<string, any>
  ): Promise<void> {
    const hasUpdates = Boolean(updates && Object.keys(updates).length > 0);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const currentRow = await getRecord<any>(table(collection), docId);
      const current = currentRow?.orchestrationState ?? {};

      // Already at or past the target — apply non-stage updates only, don't regress.
      if (stageIndex(current.stage) >= stageIndex(nextStage)) {
        if (hasUpdates) {
          const payload = StateManager.buildPayload(table(collection), currentRow, updates);
          const { error } = await getSupabaseAdmin()
            .from(table(collection))
            .update(payload)
            .eq('id', docId);
          if (error) {
            throw new Error(`[supabase:completeStage ${table(collection)}] ${error.message}`);
          }
        }
        return;
      }

      const applied = await StateManager.casState(
        docId,
        collection,
        current,
        {
          ...current,
          stage: nextStage,
          status: 'completed',
          lastCompletedAt: new Date().toISOString(),
        },
        updates,
        currentRow
      );

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
  private static async casState(
    docId: string,
    collection: keyof typeof COLLECTIONS,
    observed: OrchestrationState,
    next: OrchestrationState,
    updates?: Record<string, any>,
    currentRow?: any
  ): Promise<boolean> {
    const payload = StateManager.buildPayload(table(collection), currentRow, updates, next);

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
    return (data?.length ?? 0) > 0;
  }

  /**
   * Mark stage as failed with error reason.
   */
  static async failStage(
    docId: string,
    collection: keyof typeof COLLECTIONS,
    stage: OrchestrationStage,
    errorMessage: string
  ): Promise<void> {
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
    docId: string,
    collection: keyof typeof COLLECTIONS,
    stage: OrchestrationStage,
    reason: string
  ): Promise<void> {
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
    docId: string,
    collection: keyof typeof COLLECTIONS,
    updates: Record<string, any>
  ): Promise<void> {
    await updateRecord(table(collection), docId, updates);
  }

  /**
   * Fetch current row state.
   * Agents should call this to read before making decisions.
   */
  static async getDocument(
    docId: string,
    collection: keyof typeof COLLECTIONS
  ): Promise<any> {
    return getRecord(table(collection), docId);
  }

  /**
   * Check if the row exists.
   */
  static async exists(
    docId: string,
    collection: keyof typeof COLLECTIONS
  ): Promise<boolean> {
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
    docId: string,
    collection: keyof typeof COLLECTIONS,
    stage: OrchestrationStage,
    status: string,
    details?: Record<string, any>
  ): Promise<void> {
    await insertRecord('orchestration_history', {
      parentTable: table(collection),
      parentId: docId,
      stage,
      status,
      engineVersion: '12.0.0-quiet-luxury',
      details: details ?? {},
    });
  }
}
