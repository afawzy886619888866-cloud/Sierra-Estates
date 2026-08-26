import 'server-only';
import { COLLECTIONS } from '../models/schema';
import { instrumentAgent } from '../arize';
import { OrchestrationStage } from '../services/orchestrator';
import { FinancialService } from '../services/financial-service';
import { StateManager } from '../orchestration/StateManager';
import { aiService } from '../ai/GoogleAIServiceImpl';

/**
 * THE SCRIBE: "The Architect of Truth"
 * Handles Raw Data Intake (S1) and Logical Normalization (S2).
 *
 * Pure agent: only orchestrates logic, doesn't read/write Firestore directly.
 */
export const runScribe = async (
  docId: string,
  collection: keyof typeof COLLECTIONS,
  stage: OrchestrationStage
) => {
  return instrumentAgent('scribe', stage, docId, async () => {
    // Verify document exists
    const doc = await StateManager.getDocument(docId, collection);
    if (!doc) throw new Error(`Document ${docId} not found`);

    if (stage === 'S1') {
      console.log(`[SCRIBE] S1: Raw Data Intake for ${docId}`);
      // In production, S1 handles deduplication and initial validation
      await StateManager.completeStage(docId, collection, 'S2');
    }

    if (stage === 'S2') {
      console.log(`[SCRIBE] S2: Logical Normalization for ${docId}`);

      const rawText = doc?.rawMessage || doc?.description || JSON.stringify(doc || {});

      const systemPrompt = `You are "The Scribe", the Architect of Truth for Sierra Estates Realty.
Your job is to take raw, messy property data and normalize it into a precise institutional record.
Enforce Sierra Estates standards:
- Identify Compound Name precisely.
- Extract Floor, Building Number, and Unit Number.
- Determine Finishing Grade (e.g., Core & Shell, Semi-finished, Ultra-lux).
- Determine Furnishing Status (F, S, K, U).
- Extract Rooms/Bathrooms.

Output ONLY a JSON object.`;

      const userPrompt = `Normalize this property data:
"${rawText}"`;

      try {
        const normalized = await aiService.generateJSON(
          'scribe', 'S2-Normalization',
          { system: systemPrompt, user: userPrompt },
          { model: 'fast' }
        );

        // --- SIERRA ESTATES UPGRADE: Automated Valuation (S2.5) ---
        const unitData = { ...doc, intelligence: { ...doc?.intelligence, ...normalized } } as any;
        const valuation = FinancialService.calcAppraisedValue(unitData);

        await StateManager.completeStage(docId, collection, 'S3', {
          'intelligence.normalizedAt': new Date().toISOString(),
          'intelligence.building': normalized.building || doc?.intelligence?.building || '',
          'intelligence.floor': normalized.floor || doc?.intelligence?.floor || '',
          'intelligence.unitNumber': normalized.unitNumber || doc?.intelligence?.unitNumber || '',
          'intelligence.finishingGrade': normalized.finishingGrade || '',
          'intelligence.furnishingStatus': normalized.furnishingStatus || '',
          'intelligence.valuation': valuation,
          'beds': normalized.rooms || doc?.beds || 0,
          'baths': normalized.bathrooms || doc?.baths || 0,
        });
      } catch (error) {
        console.error('[SCRIBE] S2 Error', { docId, error });
        await StateManager.failStage(
          docId,
          collection,
          stage,
          'Normalization AI failed'
        );
      }
    }

    return { success: true };
  });
};
