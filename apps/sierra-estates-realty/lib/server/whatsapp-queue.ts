import 'server-only';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp, FieldValue, type Transaction, type DocumentReference, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import {
  COLLECTIONS,
  type WhatsAppMessageJob,
  type WhatsAppMessagePurpose,
  type WhatsAppMessageDirection,
  type WhatsAppOutreachConfig,
  type OwnerNegotiation,
} from '@/lib/models/schema';
import { logger } from '@/lib/logger';

// Defaults match the product spec: 4 numbers, 30 msgs/number per 2-hour window,
// 12pm–8pm Africa/Cairo. dailyCapPerNumber = 30 × 4 windows = 120; total 480.
export const DEFAULT_OUTREACH_CONFIG: WhatsAppOutreachConfig = {
  operatingHourStart: 12,
  operatingHourEnd: 20,
  timezone: 'Africa/Cairo',
  batchSizePerNumber: 30,
  windowMinutes: 120,
  dailyCapPerNumber: 120,
  dailyCapTotal: 480,
};

/** Reads the singleton config doc, falling back to defaults for any missing field. */
export async function getOutreachConfig(): Promise<WhatsAppOutreachConfig> {
  try {
    const snap = await adminDb.collection(COLLECTIONS.systemConfig).doc('whatsapp_outreach').get();
    return { ...DEFAULT_OUTREACH_CONFIG, ...(snap.exists ? (snap.data() as Partial<WhatsAppOutreachConfig>) : {}) };
  } catch {
    return DEFAULT_OUTREACH_CONFIG;
  }
}

/** Current hour (0–23) in the config timezone, without a tz library. */
export function currentHourInZone(timezone: string, now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  }).format(now);
  // Intl can return "24" for midnight in some runtimes; normalize.
  return Number(hour) % 24;
}

export function isWithinOperatingHours(config: WhatsAppOutreachConfig, now: Date = new Date()): boolean {
  const hour = currentHourInZone(config.timezone, now);
  return hour >= config.operatingHourStart && hour < config.operatingHourEnd;
}

/**
 * Enqueues an outbound WhatsApp job. The dispatch worker (cron) sends it later,
 * subject to operating hours + per-number quota. Single write — safe to call from
 * request handlers.
 */
export async function enqueueWhatsAppJob(params: {
  purpose: WhatsAppMessagePurpose;
  toPhone: string;
  body: string;
  leadId?: string;
  unitId?: string;
  ownerNegotiationId?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}): Promise<string> {
  const job: Omit<WhatsAppMessageJob, 'id'> = {
    direction: 'outbound',
    purpose: params.purpose,
    toPhone: params.toPhone,
    body: params.body,
    status: 'queued',
    attempts: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
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
export async function ensureNumbersSeeded(config: WhatsAppOutreachConfig): Promise<number> {
  const col = adminDb.collection(COLLECTIONS.whatsappNumbers);
  const existing = await col.limit(1).get();
  if (!existing.empty) return 0;

  const phones = [
    process.env.WABA_NUMBER_1,
    process.env.WABA_NUMBER_2,
    process.env.WABA_NUMBER_3,
    process.env.WABA_NUMBER_4,
  ].filter((p): p is string => Boolean(p));

  if (phones.length === 0) return 0;

  const now = Timestamp.now();
  const windowReset = Timestamp.fromMillis(now.toMillis() + config.windowMinutes * 60_000);
  const dailyReset = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60_000);

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

export interface ClaimedNumber {
  id: string;
  e164Phone: string;
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
function orderByLoad(docs: QueryDocumentSnapshot[]): string[] {
  return [...docs]
    .sort((a, b) => {
      const da = a.data() as Record<string, any>;
      const db = b.data() as Record<string, any>;
      const windowDiff = (da.windowSentCount ?? 0) - (db.windowSentCount ?? 0);
      if (windowDiff !== 0) return windowDiff;
      const dailyDiff = (da.dailySentCount ?? 0) - (db.dailySentCount ?? 0);
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
export async function claimEligibleNumber(config: WhatsAppOutreachConfig): Promise<ClaimedNumber | null> {
  const snap = await adminDb.collection(COLLECTIONS.whatsappNumbers).where('status', '==', 'active').get();
  const ids: string[] = orderByLoad(snap.docs as QueryDocumentSnapshot[]);

  for (const id of ids) {
    const ref: DocumentReference = adminDb.collection(COLLECTIONS.whatsappNumbers).doc(id);
    const claimed = await adminDb.runTransaction(async (tx: Transaction): Promise<ClaimedNumber | null> => {
      const doc = await tx.get(ref);
      if (!doc.exists) return null;
      const d = doc.data() as Record<string, any>;
      const nowMs = Date.now();

      let windowSent = d.windowSentCount ?? 0;
      let dailySent = d.dailySentCount ?? 0;
      const patch: Record<string, any> = {};

      if (!d.windowResetAt || nowMs > d.windowResetAt.toMillis()) {
        windowSent = 0;
        patch.windowResetAt = Timestamp.fromMillis(nowMs + config.windowMinutes * 60_000);
      }
      if (!d.dailyResetAt || nowMs > d.dailyResetAt.toMillis()) {
        dailySent = 0;
        patch.dailyResetAt = Timestamp.fromMillis(nowMs + 24 * 60 * 60_000);
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

const ACTIVE_NEGOTIATION_STATUSES = ['contacted', 'negotiating'] as const;

/**
 * Finds an owner negotiation that's still "live" (not agreed/rejected/stale)
 * for the given phone, so an inbound reply gets routed to the right thread
 * instead of being treated as a generic lead/listing message.
 */
export async function findActiveOwnerNegotiationByPhone(
  ownerPhone: string,
): Promise<{ id: string; data: OwnerNegotiation } | null> {
  const snap = await adminDb
    .collection(COLLECTIONS.ownerNegotiations)
    .where('ownerPhone', '==', ownerPhone)
    .where('status', 'in', ACTIVE_NEGOTIATION_STATUSES)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() as OwnerNegotiation };
}

/**
 * Appends one entry to a negotiation's history (atomic arrayUnion) and bumps
 * lastContactAt. Used for both outbound (we sent) and inbound (they replied)
 * messages so the thread stays in one place.
 */
export async function appendOwnerNegotiationMessage(
  negotiationId: string,
  entry: { direction: WhatsAppMessageDirection; message: string; price?: number },
): Promise<void> {
  const ref = adminDb.collection(COLLECTIONS.ownerNegotiations).doc(negotiationId);
  const historyEntry: Record<string, any> = {
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
export async function startOrContinueOwnerNegotiation(params: {
  ownerPhone: string;
  ownerName?: string;
  unitId?: string;
  brokerListingId?: string;
  interestedLeadId?: string;
  askingPrice?: number;
  offerPrice?: number;
  body: string;
}): Promise<{ negotiationId: string; jobId: string }> {
  const col = adminDb.collection(COLLECTIONS.ownerNegotiations);
  const existing = await findActiveOwnerNegotiationByPhone(params.ownerPhone);

  let negotiationId: string;
  if (existing) {
    negotiationId = existing.id;
    const patch: Record<string, any> = { updatedAt: Timestamp.now() };
    if (params.offerPrice !== undefined) patch.currentOfferPrice = params.offerPrice;
    if (params.interestedLeadId !== undefined) patch.interestedLeadId = params.interestedLeadId;
    await col.doc(negotiationId).update(patch);
  } else {
    const doc: Omit<OwnerNegotiation, 'id'> = {
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
  negotiationId: string,
  params: { body: string; price?: number },
): Promise<{ jobId: string }> {
  const ref = adminDb.collection(COLLECTIONS.ownerNegotiations).doc(negotiationId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error(`Owner negotiation ${negotiationId} not found`);
  }
  const negotiation = snap.data() as OwnerNegotiation;

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
