/**
 * sierra estates — STAGE 9: STRATEGIC ACQUISITION ENGINE
 * Orchestrates contract synthesis, stakeholder verification, and commission processing.
 */

import { getRecord, insertRecord, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS, type Sale, type Lead, type Unit } from '../models/schema';
import { sendTelegramMessage } from './telegram-controller';
import { initiateFeedbackLoop } from './feedback-engine';
import { GoogleAIService } from '../server/google-ai';
import { logger } from '@/lib/logger';

/**
 * Initiates the formal Closing Protocol for a Strategic Acquisition.
 * Includes Asset reservation and Contract Synthesis.
 */
export async function initiateClosing(
  leadId: string,
  unitId: string,
  agentId: string,
  salePrice: number,
  commissionPercent: number = 2.5
): Promise<string> {
  // ─── VALIDATION: Ensure Asset Availability ──────────────────────
  const unit = await getRecord<Unit>(COLLECTIONS.units, unitId);
  if (unit?.status === 'sold') {
    throw new Error(`[Strategic Acquisition Error] Asset ${unitId} is already marked as SOLD.`);
  }

  const commissionAmount = (salePrice * commissionPercent) / 100;

  const saleData: Partial<Sale> = {
    leadId,
    unitId,
    agentId,
    salePrice,
    commissionPercent,
    commissionAmount,
    status: 'pending',
    closingDate: new Date().toISOString(),
  };

  const sale = await insertRecord<{ id: string }>(COLLECTIONS.sales, saleData);

  // Generate Contract Preview URL (Simulated)
  const contractUrl = `https://sierraestates.luxury/contracts/preview/${sale.id}`;

  // Update unit status to 'reserved'
  await updateRecord(COLLECTIONS.units, unitId, { status: 'reserved' });

  // Update Stakeholder (Lead) State. `orchestrationState` and `intelligence`
  // are single JSONB columns, so the dotted paths become merges.
  const lead = await getRecord<Lead>(COLLECTIONS.stakeholders, leadId);
  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    orchestrationState: {
      ...(lead?.orchestrationState ?? {}),
      stage: 'S9_ACQUISITION_IN_PROGRESS',
    },
    intelligence: { ...(lead?.intelligence ?? {}), contractUrl },
  });

  await sendTelegramMessage(`💎 <b>Strategic Acquisition Initiated</b>\nContract synthesised for Asset: ${unitId}. Awaiting stakeholder affirmation.`);

  return sale.id;
}

/**
 * Finalizes the sale, marks unit as sold, and triggers the feedback loop.
 */
export async function finalizeSale(saleId: string) {
  const sale = await getRecord<Sale>(COLLECTIONS.sales, saleId);
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
export async function generateContractPreview(leadId: string, unitId: string): Promise<string> {
  const [lead, unit] = await Promise.all([
    getRecord<Lead & { fullName?: string }>(COLLECTIONS.stakeholders, leadId),
    getRecord<Unit>(COLLECTIONS.units, unitId),
  ]);

  if (!lead || !unit) return "Strategic acquisition context pending.";

  const systemPrompt = `ROLE: You are "Sierra," the Executive Closer for Sierra Estates Realty.
TASK: Write a high-fidelity "Affirmation of Strategic Alignment" for this property acquisition.
TONE: Congratulations, institutional precision, and Levantine professional warmth.
CONTEXT: Stakeholder ${lead.fullName ?? lead.name} is acquiring Asset ${unit.title} (${unit.compound}).
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
