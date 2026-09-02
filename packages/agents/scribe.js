 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS } from '../models/schema';
import { instrumentAgent } from '../arize';

import { GoogleAIService } from '../server/google-ai';
import { FinancialService } from '../services/financial-service';

/**
 * THE SCRIBE: "The Architect of Truth"
 * Handles Raw Data Intake (S1) and Logical Normalization (S2).
 */
export const runScribe = async (
  docId, 
  collection,
  stage
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
      
      const rawText = _optionalChain([data, 'optionalAccess', _ => _.rawMessage]) || _optionalChain([data, 'optionalAccess', _2 => _2.description]) || JSON.stringify(data || {});
      
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
        const unitData = { ...data, intelligence: { ..._optionalChain([data, 'optionalAccess', _3 => _3.intelligence]), ...normalized } } ;
        const valuation = FinancialService.calcAppraisedValue(unitData);

        await docRef.update({
          'intelligence.normalizedAt': new Date().toISOString(),
          'intelligence.building': normalized.building || _optionalChain([data, 'optionalAccess', _4 => _4.intelligence, 'optionalAccess', _5 => _5.building]) || '',
          'intelligence.floor': normalized.floor || _optionalChain([data, 'optionalAccess', _6 => _6.intelligence, 'optionalAccess', _7 => _7.floor]) || '',
          'intelligence.unitNumber': normalized.unitNumber || _optionalChain([data, 'optionalAccess', _8 => _8.intelligence, 'optionalAccess', _9 => _9.unitNumber]) || '',
          'intelligence.finishingGrade': normalized.finishingGrade || '',
          'intelligence.furnishingStatus': normalized.furnishingStatus || '',
          'intelligence.valuation': valuation,
          'beds': normalized.rooms || _optionalChain([data, 'optionalAccess', _10 => _10.beds]) || 0,
          'baths': normalized.bathrooms || _optionalChain([data, 'optionalAccess', _11 => _11.baths]) || 0,
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
