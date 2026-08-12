/**
 * SIERRA ESTATES — STAGE 8: VIEWING ENGINE
 * Automates the scheduling and reminding for site inspections.
 */

import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, Timestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { COLLECTIONS, type Viewing } from '../models/schema';
import { sendTelegramMessage } from './telegram-controller';

/**
 * Schedule a new viewing.
 */
export async function scheduleViewing(
  leadId: string, 
  unitId: string, 
  agentId: string, 
  scheduledAt: Date
): Promise<string> {
  const viewingData: Partial<Viewing> = {
    leadId,
    unitId,
    agentId,
    scheduledAt: Timestamp.fromDate(scheduledAt),
    status: 'scheduled',
    location: "Site Office / Project Location", // Default
    reminderSent: false,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTIONS.viewings), viewingData);
  
  // Update Lead Stage
  await updateDoc(doc(db, COLLECTIONS.stakeholders, leadId), {
    'orchestrationState.stage': 'S8_VIEWING_SCHEDULED',
    'status': 'negotiating'
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
export async function completeViewing(viewingId: string, notes?: string) {
  const viewingRef = doc(db, COLLECTIONS.viewings, viewingId);
  const viewingSnap = await getDoc(viewingRef);
  
  if (!viewingSnap.exists()) return;
  const viewing = viewingSnap.data() as Viewing;

  await updateDoc(viewingRef, {
    status: 'completed',
    notes: notes || '',
    updatedAt: serverTimestamp(),
  });
  
  // Transition to Closing Ready
  await updateDoc(doc(db, COLLECTIONS.stakeholders, viewing.leadId), {
    'orchestrationState.stage': 'S9_CLOSING_READY'
  });

  await sendTelegramMessage(`✅ <b>Viewing Completed</b>\nStakeholder has inspected the asset. Transitioning to Stage 9: Closing.`);
}
