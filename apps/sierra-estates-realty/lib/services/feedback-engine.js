 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * SIERRA ESTATES — STAGE 10: FEEDBACK LOOP
 * Closes the circle by capturing stakeholder satisfaction and triggering re-match logic.
 */

import { getRecord, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS, } from '../models/schema';
import { sendTelegramMessage } from './telegram-controller';

/**
 * Triggers the post-sale feedback process.
 */
export async function initiateFeedbackLoop(leadId, saleId) {
  console.log(`[FeedbackLoop] Initiating for Lead: ${leadId}`);
  
  // 1. Send Survey (Simulated via automated log).
  // `automation` and `orchestrationState` are single JSONB columns, so what
  // Firestore did with dotted paths is a read-merge-write here.
  const lead = await getRecord(COLLECTIONS.stakeholders, leadId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);

  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    automation: {
      ...(_nullishCoalesce(lead.automation, () => ( {}))),
      feedbackRequested: true,
      lastFeedbackAt: new Date().toISOString(),
    },
    orchestrationState: {
      ...(_nullishCoalesce(lead.orchestrationState, () => ( {}))),
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
export async function submitStakeholderFeedback(leadId, score, comment) {
  const lead = await getRecord(COLLECTIONS.stakeholders, leadId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);

  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    aiProfiling: { ...(_nullishCoalesce(lead.aiProfiling, () => ( {}))), satisfactionScore: score },
    intelligence: { ...(_nullishCoalesce(lead.intelligence, () => ( {}))), lastFeedbackComment: comment },
    orchestrationState: {
      ...(_nullishCoalesce(lead.orchestrationState, () => ( {}))),
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
  leadId, 
  unitId, 
  action,
  reason
) {
  const lead = await getRecord(COLLECTIONS.stakeholders, leadId);
  if (!lead) return;

  const timestamp = new Date().toISOString();

  // 1. Record in Interaction History
  const historyItem = { unitId, action, timestamp, reason };
  const updatedHistory = [...(lead.interactionHistory || []), historyItem];

  // 2. If 'pass', record move to objections and learn from it
  const updateData = {
    interactionHistory: updatedHistory,
  };

  if (action === 'pass' && reason) {
    // One JSONB column, so both dotted paths merge into the same object.
    const intelligence = { ...(_nullishCoalesce(lead.intelligence, () => ( {}))) };
    const objection = { unitId, reason, timestamp };
    intelligence.objections = [...(_optionalChain([lead, 'access', _ => _.intelligence, 'optionalAccess', _2 => _2.objections]) || []), objection];

    // Simple Learning: If reason mentions 'dark' or 'low floor', add to dislikes
    const existingDislikes = _optionalChain([lead, 'access', _3 => _3.intelligence, 'optionalAccess', _4 => _4.preferences, 'optionalAccess', _5 => _5.dislikes]) || [];
    if (reason.toLowerCase().includes('dark') && !existingDislikes.includes('dark units')) {
      intelligence.preferences = {
        ...(_nullishCoalesce(_optionalChain([lead, 'access', _6 => _6.intelligence, 'optionalAccess', _7 => _7.preferences]), () => ( {}))),
        dislikes: [...existingDislikes, 'dark units'],
      };
    }
    updateData.intelligence = intelligence;
  }

  await updateRecord(COLLECTIONS.stakeholders, leadId, updateData);

  // 3. Notify agent if 'interested'
  if (action === 'interested') {
    await sendTelegramMessage(`🔥 <b>High Intent Detected</b>\nStakeholder <b>${_nullishCoalesce((lead ).fullName, () => ( lead.name))}</b> is interested in unit: <code>${unitId}</code>.\nAction: Contact immediately to close.`);
  }
}
