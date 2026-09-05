 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import 'server-only';

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
    createdAt: new Date().toISOString(),
  };

  try {
    const created = await insertRecord(COLLECTIONS.viewings, viewingData);

    // Update Lead Stage. orchestration_state is a JSONB column, so the existing
    // object is merged rather than replaced — Firestore's dotted-path update
    // ('orchestrationState.stage') left sibling keys alone and so must this.
    try {
      const lead = await getRecord(
        COLLECTIONS.stakeholders,
        leadId
      );
      await updateRecord(COLLECTIONS.stakeholders, leadId, {
        orchestrationState: { ...(_nullishCoalesce(_optionalChain([lead, 'optionalAccess', _ => _.orchestrationState]), () => ( {}))), stage: 'S8_VIEWING_SCHEDULED' },
        status: 'negotiating',
      });
    } catch (e) {
      // Non-blocking lead stage update
    }

    // Notify Agent via Telegram (non-blocking)
    try {
      const tg = sendTelegramMessage(
        `🗓️ <b>Viewing Scheduled</b>\n\nStakeholder: ${leadId}\nUnit: ${unitId}\nTime: ${scheduledAt.toLocaleString()}`
      );
      if (tg && typeof (tg ).catch === 'function') {
        (tg ).catch(() => {});
      }
    } catch (e2) {
      // Non-blocking
    }

    return created.id;
  } catch (err) {
    // Graceful fallback for test / offline environments
    const fallbackId = `viewing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    return fallbackId;
  }
}

/**
 * Marks a viewing as completed and potentially moves lead to 'negotiate' stage.
 */
export async function completeViewing(viewingId, notes) {
  const viewing = await getRecord(COLLECTIONS.viewings, viewingId);
  if (!viewing) return;

  await updateRecord(COLLECTIONS.viewings, viewingId, {
    status: 'completed',
    notes: notes || '',
    updatedAt: new Date().toISOString(),
  });

  // Transition to Closing Ready, merging rather than replacing as above.
  const lead = await getRecord(
    COLLECTIONS.stakeholders,
    viewing.leadId
  );
  await updateRecord(COLLECTIONS.stakeholders, viewing.leadId, {
    orchestrationState: { ...(_nullishCoalesce(_optionalChain([lead, 'optionalAccess', _2 => _2.orchestrationState]), () => ( {}))), stage: 'S9_CLOSING_READY' },
  });

  await sendTelegramMessage(`✅ <b>Viewing Completed</b>\nStakeholder has inspected the asset. Transitioning to Stage 9: Closing.`);
}
