import 'server-only';

/**
 * SIERRA ESTATES — STAGE 8: VIEWING ENGINE
 * Automates the scheduling and reminding for site inspections.
 *
 * Previously used the client `firebase/firestore` SDK (import { db } from
 * '../firebase') despite being server-only orchestration logic — the same
 * anti-pattern fixed in InventoryService.ts. Ported to the Admin SDK so it
 * can actually be called from an API route.
 */
import { adminDb } from '../server/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS, } from '../models/schema';
import { sendTelegramMessage } from './telegram-controller';

/**
 * Schedule a new viewing.
 */
export async function scheduleViewing(
  leadId,
  unitId,
  agentId,
  scheduledAt
) {
  const viewingData = {
    leadId,
    unitId,
    agentId,
    scheduledAt,
    status: 'scheduled' ,
    location: 'Site Office / Project Location', // Default
    reminderSent: false,
    createdAt: FieldValue.serverTimestamp(),
  };

  const docRef = await adminDb.collection(COLLECTIONS.viewings).add(viewingData);

  // Update Lead Stage
  await adminDb.collection(COLLECTIONS.stakeholders).doc(leadId).update({
    'orchestrationState.stage': 'S8_VIEWING_SCHEDULED',
    status: 'negotiating',
  });

  // Notify Agent via Telegram
  await sendTelegramMessage(
    `🗓️ <b>Viewing Scheduled</b>\n\nStakeholder: ${leadId}\nUnit: ${unitId}\nTime: ${scheduledAt.toLocaleString()}`
  );

  return docRef.id;
}

/**
 * Marks a viewing as completed and potentially moves lead to 'negotiate' stage.
 */
export async function completeViewing(viewingId, notes) {
  const viewingRef = adminDb.collection(COLLECTIONS.viewings).doc(viewingId);
  const viewingSnap = await viewingRef.get();

  if (!viewingSnap.exists) return;
  const viewing = viewingSnap.data() ;

  await viewingRef.update({
    status: 'completed',
    notes: notes || '',
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Transition to Closing Ready
  await adminDb.collection(COLLECTIONS.stakeholders).doc(viewing.leadId).update({
    'orchestrationState.stage': 'S9_CLOSING_READY',
  });

  await sendTelegramMessage(`✅ <b>Viewing Completed</b>\nStakeholder has inspected the asset. Transitioning to Stage 9: Closing.`);
}
