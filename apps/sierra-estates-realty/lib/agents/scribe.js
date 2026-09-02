 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import 'server-only';

import { instrumentAgent } from '../arize';

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
  docId,
  collection,
  stage
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

      const rawText = _optionalChain([doc, 'optionalAccess', _ => _.rawMessage]) || _optionalChain([doc, 'optionalAccess', _2 => _2.description]) || JSON.stringify(doc || {});

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
        const unitData = { ...doc, intelligence: { ..._optionalChain([doc, 'optionalAccess', _3 => _3.intelligence]), ...normalized } } ;
        const valuation = FinancialService.calcAppraisedValue(unitData);

        await StateManager.completeStage(docId, collection, 'S3', {
          'intelligence.normalizedAt': new Date().toISOString(),
          'intelligence.building': normalized.building || _optionalChain([doc, 'optionalAccess', _4 => _4.intelligence, 'optionalAccess', _5 => _5.building]) || '',
          'intelligence.floor': normalized.floor || _optionalChain([doc, 'optionalAccess', _6 => _6.intelligence, 'optionalAccess', _7 => _7.floor]) || '',
          'intelligence.unitNumber': normalized.unitNumber || _optionalChain([doc, 'optionalAccess', _8 => _8.intelligence, 'optionalAccess', _9 => _9.unitNumber]) || '',
          'intelligence.finishingGrade': normalized.finishingGrade || '',
          'intelligence.furnishingStatus': normalized.furnishingStatus || '',
          'intelligence.valuation': valuation,
          'beds': normalized.rooms || _optionalChain([doc, 'optionalAccess', _10 => _10.beds]) || 0,
          'baths': normalized.bathrooms || _optionalChain([doc, 'optionalAccess', _11 => _11.baths]) || 0,
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
