import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS } from '../models/schema';
import { instrumentAgent } from '../arize';
import { OrchestrationStage } from '../services/orchestrator';
import { GoogleAIService } from '../server/google-ai';
import { FinancialService } from '../services/financial-service';

/**
 * THE SCRIBE: "The Architect of Truth"
 * Handles Raw Data Intake (S1) and Logical Normalization (S2).
 */
export const runScribe = async (
  docId: string, 
  collection: keyof typeof COLLECTIONS,
  stage: OrchestrationStage
) => {
  return instrumentAgent('scribe', stage, docId, async () => {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(docId);
    const doc = await docRef.get();
    
    if (!doc.exists) throw new Error(`Document ${docId} not found`);
    const data = doc.data();

    if (stage === 'S1') {
      console.log(`[SCRIBE] S1: Raw Data Intake for ${docId}`);
      // In production, S1 handles deduplication and initial validation
      await docRef.update({
        'orchestrationState.stage': 'S2'
      });
    }

    if (stage === 'S2') {
      console.log(`[SCRIBE] S2: Logical Normalization for ${docId}`);
      
      const rawText = data?.rawMessage || data?.description || JSON.stringify(data || {});
      
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
        const resultText = await GoogleAIService.generateContent(
          'scribe', 'S2-Normalization',
          { system: systemPrompt, user: userPrompt },
          { model: 'gemini-flash-latest', jsonMode: true }
        );

        const normalized = JSON.parse(resultText);

        // --- sierra estates UPGRADE: Automated Valuation (S2.5) ---
        const unitData = { ...data, intelligence: { ...data?.intelligence, ...normalized } } as any;
        const valuation = FinancialService.calcAppraisedValue(unitData);

        await docRef.update({
          'intelligence.normalizedAt': new Date().toISOString(),
          'intelligence.building': normalized.building || data?.intelligence?.building || '',
          'intelligence.floor': normalized.floor || data?.intelligence?.floor || '',
          'intelligence.unitNumber': normalized.unitNumber || data?.intelligence?.unitNumber || '',
          'intelligence.finishingGrade': normalized.finishingGrade || '',
          'intelligence.furnishingStatus': normalized.furnishingStatus || '',
          'intelligence.valuation': valuation,
          'beds': normalized.rooms || data?.beds || 0,
          'baths': normalized.bathrooms || data?.baths || 0,
          'orchestrationState.stage': 'S3',
          'orchestrationState.status': 'completed'
        });
      } catch (error) {
        console.error(`[SCRIBE] S2 Error for ${docId}:`, error);
        await docRef.update({
          'orchestrationState.status': 'failed',
          'orchestrationState.error': 'Normalization AI failed'
        });
      }
    }

    return { success: true };
  });
};
