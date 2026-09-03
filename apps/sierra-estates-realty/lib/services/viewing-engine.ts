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
import { getRecord, insertRecord, updateRecord } from '@sierra-estates/db';
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
  const viewingData = {
    leadId,
    unitId,
    agentId,
    scheduledAt,
    status: 'scheduled' as const,
    location: 'Site Office / Project Location', // Default
    reminderSent: false,
    createdAt: new Date().toISOString(),
  };

  const created = await insertRecord<{ id: string }>(COLLECTIONS.viewings, viewingData);

  // Update Lead Stage. orchestration_state is a JSONB column, so the existing
  // object is merged rather than replaced — Firestore's dotted-path update
  // ('orchestrationState.stage') left sibling keys alone and so must this.
  const lead = await getRecord<{ orchestrationState?: Record<string, unknown> }>(
    COLLECTIONS.stakeholders,
    leadId
  );
  await updateRecord(COLLECTIONS.stakeholders, leadId, {
    orchestrationState: { ...(lead?.orchestrationState ?? {}), stage: 'S8_VIEWING_SCHEDULED' },
    status: 'negotiating',
  });

  // Notify Agent via Telegram
  await sendTelegramMessage(
    `🗓️ <b>Viewing Scheduled</b>\n\nStakeholder: ${leadId}\nUnit: ${unitId}\nTime: ${scheduledAt.toLocaleString()}`
  );

  return created.id;
}

/**
 * Marks a viewing as completed and potentially moves lead to 'negotiate' stage.
 */
export async function completeViewing(viewingId: string, notes?: string) {
  const viewing = await getRecord<Viewing>(COLLECTIONS.viewings, viewingId);
  if (!viewing) return;

  await updateRecord(COLLECTIONS.viewings, viewingId, {
    status: 'completed',
    notes: notes || '',
    updatedAt: new Date().toISOString(),
  });

  // Transition to Closing Ready, merging rather than replacing as above.
  const lead = await getRecord<{ orchestrationState?: Record<string, unknown> }>(
    COLLECTIONS.stakeholders,
    viewing.leadId
  );
  await updateRecord(COLLECTIONS.stakeholders, viewing.leadId, {
    orchestrationState: { ...(lead?.orchestrationState ?? {}), stage: 'S9_CLOSING_READY' },
  });

  await sendTelegramMessage(`✅ <b>Viewing Completed</b>\nStakeholder has inspected the asset. Transitioning to Stage 9: Closing.`);
}
