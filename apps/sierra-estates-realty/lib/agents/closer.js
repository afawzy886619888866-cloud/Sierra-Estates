 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import 'server-only';

import { instrumentAgent } from '../arize';

import { initiateFeedbackLoop } from '../services/feedback-engine';
import { StateManager } from '../orchestration/StateManager';

/**
 * THE CLOSER: "The Architect of Success"
 * Handles Asset Finalization (S9) and Optimization Feedback (S10).
 *
 * Pure agent: only orchestrates logic, doesn't read/write Firestore directly.
 */
export const runCloser = async (
  docId,
  collection,
  stage
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
        const saleId = _optionalChain([leadData, 'optionalAccess', _ => _.wonUnitId]) || 'UNKNOWN_SALE';
        await initiateFeedbackLoop(docId, saleId);
      } else {
        await StateManager.completeStage(docId, collection, 'S10');
      }
    }

    return { success: true };
  });
};
