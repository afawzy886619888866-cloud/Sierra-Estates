/**
 * SIERRA ESTATES — STAGE 10: FEEDBACK LOOP
 * Closes the circle by capturing stakeholder satisfaction and triggering re-match logic.
 */

import { getRecord, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS, type Lead } from '../models/schema';
import { sendTelegramMessage } from './telegram-controller';

/**
 * Triggers the post-sale feedback process.
 */
export async function initiateFeedbackLoop(leadId: string, saleId: string) {
  console.log(`[FeedbackLoop] Initiating for Lead: ${leadId}`);
  
  // 1. Send Survey (Simulated via automated log).
  // `automation` and `orchestrationState` are single JSONB columns, so what
  // Firestore did with dotted paths is a read-merge-write here.
  const lead = await getRecord<Lead>(COLLECTIONS.stakeholders, leadId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);

  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    automation: {
      ...(lead.automation ?? {}),
      feedbackRequested: true,
      lastFeedbackAt: new Date().toISOString(),
    },
    orchestrationState: {
      ...(lead.orchestrationState ?? {}),
      stage: 'S10_FEEDBACK_PENDING',
    },
    stage: 'closed-won'
  });

  // 2. Notify for Manual Quality Check
  await sendTelegramMessage(`📊 <b>S10: Feedback Loop Initiated</b>\nStakeholder satisfaction survey deployed for Sale: ${saleId}.`);

  // 3. Re-Match Logic: A closed buyer is a prime target for future investments
  // In a real scenario, this would trigger a background task to refresh matches with a 'Portfolio Owner' profile.
}

/**
 * Captures the actual feedback result.
 */
export async function submitStakeholderFeedback(leadId: string, score: number, comment: string) {
  const lead = await getRecord<Lead>(COLLECTIONS.stakeholders, leadId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);

  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    aiProfiling: { ...(lead.aiProfiling ?? {}), satisfactionScore: score },
    intelligence: { ...(lead.intelligence ?? {}), lastFeedbackComment: comment },
    orchestrationState: {
      ...(lead.orchestrationState ?? {}),
      stage: 'S10_COMPLETED',
      status: 'archived',
    },
  });

  await sendTelegramMessage(`🌟 <b>Stakholder Success</b>\nFeedback received: ${score}/5. "<i>${comment}</i>"\nPipeline Cycle Complete.`);
}

/**
 * Stage 10/S8 Interaction: Records why a stakeholder passed on a unit.
 * Powers the Learning Loop to make the Matching Engine smarter.
 */
export async function recordSelectionFeedback(
  leadId: string, 
  unitId: string, 
  action: 'pass' | 'interested',
  reason?: string
) {
  const lead = await getRecord<Lead>(COLLECTIONS.stakeholders, leadId);
  if (!lead) return;

  const timestamp = new Date().toISOString();

  // 1. Record in Interaction History
  const historyItem = { unitId, action, timestamp, reason };
  const updatedHistory = [...(lead.interactionHistory || []), historyItem];

  // 2. If 'pass', record move to objections and learn from it
  const updateData: any = {
    interactionHistory: updatedHistory,
  };

  if (action === 'pass' && reason) {
    // One JSONB column, so both dotted paths merge into the same object.
    const intelligence: any = { ...(lead.intelligence ?? {}) };
    const objection = { unitId, reason, timestamp };
    intelligence.objections = [...(lead.intelligence?.objections || []), objection];

    // Simple Learning: If reason mentions 'dark' or 'low floor', add to dislikes
    const existingDislikes = lead.intelligence?.preferences?.dislikes || [];
    if (reason.toLowerCase().includes('dark') && !existingDislikes.includes('dark units')) {
      intelligence.preferences = {
        ...(lead.intelligence?.preferences ?? {}),
        dislikes: [...existingDislikes, 'dark units'],
      };
    }
    updateData.intelligence = intelligence;
  }

  await updateRecord(COLLECTIONS.stakeholders, leadId, updateData);

  // 3. Notify agent if 'interested'
  if (action === 'interested') {
    await sendTelegramMessage(`🔥 <b>High Intent Detected</b>\nStakeholder <b>${(lead as { fullName?: string }).fullName ?? lead.name}</b> is interested in unit: <code>${unitId}</code>.\nAction: Contact immediately to close.`);
  }
}
