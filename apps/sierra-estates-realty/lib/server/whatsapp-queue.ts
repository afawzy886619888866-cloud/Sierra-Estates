import 'server-only';
import {
  listRecords,
  getRecord,
  insertRecord,
  updateRecord,
} from '@sierra-estates/db';
import {
  type WhatsAppMessagePurpose,
  type WhatsAppMessageDirection,
  type WhatsAppOutreachConfig,
  type OwnerNegotiation,
} from '@/lib/models/schema';
export type { WhatsAppOutreachConfig };
import { logger } from '@/lib/logger';

/**
 * WhatsApp outreach queue — Supabase Postgres.
 *
 * Tables (see supabase/schema.sql):
 *   public.whatsapp_queue        the job queue drained by /api/cron/whatsapp-dispatch.
 *                                toPhone → recipient_phone, body → message_body.
 *   public.whatsapp_numbers      the 4 Twilio senders and their quota counters.
 *   public.owner_negotiations    owner-side buy/sell threads.
 *   public.system_config         singleton config rows, keyed by `key`.
 *
 * All timestamps are ISO strings (timestamptz columns); the Firestore
 * Timestamp/FieldValue hops are gone.
 */

// Daily outreach dispatch window: 12:00–20:00 Africa/Cairo (12:00 PM to 8:00 PM).
// Drains 40 contacts every hour across the 8-hour window (320 owners max per day).
export const DEFAULT_OUTREACH_CONFIG: WhatsAppOutreachConfig = {
  operatingHourStart: 12,
  operatingHourEnd: 20,
  timezone: 'Africa/Cairo',
  batchSizePerNumber: 40,
  windowMinutes: 60,
  dailyCapPerNumber: 80,
  dailyCapTotal: 320,
};

/**
 * Reads the singleton config row, falling back to defaults for any missing
 * field. system_config is a key/value table, so the settings live inside the
 * `value` JSONB rather than being columns of their own.
 */
export async function getOutreachConfig(): Promise<WhatsAppOutreachConfig> {
  try {
    const row = await getRecord<{ value?: Partial<WhatsAppOutreachConfig> }>(
      'system_config',
      'whatsapp_outreach',
      'key',
    );
    return { ...DEFAULT_OUTREACH_CONFIG, ...(row?.value ?? {}) };
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

/** Anything that can carry a scheduled send time, including a Firestore-era Timestamp. */
type ScheduleInput = Date | string | number | { toMillis: () => number } | null;

/** Normalises a scheduledFor input to an ISO string, or undefined when unusable. */
function toIsoOrUndefined(value: ScheduleInput | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof (value as { toMillis?: unknown })?.toMillis === 'function') {
    return new Date((value as { toMillis: () => number }).toMillis()).toISOString();
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  const parsed = new Date(value as string | number);
  return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/**
 * Enqueues an outbound WhatsApp job. The dispatch worker (cron) sends it later,
 * subject to operating hours + per-number quota and scheduled date/time.
 * Single insert — safe to call from request handlers.
 */
export async function enqueueWhatsAppJob(params: {
  purpose: WhatsAppMessagePurpose;
  toPhone: string;
  toName?: string;
  body: string;
  leadId?: string;
  unitId?: string;
  ownerNegotiationId?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  metadata?: Record<string, unknown>;
  scheduledFor?: ScheduleInput;
}): Promise<string> {
  const scheduledFor = toIsoOrUndefined(params.scheduledFor);
  const now = new Date().toISOString();

  const created = await insertRecord<{ id: string }>('whatsapp_queue', {
    direction: 'outbound',
    purpose: params.purpose,
    // Column names of the queue table; the dispatch worker reads them back as
    // recipientPhone / messageBody.
    recipientPhone: params.toPhone,
    ...(params.toName ? { recipientName: params.toName } : {}),
    messageBody: params.body,
    status: 'queued',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    ...(scheduledFor ? { scheduledFor } : {}),
    ...(params.leadId ? { leadId: params.leadId } : {}),
    ...(params.unitId ? { unitId: params.unitId } : {}),
    ...(params.ownerNegotiationId ? { ownerNegotiationId: params.ownerNegotiationId } : {}),
    ...(params.templateName ? { templateName: params.templateName } : {}),
    ...(params.templateParams ? { templateParams: params.templateParams } : {}),
    ...(params.metadata ? { metadata: params.metadata } : {}),
  });
  return created.id;
}

/**
 * Seeds the 4 sender rows from WABA_NUMBER_1..4 if the table is empty, so the
 * dispatcher has senders to claim. Idempotent.
 */
export async function ensureNumbersSeeded(config: WhatsAppOutreachConfig): Promise<number> {
  const existing = await listRecords('whatsapp_numbers', { limit: 1, select: 'id' });
  if (existing.length > 0) return 0;

  const phones = [
    process.env.WABA_NUMBER_1,
    process.env.WABA_NUMBER_2,
    process.env.WABA_NUMBER_3,
    process.env.WABA_NUMBER_4,
  ].filter((p): p is string => Boolean(p));

  if (phones.length === 0) return 0;

  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const windowReset = new Date(nowMs + config.windowMinutes * 60_000).toISOString();
  const dailyReset = new Date(nowMs + 24 * 60 * 60_000).toISOString();

  let created = 0;
  for (let i = 0; i < phones.length; i++) {
    await insertRecord('whatsapp_numbers', {
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

interface NumberRow {
  id: string;
  e164Phone: string;
  windowSentCount?: number;
  dailySentCount?: number;
  windowResetAt?: string | null;
  dailyResetAt?: string | null;
}

/**
 * Picks the claim order across active numbers: lowest windowSentCount first,
 * tie-broken by lowest dailySentCount, then row id for determinism. This is
 * what gives the 4 senders real load balancing — each call prefers whichever
 * number has sent the LEAST so far, rather than always trying number 1 first
 * and only falling through to 2/3/4 once 1 is exhausted (which would just be
 * "fill number 1, then 2, then 3, then 4", not balanced load).
 */
function orderByLoad(rows: NumberRow[]): NumberRow[] {
  return [...rows].sort((a, b) => {
    const windowDiff = (a.windowSentCount ?? 0) - (b.windowSentCount ?? 0);
    if (windowDiff !== 0) return windowDiff;
    const dailyDiff = (a.dailySentCount ?? 0) - (b.dailySentCount ?? 0);
    if (dailyDiff !== 0) return dailyDiff;
    return a.id.localeCompare(b.id);
  });
}

/** timestamptz columns arrive as ISO strings; null/unparseable means "elapsed". */
function resetElapsed(value: string | null | undefined, nowMs: number): boolean {
  if (!value) return true;
  const ms = new Date(value).getTime();
  return isNaN(ms) || nowMs > ms;
}

/**
 * Claims one sender number that still has window + daily quota, resetting
 * elapsed windows first, and increments its counters.
 *
 * ⚠️ Atomicity: the Firestore version ran this read-modify-write inside
 * runTransaction, so two concurrent claims could not both take the last slot
 * on a number. Postgres has no equivalent through the record helper layer
 * (there is no compare-and-set), so this is now a plain read followed by an
 * update. Two dispatch runs overlapping could therefore oversend a number by
 * up to the number of concurrent claims. The dispatch cron is a single daily
 * run (see DEFAULT_OUTREACH_CONFIG), which is what keeps this safe in
 * practice; a genuinely concurrent dispatcher needs a Postgres function
 * (`UPDATE … WHERE window_sent_count < $cap RETURNING *`) to restore it.
 */
export async function claimEligibleNumber(config: WhatsAppOutreachConfig): Promise<ClaimedNumber | null> {
  const rows = await listRecords<NumberRow>('whatsapp_numbers', {
    where: [{ column: 'status', value: 'active' }],
  });

  for (const row of orderByLoad(rows)) {
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();

    let windowSent = row.windowSentCount ?? 0;
    let dailySent = row.dailySentCount ?? 0;
    const patch: Record<string, unknown> = {};

    if (resetElapsed(row.windowResetAt, nowMs)) {
      windowSent = 0;
      patch.windowResetAt = new Date(nowMs + config.windowMinutes * 60_000).toISOString();
    }
    if (resetElapsed(row.dailyResetAt, nowMs)) {
      dailySent = 0;
      patch.dailyResetAt = new Date(nowMs + 24 * 60 * 60_000).toISOString();
    }

    if (windowSent >= config.batchSizePerNumber || dailySent >= config.dailyCapPerNumber) {
      // Persist any window/daily resets even though we can't claim it now.
      if (Object.keys(patch).length > 0) {
        await updateRecord('whatsapp_numbers', row.id, {
          ...patch,
          windowSentCount: windowSent,
          dailySentCount: dailySent,
          updatedAt: now,
        });
      }
      continue;
    }

    await updateRecord('whatsapp_numbers', row.id, {
      ...patch,
      windowSentCount: windowSent + 1,
      dailySentCount: dailySent + 1,
      lastSentAt: now,
      updatedAt: now,
    });
    return { id: row.id, e164Phone: row.e164Phone };
  }
  return null;
}

// ─── Owner Negotiations ───────────────────────────────────────────────
// Property owners we're negotiating to list/acquire from — distinct from
// leads (buyer/renter). Each negotiation tracks a two-way history; outbound
// entries are added when we enqueue a message, inbound entries when
// OmnichannelChatService routes a reply here (see
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
  const rows = await listRecords<OwnerNegotiation & { id: string }>('owner_negotiations', {
    where: [
      { column: 'ownerPhone', value: ownerPhone },
      { column: 'status', op: 'in', value: [...ACTIVE_NEGOTIATION_STATUSES] },
    ],
    limit: 1,
  });

  if (rows.length === 0) return null;
  return { id: rows[0].id, data: rows[0] };
}

/**
 * Appends one entry to a negotiation's history and bumps lastContactAt. Used
 * for both outbound (we sent) and inbound (they replied) messages so the
 * thread stays in one place.
 *
 * ⚠️ Atomicity: Firestore used FieldValue.arrayUnion, which appended
 * server-side. `history` is a JSONB column here, so the array is read, appended
 * to and written back whole — two simultaneous appends can lose one entry. The
 * alternative (replacing the column outright) would lose the entire thread, so
 * read-modify-write is the safe end of that trade.
 */
export async function appendOwnerNegotiationMessage(
  negotiationId: string,
  entry: { direction: WhatsAppMessageDirection; message: string; price?: number },
): Promise<void> {
  const now = new Date().toISOString();
  const historyEntry: Record<string, unknown> = {
    direction: entry.direction,
    message: entry.message,
    timestamp: now,
  };
  if (entry.price !== undefined) historyEntry.price = entry.price;

  const existing = await getRecord<OwnerNegotiation & { history?: unknown[] }>('owner_negotiations', negotiationId);
  const history = Array.isArray(existing?.history) ? existing.history : [];

  await updateRecord('owner_negotiations', negotiationId, {
    history: [...history, historyEntry],
    lastContactAt: now,
    updatedAt: now,
    ...(entry.direction === 'inbound' ? { status: 'negotiating' } : {}),
  });

  // When an owner replies to an outreach message, automatically sync unit status
  // in Supabase public.listings (flipping unavailable units back to available or rented/sold).
  if (entry.direction === 'inbound' && existing) {
    try {
      const { ListingAvailabilitySyncService } = await import('@/lib/services/ListingAvailabilitySyncService');
      await ListingAvailabilitySyncService.syncFromInboundOwnerMessage({
        negotiationId,
        unitId: existing.unitId,
        ownerPhone: existing.ownerPhone,
        ownerName: existing.ownerName,
        text: entry.message,
      });
    } catch (syncErr: any) {
      logger.warn(`[whatsapp-queue] Listing sync note: ${syncErr?.message}`);
    }
  }
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
  scheduledFor?: ScheduleInput;
}): Promise<{ negotiationId: string; jobId: string }> {
  const existing = await findActiveOwnerNegotiationByPhone(params.ownerPhone);
  const now = new Date().toISOString();

  let negotiationId: string;
  if (existing) {
    negotiationId = existing.id;
    const patch: Record<string, unknown> = { updatedAt: now };
    if (params.unitId && !existing.data.unitId) patch.unitId = params.unitId;
    if (params.ownerName && !existing.data.ownerName) patch.ownerName = params.ownerName;
    if (params.offerPrice !== undefined) patch.currentOfferPrice = params.offerPrice;
    if (params.interestedLeadId !== undefined) patch.interestedLeadId = params.interestedLeadId;
    await updateRecord('owner_negotiations', negotiationId, patch);
  } else {
    const created = await insertRecord<{ id: string }>('owner_negotiations', {
      ownerPhone: params.ownerPhone,
      status: 'contacted',
      history: [],
      createdAt: now,
      updatedAt: now,
      ...(params.ownerName ? { ownerName: params.ownerName } : {}),
      ...(params.unitId ? { unitId: params.unitId } : {}),
      ...(params.brokerListingId ? { brokerListingId: params.brokerListingId } : {}),
      ...(params.interestedLeadId ? { interestedLeadId: params.interestedLeadId } : {}),
      ...(params.askingPrice !== undefined ? { askingPrice: params.askingPrice } : {}),
      ...(params.offerPrice !== undefined ? { currentOfferPrice: params.offerPrice } : {}),
    });
    negotiationId = created.id;
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
    scheduledFor: params.scheduledFor,
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
  const negotiation = await getRecord<OwnerNegotiation>('owner_negotiations', negotiationId);
  if (!negotiation) {
    throw new Error(`Owner negotiation ${negotiationId} not found`);
  }

  if (params.price !== undefined) {
    await updateRecord('owner_negotiations', negotiationId, {
      currentOfferPrice: params.price,
      updatedAt: new Date().toISOString(),
    });
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
