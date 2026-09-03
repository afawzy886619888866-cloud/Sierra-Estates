 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * sierra estates — STAGE 9: STRATEGIC ACQUISITION ENGINE
 * Orchestrates contract synthesis, stakeholder verification, and commission processing.
 */

import { getRecord, insertRecord, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS, } from '../models/schema';
import { sendTelegramMessage } from './telegram-controller';
import { initiateFeedbackLoop } from './feedback-engine';
import { GoogleAIService } from '../server/google-ai';
import { logger } from '@/lib/logger';

/**
 * Initiates the formal Closing Protocol for a Strategic Acquisition.
 * Includes Asset reservation and Contract Synthesis.
 */
export async function initiateClosing(
  leadId,
  unitId,
  agentId,
  salePrice,
  commissionPercent = 2.5
) {
  // ─── VALIDATION: Ensure Asset Availability ──────────────────────
  const unit = await getRecord(COLLECTIONS.units, unitId);
  if (_optionalChain([unit, 'optionalAccess', _ => _.status]) === 'sold') {
    throw new Error(`[Strategic Acquisition Error] Asset ${unitId} is already marked as SOLD.`);
  }

  const commissionAmount = (salePrice * commissionPercent) / 100;

  const saleData = {
    leadId,
    unitId,
    agentId,
    salePrice,
    commissionPercent,
    commissionAmount,
    status: 'pending',
    closingDate: new Date().toISOString(),
  };

  const sale = await insertRecord(COLLECTIONS.sales, saleData);

  // Generate Contract Preview URL (Simulated)
  const contractUrl = `https://sierraestates.luxury/contracts/preview/${sale.id}`;

  // Update unit status to 'reserved'
  await updateRecord(COLLECTIONS.units, unitId, { status: 'reserved' });

  // Update Stakeholder (Lead) State. `orchestrationState` and `intelligence`
  // are single JSONB columns, so the dotted paths become merges.
  const lead = await getRecord(COLLECTIONS.stakeholders, leadId);
  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    orchestrationState: {
      ...(_nullishCoalesce(_optionalChain([lead, 'optionalAccess', _2 => _2.orchestrationState]), () => ( {}))),
      stage: 'S9_ACQUISITION_IN_PROGRESS',
    },
    intelligence: { ...(_nullishCoalesce(_optionalChain([lead, 'optionalAccess', _3 => _3.intelligence]), () => ( {}))), contractUrl },
  });

  await sendTelegramMessage(`💎 <b>Strategic Acquisition Initiated</b>\nContract synthesised for Asset: ${unitId}. Awaiting stakeholder affirmation.`);

  return sale.id;
}

/**
 * Finalizes the sale, marks unit as sold, and triggers the feedback loop.
 */
export async function finalizeSale(saleId) {
  const sale = await getRecord(COLLECTIONS.sales, saleId);
  if (!sale) return;

  await updateRecord(COLLECTIONS.sales, saleId, { status: 'completed' });

  // Mark Signature Asset as Sold in Global Registry
  await updateRecord(COLLECTIONS.units, sale.unitId, { status: 'sold' });

  // Trigger Stage 10: High-Fidelity Feedback Loop
  await initiateFeedbackLoop(sale.leadId, saleId);

  await sendTelegramMessage(`🏆 <b>Strategic Acquisition Finalized</b>\nCommission Affirmation: ${sale.commissionAmount} EGP\nTransitioning to Stage 10: Mission Feedback.`);
}

/**
 * Generates an AI-powered Strategic Acquisition Summary (Contract Preview).
 * Uses Sierra persona to affirm the deal value.
 */
export async function generateContractPreview(leadId, unitId) {
  const [lead, unit] = await Promise.all([
    getRecord(COLLECTIONS.stakeholders, leadId),
    getRecord(COLLECTIONS.units, unitId),
  ]);

  if (!lead || !unit) return "Strategic acquisition context pending.";

  const systemPrompt = `ROLE: You are "Sierra," the Executive Closer for Sierra Estates Realty.
TASK: Write a high-fidelity "Affirmation of Strategic Alignment" for this property acquisition.
TONE: Congratulations, institutional precision, and Levantine professional warmth.
CONTEXT: Stakeholder ${_nullishCoalesce(lead.fullName, () => ( lead.name))} is acquiring Asset ${unit.title} (${unit.compound}).
INTENT: Briefly summarize why this acquisition is a masterstroke of investment fidelity.

Output as 2-3 powerful sentences in the 'Sierra' persona.`;

  try {
    const data = await GoogleAIService.chatCompletions(
      'closing-engine', 'acquisition-affirmation',
      [{ role: 'system', content: systemPrompt }],
      { model: 'gemini-1.5-flash', temperature: 0.5 }
    );

    return data.choices[0].message.content || "Strategic alignment affirmed. Acquisition protocol finalized.";
  } catch (err) {
    logger.error("[ClosingEngine] AI Affirmation failed:", err);
    return "Strategic alignment affirmed. Acquisition protocol finalized.";
  }
}
