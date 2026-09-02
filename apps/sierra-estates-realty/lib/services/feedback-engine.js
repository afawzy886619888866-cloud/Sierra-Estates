 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * SIERRA ESTATES — STAGE 10: FEEDBACK LOOP
 * Closes the circle by capturing stakeholder satisfaction and triggering re-match logic.
 */

import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { COLLECTIONS, } from '../models/schema';
import { sendTelegramMessage } from './telegram-controller';

/**
 * Triggers the post-sale feedback process.
 */
export async function initiateFeedbackLoop(leadId, saleId) {
  console.log(`[FeedbackLoop] Initiating for Lead: ${leadId}`);
  
  // 1. Send Survey (Simulated via automated log)
  await updateDoc(doc(db, COLLECTIONS.stakeholders, leadId), {
    'automation.feedbackRequested': true,
    'automation.lastFeedbackAt': serverTimestamp(),
    'orchestrationState.stage': 'S10_FEEDBACK_PENDING',
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
  await updateDoc(doc(db, COLLECTIONS.stakeholders, leadId), {
    'aiProfiling.satisfactionScore': score,
    'intelligence.lastFeedbackComment': comment,
    'orchestrationState.stage': 'S10_COMPLETED',
    'orchestrationState.status': 'archived'
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
  const leadRef = doc(db, COLLECTIONS.stakeholders, leadId);
  const leadSnap = await getDoc(leadRef);
  if (!leadSnap.exists()) return;
  const lead = leadSnap.data() ;

  const timestamp = serverTimestamp();

  // 1. Record in Interaction History
  const historyItem = { unitId, action, timestamp, reason };
  const updatedHistory = [...(lead.interactionHistory || []), historyItem];

  // 2. If 'pass', record move to objections and learn from it
  const updateData = {
    interactionHistory: updatedHistory,
    updatedAt: timestamp
  };

  if (action === 'pass' && reason) {
    const objection = { unitId, reason, timestamp };
    updateData['intelligence.objections'] = [...(_optionalChain([lead, 'access', _ => _.intelligence, 'optionalAccess', _2 => _2.objections]) || []), objection];
    
    // Simple Learning: If reason mentions 'dark' or 'low floor', add to dislikes
    const existingDislikes = _optionalChain([lead, 'access', _3 => _3.intelligence, 'optionalAccess', _4 => _4.preferences, 'optionalAccess', _5 => _5.dislikes]) || [];
    if (reason.toLowerCase().includes('dark') && !existingDislikes.includes('dark units')) {
      updateData['intelligence.preferences.dislikes'] = [...existingDislikes, 'dark units'];
    }
  }

  await updateDoc(leadRef, updateData);

  // 3. Notify agent if 'interested'
  if (action === 'interested') {
    await sendTelegramMessage(`🔥 <b>High Intent Detected</b>\nStakeholder <b>${lead.name}</b> is interested in unit: <code>${unitId}</code>.\nAction: Contact immediately to close.`);
  }
}
