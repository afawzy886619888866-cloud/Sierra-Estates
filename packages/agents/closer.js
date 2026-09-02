 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS } from '../models/schema';
import { instrumentAgent } from '../arize';

import { initiateFeedbackLoop } from '../services/feedback-engine';

/**
 * THE CLOSER: "The Architect of Success"
 * Handles Asset Finalization (S9) and Optimization Feedback (S10).
 */
export const runCloser = async (
  docId, 
  collection,
  stage
) => {
  return instrumentAgent('closer', stage, docId, async () => {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);

    if (stage === 'S9') {
      console.log(`[CLOSER] S9: Asset Finalization for ${docId}`);
      // Finalization logic: e.g., legal document review, final pricing check
      await docRef.update({
        'status': 'published',
        'orchestrationState.stage': 'S10'
      });
    }

    if (stage === 'S10') {
      console.log(`[CLOSER] S10: Optimization Feedback for ${docId}`);
      
      if (collection === 'stakeholders') {
        // Trigger the feedback loop for the lead
        // We assume a saleId exists if we reached S10
        const leadSnap = await docRef.get();
        const leadData = leadSnap.data();
        const saleId = _optionalChain([leadData, 'optionalAccess', _ => _.wonUnitId]) || "UNKNOWN_SALE";
        
        await initiateFeedbackLoop(docId, saleId);
      } else {
        await docRef.update({
          'orchestrationState.status': 'completed'
        });
      }
    }

    return { success: true };
  });
};
