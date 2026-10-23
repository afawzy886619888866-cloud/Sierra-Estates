import 'server-only';
import { COLLECTIONS } from '../models/schema';
import { instrumentAgent } from '../arize';
import { OrchestrationStage } from '../services/orchestrator';
import { initiateFeedbackLoop } from '../services/feedback-engine';
import { StateManager } from '../orchestration/StateManager';

/**
 * THE CLOSER: "The Architect of Success"
 * Handles Asset Finalization (S9) and Optimization Feedback (S10).
 *
 * Pure agent: only orchestrates logic, doesn't read/write Firestore directly.
 */
export const runCloser = async (
  docId: string,
  collection: keyof typeof COLLECTIONS,
  stage: OrchestrationStage
) => {
  return instrumentAgent('closer', stage, docId, async () => {
    if (stage === 'S9') {
      console.log(`[CLOSER] S9: Asset Finalization for ${docId}`);
      await StateManager.completeStage(docId, collection, 'S10', {
        'status': 'published',
      });
    }

    if (stage === 'S10') {
      console.log(`[CLOSER] S10: Optimization Feedback for ${docId}`);

      if (collection === 'stakeholders') {
        const leadData = await StateManager.getDocument(docId, collection);
        const saleId = leadData?.wonUnitId || 'UNKNOWN_SALE';
        await initiateFeedbackLoop(docId, saleId);
      } else {
        await StateManager.completeStage(docId, collection, 'S10');
      }
    }

    return { success: true };
  });
};
