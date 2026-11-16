import 'server-only';
import { COLLECTIONS } from '../models/schema';
import { instrumentAgent } from '../arize';
import { OrchestrationStage } from '../services/orchestrator';
import { conductPrecisionInterview } from '../services/profiling-service';
import { generateConciergeSelection, generateOptionsPackage } from '../services/sales-engine';
import { generateAgentBriefing } from '../services/handoff-service';
import { runMatchingForLead } from '../services/matching-engine';
import { StateManager } from '../orchestration/StateManager';
import { logger } from '@/lib/logger';

/**
 * THE MATCHMAKER: "The Architect of Wealth"
 * Handles Stakeholder Profiling (S6), Neural Synthesis (S7), and Portfolio Proposal (S8).
 *
 * Pure agent: only orchestrates logic, doesn't read/write Firestore directly.
 */
export const runMatchmaker = async (
  docId: string,
  collection: keyof typeof COLLECTIONS,
  stage: OrchestrationStage
) => {
  return instrumentAgent('matchmaker', stage, docId, async () => {
    if (stage === 'S6') {
      logger.info(`[MATCHMAKER] S6: Stakeholder Profiling for ${docId}`);

      const leadData = await StateManager.getDocument(docId, collection);
      const transcript = leadData?.notes || leadData?.lastFeedbackComment || '';

      if (transcript) {
        await conductPrecisionInterview(docId, transcript);
      } else {
        logger.warn(`[MATCHMAKER] S6: No transcript found for ${docId}. Skipping profile extraction.`);
        await StateManager.completeStage(docId, collection, 'S7', {
          'aiProfiling.scoringCompleted': true,
        });
      }
    }

    if (stage === 'S7') {
      logger.info(`[MATCHMAKER] S7: Neural Synthesis for ${docId}`);

      await runMatchingForLead(docId);

      logger.info(`[MATCHMAKER] S7.5: Initiating Agent Briefing for ${docId}`);
      await generateAgentBriefing(docId);

      // Pause for human confidence review before S8
      await StateManager.pauseForReview(
        docId,
        collection,
        'S8',
        'Agent review required before portfolio proposal'
      );
    }

    if (stage === 'S8') {
      logger.info(`[MATCHMAKER] S8: Portfolio Proposal (Selection Page) for ${docId}`);

      const proposalId = await generateOptionsPackage(docId);
      logger.info(`[MATCHMAKER] S8: Formal Proposal generated: ${proposalId}`);

      const selectionUrl = await generateConciergeSelection(docId);
      logger.info(`[MATCHMAKER] S8: Selection URL generated: ${selectionUrl}`);

      await StateManager.completeStage(docId, collection, 'S9');
    }

    return { success: true };
  });
};
