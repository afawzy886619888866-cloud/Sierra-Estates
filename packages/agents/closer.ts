import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS } from '../models/schema';
import { instrumentAgent } from '../arize';
import { OrchestrationStage } from '../services/orchestrator';
import { initiateFeedbackLoop } from '../services/feedback-engine';

/**
 * THE CLOSER: "The Architect of Success"
 * Handles Asset Finalization (S9) and Optimization Feedback (S10).
 */
export const runCloser = async (
  docId: string, 
  collection: keyof typeof COLLECTIONS,
  stage: OrchestrationStage
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
        const saleId = leadData?.wonUnitId || "UNKNOWN_SALE";
        
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
