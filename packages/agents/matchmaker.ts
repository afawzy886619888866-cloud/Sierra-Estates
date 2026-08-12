import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS } from '../models/schema';
import { instrumentAgent } from '../arize';
import { OrchestrationStage } from '../services/orchestrator';
import { conductPrecisionInterview } from '../services/profiling-service';
import { generateConciergeSelection, generateOptionsPackage } from '../services/sales-engine';
import { generateAgentBriefing } from '../services/handoff-service';
import { runMatchingForLead } from '../services/matching-engine';

/**
 * THE MATCHMAKER: "The Architect of Wealth"
 * Handles Stakeholder Profiling (S6), Neural Synthesis (S7), and Portfolio Proposal (S8).
 */
export const runMatchmaker = async (
  docId: string, 
  collection: keyof typeof COLLECTIONS,
  stage: OrchestrationStage
) => {
  return instrumentAgent('matchmaker', stage, docId, async () => {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);

    if (stage === 'S6') {
      console.log(`[MATCHMAKER] S6: Stakeholder Profiling for ${docId}`);
      
      const leadSnap = await docRef.get();
      const leadData = leadSnap.data();
      const transcript = leadData?.notes || leadData?.lastFeedbackComment || "";

      if (transcript) {
        // Run Precision Profile extraction
        await conductPrecisionInterview(docId, transcript);
      } else {
        console.warn(`[MATCHMAKER] S6: No transcript/notes found for ${docId}. Skipping profile extraction.`);
        await docRef.update({
          'aiProfiling.scoringCompleted': true,
          'orchestrationState.stage': 'S7'
        });
      }
    }

    if (stage === 'S7') {
      console.log(`[MATCHMAKER] S7: Neural Synthesis for ${docId}`);
      
      // 1. Run the Matching Engine
      await runMatchingForLead(docId);

      // 2. Transition to Sales Admin Handoff (V8.2)
      console.log(`[MATCHMAKER] S7.5: Initiating Agent Briefing for ${docId}`);
      await generateAgentBriefing(docId);

      // 3. Pause for Human Confidence
      await docRef.update({
        'orchestrationState.status': 'waiting_agent_review',
        'orchestrationState.stage': 'S8' // Ready for S8 but blocked until approved
      });
    }

    if (stage === 'S8') {
      console.log(`[MATCHMAKER] S8: Portfolio Proposal (Selection Page) for ${docId}`);
      
      // 1. Generate formal Proposal document (for /proposals/[id])
      const proposalId = await generateOptionsPackage(docId);
      console.log(`[MATCHMAKER] S8: Formal Proposal generated: ${proposalId}`);

      // 2. Generate the Concierge Selection URL (for /select/[leadId])
      const selectionUrl = await generateConciergeSelection(docId);
      console.log(`[MATCHMAKER] S8: Selection URL generated: ${selectionUrl}`);

      await docRef.update({
        'orchestrationState.stage': 'S9'
      });
    }

    return { success: true };
  });
};
