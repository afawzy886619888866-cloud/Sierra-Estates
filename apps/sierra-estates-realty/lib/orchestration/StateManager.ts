import 'server-only';
import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS } from '../models/schema';
import { OrchestrationStage } from '../services/orchestrator';
import { Timestamp, type Transaction, type DocumentReference } from 'firebase-admin/firestore';

// Linear stage order, used to make stage advances monotonic (forward-only) so
// two concurrent agents can't double-advance or regress the pipeline.
const STAGE_ORDER: OrchestrationStage[] = [
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10',
];
const stageIndex = (s?: string): number =>
  STAGE_ORDER.indexOf(s as OrchestrationStage);

/**
 * Centralized State Manager for orchestration.
 * Agents call StateManager methods instead of writing to Firestore directly.
 * This creates a seam for:
 * - Testing (mock StateManager)
 * - Auditing (log all state changes)
 * - Consistency (centralized mutation logic)
 */
export class StateManager {
  /**
   * Update document stage and mark as processing.
   */
  static async startStage(
    docId: string,
    collection: keyof typeof COLLECTIONS,
    stage: OrchestrationStage
  ): Promise<void> {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);
    await docRef.update({
      'orchestrationState.stage': stage,
      'orchestrationState.status': 'processing',
      'orchestrationState.lastTriggeredAt': Timestamp.now(),
    });
  }

  /**
   * Mark stage as complete and advance to next.
   *
   * Runs in a transaction with a monotonic (forward-only) guard: if another
   * concurrent agent has already moved the document to `nextStage` or beyond,
   * this advance is skipped so the pipeline can't double-advance or regress.
   * Any non-stage `updates` are still applied.
   */
  static async completeStage(
    docId: string,
    collection: keyof typeof COLLECTIONS,
    nextStage: OrchestrationStage,
    updates?: Record<string, any>
  ): Promise<void> {
    const docRef: DocumentReference = adminDb.collection(COLLECTIONS[collection]).doc(docId);
    await adminDb.runTransaction(async (tx: Transaction) => {
      const snap = await tx.get(docRef);
      const currentStage = snap.data()?.orchestrationState?.stage as string | undefined;

      // Already at or past the target — apply non-stage updates only, don't regress.
      if (stageIndex(currentStage) >= stageIndex(nextStage)) {
        if (updates && Object.keys(updates).length > 0) tx.update(docRef, updates);
        return;
      }

      tx.update(docRef, {
        ...updates,
        'orchestrationState.stage': nextStage,
        'orchestrationState.status': 'completed',
        'orchestrationState.lastCompletedAt': Timestamp.now(),
      });
    });
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
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);
    await docRef.update({
      'orchestrationState.status': 'failed',
      'orchestrationState.error': errorMessage,
      'orchestrationState.failedAt': Timestamp.now(),
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
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);
    await docRef.update({
      'orchestrationState.status': 'waiting_agent_review',
      'orchestrationState.stage': stage,
      'orchestrationState.reviewReason': reason,
      'orchestrationState.pausedAt': Timestamp.now(),
    });
  }

  /**
   * Update any document fields (S1, S2, S3, etc. agent-specific data).
   * Agents call this instead of doing docRef.update() directly.
   */
  static async updateFields(
    docId: string,
    collection: keyof typeof COLLECTIONS,
    updates: Record<string, any>
  ): Promise<void> {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);
    await docRef.update(updates);
  }

  /**
   * Fetch current document state.
   * Agents should call this to read before making decisions.
   */
  static async getDocument(
    docId: string,
    collection: keyof typeof COLLECTIONS
  ): Promise<any> {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);
    const snap = await docRef.get();
    return snap.exists ? snap.data() : null;
  }

  /**
   * Check if document exists.
   */
  static async exists(
    docId: string,
    collection: keyof typeof COLLECTIONS
  ): Promise<boolean> {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);
    const snap = await docRef.get();
    return snap.exists;
  }

  /**
   * Add to orchestration history.
   *
   * Written to an `orchestrationHistory` SUBCOLLECTION (one doc per entry) rather
   * than an array field on the parent — an unbounded `arrayUnion` would eventually
   * blow the 1 MB document-size limit after enough stage transitions.
   */
  static async addHistoryEntry(
    docId: string,
    collection: keyof typeof COLLECTIONS,
    stage: OrchestrationStage,
    status: string,
    details?: Record<string, any>
  ): Promise<void> {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);
    const historyEntry = {
      stage,
      status,
      timestamp: Timestamp.now(),
      engineVersion: '12.0.0-quiet-luxury',
      ...details,
    };

    await docRef.collection('orchestrationHistory').add(historyEntry);
  }
}
