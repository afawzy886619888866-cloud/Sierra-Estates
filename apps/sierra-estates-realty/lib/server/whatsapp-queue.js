 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import 'server-only';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp, FieldValue, } from 'firebase-admin/firestore';
import {
  COLLECTIONS,





} from '@/lib/models/schema';
import { logger } from '@/lib/logger';

// Single daily dispatch window: 10:00–10:59 Africa/Cairo. The dispatch cron
// (.github/workflows/whatsapp-dispatch-cron.yml) fires once a day and relies
// on this 1-hour window to (a) actually let that run through and (b) reject
// the other UTC-offset firing used to cover Cairo's DST switch, so exactly
// one run per day sends. dailyCapPerNumber/dailyCapTotal below are still the
// per-run ceiling since there's only one run to spend them in.
export const DEFAULT_OUTREACH_CONFIG = {
  operatingHourStart: 10,
  operatingHourEnd: 11,
  timezone: 'Africa/Cairo',
  batchSizePerNumber: 30,
  windowMinutes: 120,
  dailyCapPerNumber: 120,
  dailyCapTotal: 480,
};

/** Reads the singleton config doc, falling back to defaults for any missing field. */
export async function getOutreachConfig() {
  try {
    const snap = await adminDb.collection(COLLECTIONS.systemConfig).doc('whatsapp_outreach').get();
    return { ...DEFAULT_OUTREACH_CONFIG, ...(snap.exists ? (snap.data() ) : {}) };
  } catch (e) {
    return DEFAULT_OUTREACH_CONFIG;
  }
}

/** Current hour (0–23) in the config timezone, without a tz library. */
export function currentHourInZone(timezone, now = new Date()) {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  }).format(now);
  // Intl can return "24" for midnight in some runtimes; normalize.
  return Number(hour) % 24;
}

export function isWithinOperatingHours(config, now = new Date()) {
  const hour = currentHourInZone(config.timezone, now);
  return hour >= config.operatingHourStart && hour < config.operatingHourEnd;
}

/**
 * Enqueues an outbound WhatsApp job. The dispatch worker (cron) sends it later,
 * subject to operating hours + per-number quota and scheduled date/time.
 * Single write — safe to call from request handlers.
 */
export async function enqueueWhatsAppJob(params









) {
  let scheduledTimestamp;
  if (params.scheduledFor) {
    if (typeof _optionalChain([(params.scheduledFor ), 'optionalAccess', _ => _.toMillis]) === 'function') {
      scheduledTimestamp = params.scheduledFor ;
    } else if (params.scheduledFor instanceof Date) {
      scheduledTimestamp = typeof _optionalChain([Timestamp, 'optionalAccess', _2 => _2.fromDate]) === 'function' ? Timestamp.fromDate(params.scheduledFor) : (params.scheduledFor );
    } else if (typeof params.scheduledFor === 'string') {
      const parsedDate = new Date(params.scheduledFor);
      if (!isNaN(parsedDate.getTime())) {
        scheduledTimestamp = typeof _optionalChain([Timestamp, 'optionalAccess', _3 => _3.fromDate]) === 'function' ? Timestamp.fromDate(parsedDate) : (parsedDate );
      }
    }
  }

  const job = {
    direction: 'outbound',
    purpose: params.purpose,
    toPhone: params.toPhone,
    body: params.body,
    status: 'queued',
    attempts: 0,
    createdAt: Timestamp.now() ,
    updatedAt: Timestamp.now() ,
    ...(scheduledTimestamp ? { scheduledFor: scheduledTimestamp  } : {}),
    ...(params.leadId ? { leadId: params.leadId } : {}),
    ...(params.unitId ? { unitId: params.unitId } : {}),
    ...(params.ownerNegotiationId ? { ownerNegotiationId: params.ownerNegotiationId } : {}),
    ...(params.templateName ? { templateName: params.templateName } : {}),
    ...(params.templateParams ? { templateParams: params.templateParams } : {}),
  };
  const ref = await adminDb.collection(COLLECTIONS.whatsappMessageQueue).add(job);
  return ref.id;
}

/**
 * Seeds the 4 WhatsAppNumber docs from WABA_NUMBER_1..4 if the collection is
 * empty, so the dispatcher has senders to claim. Idempotent.
 */
export async function ensureNumbersSeeded(config) {
  const col = adminDb.collection(COLLECTIONS.whatsappNumbers);
  const existing = await col.limit(1).get();
  if (!existing.empty) return 0;

  const phones = [
    process.env.WABA_NUMBER_1,
    process.env.WABA_NUMBER_2,
    process.env.WABA_NUMBER_3,
    process.env.WABA_NUMBER_4,
  ].filter((p) => Boolean(p));

  if (phones.length === 0) return 0;

  const now = Timestamp.now();
  const windowReset = Timestamp.fromMillis(now.toMillis() + config.windowMinutes * 60000);
  const dailyReset = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60000);

  let created = 0;
  for (let i = 0; i < phones.length; i++) {
    await col.add({
      label: `Sender ${i + 1}`,
      e164Phone: phones[i],
      status: 'active',
      windowSentCount: 0,
      windowResetAt: windowReset,
      dailySentCount: 0,
      dailyResetAt: dailyReset,
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }
  logger.info(`[whatsapp-queue] Seeded ${created} WhatsApp sender numbers`);
  return created;
}






/**
 * Picks the claim order across active numbers: lowest windowSentCount first,
 * tie-broken by lowest dailySentCount, then doc id for determinism. This is
 * what gives the 4 senders real load balancing — each call prefers whichever
 * number has sent the LEAST so far, rather than always trying number 1 first
 * and only falling through to 2/3/4 once 1 is exhausted (which would just be
 * "fill number 1, then 2, then 3, then 4", not balanced load). The read here
 * is a heuristic ordering only; claimEligibleNumber's transaction is still
 * the source of truth for eligibility, so a stale ordering (e.g. a window
 * that expired since this read) only affects preference, never correctness.
 */
function orderByLoad(docs) {
  return [...docs]
    .sort((a, b) => {
      const da = a.data() ;
      const db = b.data() ;
      const windowDiff = (_nullishCoalesce(da.windowSentCount, () => ( 0))) - (_nullishCoalesce(db.windowSentCount, () => ( 0)));
      if (windowDiff !== 0) return windowDiff;
      const dailyDiff = (_nullishCoalesce(da.dailySentCount, () => ( 0))) - (_nullishCoalesce(db.dailySentCount, () => ( 0)));
      if (dailyDiff !== 0) return dailyDiff;
      return a.id.localeCompare(b.id);
    })
    .map((d) => d.id);
}

/**
 * Transactionally claims one sender number that still has window + daily quota,
 * resetting elapsed windows first. Increments the claimed number's counters so a
 * concurrent claim can't oversend. Returns null when every number is exhausted.
 * Tries the least-loaded number first (see orderByLoad) for even distribution
 * across all 4 senders.
 */
export async function claimEligibleNumber(config) {
  const snap = await adminDb.collection(COLLECTIONS.whatsappNumbers).where('status', '==', 'active').get();
  const ids = orderByLoad(snap.docs );

  for (const id of ids) {
    const ref = adminDb.collection(COLLECTIONS.whatsappNumbers).doc(id);
    const claimed = await adminDb.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) return null;
      const d = doc.data() ;
      const nowMs = Date.now();

      let windowSent = _nullishCoalesce(d.windowSentCount, () => ( 0));
      let dailySent = _nullishCoalesce(d.dailySentCount, () => ( 0));
      const patch = {};

      if (!d.windowResetAt || nowMs > d.windowResetAt.toMillis()) {
        windowSent = 0;
        patch.windowResetAt = Timestamp.fromMillis(nowMs + config.windowMinutes * 60000);
      }
      if (!d.dailyResetAt || nowMs > d.dailyResetAt.toMillis()) {
        dailySent = 0;
        patch.dailyResetAt = Timestamp.fromMillis(nowMs + 24 * 60 * 60000);
      }

      if (windowSent >= config.batchSizePerNumber || dailySent >= config.dailyCapPerNumber) {
        // Persist any window/daily resets even though we can't claim it now.
        if (Object.keys(patch).length > 0) {
          tx.update(ref, { ...patch, windowSentCount: windowSent, dailySentCount: dailySent, updatedAt: Timestamp.now() });
        }
        return null;
      }

      tx.update(ref, {
        ...patch,
        windowSentCount: windowSent + 1,
        dailySentCount: dailySent + 1,
        lastSentAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return { id, e164Phone: d.e164Phone };
    });

    if (claimed) return claimed;
  }
  return null;
}

// ─── Owner Negotiations ───────────────────────────────────────────────
// Property owners we're negotiating to list/acquire from — distinct from
// stakeholders (buyer/renter leads). Each negotiation tracks a two-way
// history; outbound entries are added when we enqueue a message, inbound
// entries when OmnichannelChatService routes a reply here (see
// findActiveOwnerNegotiationByPhone).

const ACTIVE_NEGOTIATION_STATUSES = ['contacted', 'negotiating'] ;

/**
 * Finds an owner negotiation that's still "live" (not agreed/rejected/stale)
 * for the given phone, so an inbound reply gets routed to the right thread
 * instead of being treated as a generic lead/listing message.
 */
export async function findActiveOwnerNegotiationByPhone(
  ownerPhone,
) {
  const snap = await adminDb
    .collection(COLLECTIONS.ownerNegotiations)
    .where('ownerPhone', '==', ownerPhone)
    .where('status', 'in', ACTIVE_NEGOTIATION_STATUSES)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data()  };
}

/**
 * Appends one entry to a negotiation's history (atomic arrayUnion) and bumps
 * lastContactAt. Used for both outbound (we sent) and inbound (they replied)
 * messages so the thread stays in one place.
 */
export async function appendOwnerNegotiationMessage(
  negotiationId,
  entry,
) {
  const ref = adminDb.collection(COLLECTIONS.ownerNegotiations).doc(negotiationId);
  const historyEntry = {
    direction: entry.direction,
    message: entry.message,
    timestamp: Timestamp.now(),
  };
  if (entry.price !== undefined) historyEntry.price = entry.price;

  await ref.update({
    history: FieldValue.arrayUnion(historyEntry),
    lastContactAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...(entry.direction === 'inbound' ? { status: 'negotiating' } : {}),
  });
}

/**
 * Finds-or-creates the negotiation thread for an owner, appends the outbound
 * message to its history, and enqueues the real WhatsApp send. This is the
 * single entry point for starting or continuing an owner negotiation.
 */
export async function startOrContinueOwnerNegotiation(params








) {
  const col = adminDb.collection(COLLECTIONS.ownerNegotiations);
  const existing = await findActiveOwnerNegotiationByPhone(params.ownerPhone);

  let negotiationId;
  if (existing) {
    negotiationId = existing.id;
    const patch = { updatedAt: Timestamp.now() };
    if (params.offerPrice !== undefined) patch.currentOfferPrice = params.offerPrice;
    if (params.interestedLeadId !== undefined) patch.interestedLeadId = params.interestedLeadId;
    await col.doc(negotiationId).update(patch);
  } else {
    const doc = {
      ownerPhone: params.ownerPhone,
      status: 'contacted',
      history: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...(params.ownerName ? { ownerName: params.ownerName } : {}),
      ...(params.unitId ? { unitId: params.unitId } : {}),
      ...(params.brokerListingId ? { brokerListingId: params.brokerListingId } : {}),
      ...(params.interestedLeadId ? { interestedLeadId: params.interestedLeadId } : {}),
      ...(params.askingPrice !== undefined ? { askingPrice: params.askingPrice } : {}),
      ...(params.offerPrice !== undefined ? { currentOfferPrice: params.offerPrice } : {}),
    };
    const ref = await col.add(doc);
    negotiationId = ref.id;
  }

  await appendOwnerNegotiationMessage(negotiationId, {
    direction: 'outbound',
    message: params.body,
    ...(params.offerPrice !== undefined ? { price: params.offerPrice } : {}),
  });

  const jobId = await enqueueWhatsAppJob({
    purpose: 'owner-negotiation',
    toPhone: params.ownerPhone,
    body: params.body,
    ownerNegotiationId: negotiationId,
    ...(params.unitId ? { unitId: params.unitId } : {}),
  });

  return { negotiationId, jobId };
}

/**
 * Sends a follow-up message on an EXISTING negotiation thread, identified by
 * id (not phone — the admin UI operates on a thread it already has open).
 * Appends the outbound history entry and enqueues the real send.
 */
export async function sendOwnerNegotiationMessage(
  negotiationId,
  params,
) {
  const ref = adminDb.collection(COLLECTIONS.ownerNegotiations).doc(negotiationId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error(`Owner negotiation ${negotiationId} not found`);
  }
  const negotiation = snap.data() ;

  if (params.price !== undefined) {
    await ref.update({ currentOfferPrice: params.price, updatedAt: Timestamp.now() });
  }

  await appendOwnerNegotiationMessage(negotiationId, {
    direction: 'outbound',
    message: params.body,
    ...(params.price !== undefined ? { price: params.price } : {}),
  });

  const jobId = await enqueueWhatsAppJob({
    purpose: 'owner-negotiation',
    toPhone: negotiation.ownerPhone,
    body: params.body,
    ownerNegotiationId: negotiationId,
    ...(negotiation.unitId ? { unitId: negotiation.unitId } : {}),
  });

  return { jobId };
}
