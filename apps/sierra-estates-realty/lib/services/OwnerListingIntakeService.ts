import 'server-only';

/**
 * OWNER LISTING INTAKE SERVICE (Phase 2 + Phase 3 + 029 correlation rework)
 *
 * THE one reusable, server-side intake path for owner-submitted units.
 * Every inbound owner message — WhatsApp August group, WhatsApp DM,
 * Telegram, web — flows through here so that listing creation and parsing
 * logic exist exactly once.
 *
 * Guarantees (master execution command):
 *  1. validate the event source, sender, and group (done by callers' shared-secret gates);
 *  2. persist the incoming event and raw message/caption   → owner_inbound_events
 *     — FAIL-CLOSED: if the event ledger is unavailable, no side effects run.
 *  3. create a durable intake record BEFORE asking for missing fields
 *  4. run Arabic/English extraction over only the actual source content
 *  5. preserve null for unknown fields (no fabricated defaults)
 *  6. detect duplicates across WhatsApp, sheets, manual entry, and inventory
 *     — an EMPTY/unknown fingerprint never dedupes (null-guard);
 *     — a match is compound+type+beds+area/price-bucket evidence, explainable,
 *       and links/queues for staff review — never a silent overwrite.
 *  7. assign a canonical code only when it can be derived safely under the
 *     established Sierra coding scheme (else NEEDS_CODE)
 *  8. collect real photos through the provider's supported media mechanism
 *     — a MEDIA-ONLY message is never discarded: it correlates to an intake
 *       by explicit code / quoted-message context / single unambiguous open
 *       intake, else lands in a durable UNASSIGNED_MEDIA review state.
 *  9. store media in Supabase Storage
 * 10. save media URLs and metadata against the same canonical intake/unit
 * 11. write or update the canonical inventory record EXACTLY ONCE
 * 12. merge subsequent replies into the SAME intake — correlation order:
 *       a. explicit intake/unit code in the reply,
 *       b. provider reply/quoted-message context,
 *       c. exactly one unambiguous active intake,
 *       d. several matches → durable AMBIGUOUS_REPLY state + staff queue
 *          (never a guess, never a merge into an arbitrary intake).
 *     A message that clearly starts a DIFFERENT property creates a new intake
 *     even while another intake is open for the same sender.
 * 13. expose the record in an authenticated admin review queue
 * 14. notify authorized staff with the persistent unit code, source, missing info, status
 *
 * Event idempotency (029 state machine):
 *   RECEIVED → PROCESSING → COMPLETED  (replay returns the stored result)
 *   FAILED (retryable — the replay RESUMES the pinned intake instead of
 *   re-creating it; attempts + lease prevent concurrent double-processing).
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { insertRecord, listRecords, updateRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { toListingColumns } from '@/lib/server/listing-columns';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { escapeTelegramHtml, sendTelegramMessage } from '@/lib/telegram';
import { deriveCityFromCompound } from '@/lib/services/AugustOwnersAgentService';
import { generateSierraCode } from '@/lib/services/coding-algorithm';

export type IntakeSource =
  | 'whatsapp-august-owners'
  | 'whatsapp-group'
  | 'whatsapp-dm'
  | 'telegram'
  | 'web'
  | 'sheet';

export interface OwnerIntakeMessage {
  source: IntakeSource;
  sender: string;
  groupId?: string;
  /** Provider message id — the idempotency key. */
  messageId?: string;
  text: string;
  /** Real media from the provider (base64), already downloaded by the adapter. */
  media?: { data: string; mimeType: string }[];
  /**
   * Provider context when the sender REPLIES to / quotes an earlier message
   * (OpenWA quotedMsg / Telegram reply_to_message). Correlation key #2.
   */
  quotedMessageId?: string;
}

export interface IntakeOutcome {
  action:
    | 'duplicate_event'      // replayed webhook — the stored prior result is returned
    | 'not_a_listing'        // conversational message (no media to keep)
    | 'needs_information'    // durable intake exists, owner asked for missing fields
    | 'needs_code'           // complete-ish but no safe canonical code
    | 'merged'               // reply merged into existing open intake
    | 'media_attached'       // media-only message correlated + attached to an intake
    | 'unassigned_media'     // media-only, no unambiguous match → durable review state
    | 'ambiguous_reply'      // listing-shaped reply, several possible intakes → staff queue
    | 'unit_recorded'        // canonical listing row created (REVIEW_REQUIRED)
    | 'duplicate_listing'    // same fingerprint as an existing intake/unit
    | 'error';
  intakeId?: string;
  intakeCode?: string;
  unitId?: string;
  missingFields?: string[];
  replyMessage?: string;
  /** The merged extraction snapshot (for wrapper notifications). */
  extracted?: Record<string, unknown>;
  mediaUrls?: string[];
  /** Present on duplicate_event replays of COMPLETED events: the prior action. */
  priorAction?: string;
  error?: string;
  /**
   * P0 6.3: TRUE when the processing side effects ran but the event-ledger
   * COMPLETION/FAILURE write could not be persisted. The outcome above is
   * what happened; the ledger may still show PROCESSING until the lease
   * expires and a replay resumes the pinned intake. Consumers must NOT
   * treat an uncertain outcome as a clean success — surface it for review.
   */
  uncertain?: boolean;
}

interface IntakeRow {
  id: string;
  intakeCode: string;
  state: string;
  source: string;
  senderPhone: string;
  groupId: string | null;
  extracted: Record<string, unknown>;
  missingFields: string[];
  mediaUrls: string[];
  rawText: string | null;
  unitId: string | null;
  listingCode: string | null;
  dupeCheckHash: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EventRow {
  id: string;
  source: string;
  messageId: string | null;
  intakeId: string | null;
  state: string;
  attempts: number;
  lastError: string | null;
  leaseUntil: string | null;
  result: Record<string, unknown> | null;
}

const INTAKE_FIELDS_LABELS_AR: Record<string, string> = {
  compound: 'اسم الكومباوند / المشروع',
  price: 'السعر المطلوب بالجنيه',
  bedrooms: 'عدد غرف النوم',
  area: 'المساحة الإجمالية بالمتر المربع',
  type: 'نوع الوحدة (شقة / فيلا / توين هاوس...)',
  mode: 'نوع المعروض (بيع أم إيجار)',
  contactPhone: 'رقم هاتف المالك للتواصل',
};

const INTAKE_FIELDS_LABELS_EN: Record<string, string> = {
  compound: 'Compound Name',
  price: 'Required Price (EGP)',
  bedrooms: 'Number of Bedrooms',
  area: 'Total Area (m²)',
  type: 'Unit Type (Apartment / Villa / Townhouse...)',
  mode: 'Listing Type (Sale or Rent)',
  contactPhone: 'Contact Phone Number',
};

/** States in which an intake can still receive replies / be resumed. */
const OPEN_INTAKE_STATES = ['NEEDS_INFORMATION', 'NEEDS_CODE', 'FAILED'] as const;

/** Lease window for one event-processing attempt (crashed workers recover after it). */
const EVENT_LEASE_MS = 10 * 60 * 1000;

const INTAKE_CODE_PATTERN = /\bSE-(?:AUG|WA|TG|SH|WB)-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/i;

/**
 * Env guard: test harnesses set env keys to the literal string "undefined"
 * (process.env coerces) and placeholders like 'test-service-role-key' — none
 * of those are usable credentials. Treat them as unset.
 */
function usableEnv(name: string): string | undefined {
  const v = process.env[name];
  if (!v || /^(undefined|null|test-service-role-key|test-anon-key|)$/i.test(v.trim())) {
    return undefined;
  }
  return v.trim();
}

/** Redact PII for logs — the raw body is stored in the DB, never printed. */
function redact(text: string | undefined | null): string {
  if (!text) return '';
  const t = text.replace(/\b\d{10,}\b/g, '[phone]');
  return t.length > 120 ? `${t.slice(0, 120)}…` : t;
}

function normalizePhone(sender: string): string {
  const digits = (sender || '').replace(/\D/g, '');
  return digits.length >= 8 ? digits : (sender || '').trim();
}

/**
 * Cross-source duplicate fingerprint — NOT the old sender+text exact hash.
 * NULL- GUARDED (P0 3E): a fingerprint is only computed when there is ACTUAL
 * compound AND type evidence. An empty/unknown fingerprint must never cause
 * unrelated incomplete records to collapse into one intake.
 */
function computeIntakeFingerprint(extracted: Record<string, unknown>): string | null {
  const compound = String(extracted.compound ?? '').trim().toLowerCase();
  const type = String(extracted.type ?? '').trim().toLowerCase();
  if (!compound || /unknown|5th settlement/i.test(compound) || !type || type === 'unknown') {
    return null; // insufficient evidence — no fingerprint, no dedupe
  }
  const bedrooms = extracted.bedrooms == null ? '' : String(extracted.bedrooms);
  const area = extracted.area == null ? '' : String(Math.round(Number(extracted.area) / 10));
  const priceBucket = extracted.price == null
    ? ''
    : String(Math.round(Number(extracted.price) / 1000));
  const mode = String(extracted.mode ?? '').trim().toLowerCase();
  return createHash('sha256')
    .update([compound, type, bedrooms, area, priceBucket, mode].join('|'))
    .digest('hex');
}

type LedgerStatus =
  | { kind: 'new'; event: EventRow }
  | { kind: 'resume'; event: EventRow }
  | { kind: 'replay_completed'; event: EventRow }
  | { kind: 'in_flight' }
  | { kind: 'ledger_error'; error: string };

export class OwnerListingIntakeService {
  // ── admin client for the atomic event claim (env-gated; tests use the mocked db layer) ──
  private static adminClient() {
    const url = usableEnv('NEXT_PUBLIC_SUPABASE_URL') || usableEnv('SUPABASE_URL');
    const serviceKey = usableEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return null;
    try {
      return createClient(url, serviceKey, { auth: { persistSession: false } });
    } catch {
      return null;
    }
  }

  // ── Step 2 + 3C: persist the event; claim it for processing ──
  private static async claimEvent(msg: OwnerIntakeMessage): Promise<LedgerStatus> {
    // P0 6.1: an event WITHOUT a provider message id can never be deduplicated —
    // there is no stable identity to replay against, and OwnerIntakeMessage
    // carries no provider timestamp from which a trustworthy deterministic
    // replacement could be derived (a content hash would wrongly collapse two
    // genuinely-distinct messages). The old `no_ledger` bypass continued
    // WITHOUT idempotency; now the event is rejected into manual review —
    // no listing, no external message, no side effects.
    if (!msg.messageId) {
      logger.warn('[OwnerIntake] event without provider message id — REJECTED to manual review (no idempotency guarantee; fix the adapter to forward the provider event id)');
      return {
        kind: 'ledger_error',
        error: 'missing provider message id — cannot guarantee idempotency; event rejected to manual review (no side effects performed)',
      };
    }
    const source = msg.source.split('-')[0];
    let inserted: EventRow;
    try {
      inserted = await insertRecord<EventRow>('owner_inbound_events', {
        source,
        messageId: String(msg.messageId),
        sender: normalizePhone(msg.sender),
        groupId: msg.groupId ?? null,
        rawExcerpt: redact(msg.text),
        hasMedia: (msg.media?.length ?? 0) > 0,
        mediaCount: msg.media?.length ?? 0,
        state: 'RECEIVED',
      });
    } catch (err: any) {
      const msgText = String(err?.message ?? err ?? '');
      if (/duplicate key|unique constraint/i.test(msgText)) {
        // Replayed webhook: fetch the ledger row and branch on its state.
        const rows = await listRecords<EventRow>('owner_inbound_events', {
          where: [
            { column: 'source', value: source },
            { column: 'messageId', value: String(msg.messageId) },
          ],
          limit: 1,
        }).catch(() => [] as EventRow[]);
        const existing = rows[0];
        if (!existing) {
          // Ledger is failing BOTH write and read — FAIL CLOSED (P0 3C):
          // no side effects without the idempotency guarantee.
          return { kind: 'ledger_error', error: `event ledger read failed after conflict: ${msgText}` };
        }
        if (String(existing.state ?? 'RECEIVED') === 'COMPLETED') {
          // Completed replay returns the prior result — no re-execution.
          return { kind: 'replay_completed', event: existing };
        }
        const leaseAlive = existing.leaseUntil != null && new Date(existing.leaseUntil).getTime() > Date.now();
        if (String(existing.state ?? 'RECEIVED') === 'PROCESSING' && leaseAlive) {
          return { kind: 'in_flight' };
        }
        // RECEIVED without a live lease, stale PROCESSING or FAILED → resume.
        const claimed = await this.transitionToProcessing(existing);
        if (!claimed.ok) {
          return claimed.reason === 'error'
            ? { kind: 'ledger_error', error: `event claim failed (fail-closed): ${claimed.error ?? 'unknown'}` }
            : { kind: 'in_flight' };
        }
        return { kind: 'resume', event: claimed.event };
      }
      // Unknown ledger failure — FAIL CLOSED: no side effects (P0 3C).
      logger.warn(`[OwnerIntake] event ledger unavailable — failing closed: ${msgText}`);
      return { kind: 'ledger_error', error: msgText };
    }

    // Fresh row: claim it (RECEIVED → PROCESSING, attempts +1, lease).
    const claimed = await this.transitionToProcessing(inserted);
    if (!claimed.ok) {
      return claimed.reason === 'error'
        ? { kind: 'ledger_error', error: `event claim failed (fail-closed): ${claimed.error ?? 'unknown'}` }
        : { kind: 'in_flight' };
    }
    return { kind: 'new', event: claimed.event };
  }

  /**
   * Atomic RECEIVED/FAILED → PROCESSING claim. Uses a conditional PostgREST
   * PATCH when the service-role client is available (concurrent replays are
   * safe at the database level); falls back to the record layer otherwise
   * (unit-test path — single-writer by construction).
   *
   * P0 6.2: the claim is only reported as won when the persistence operation
   * SUCCEEDED. The previous fallback logged an update failure and still
   * returned the event as claimed — a failed state update now blocks all
   * side effects (fail-closed) instead of proceeding unclaimed.
   */
  private static async transitionToProcessing(
    event: EventRow,
  ): Promise<
    | { ok: true; event: EventRow }
    | { ok: false; reason: 'concurrent' | 'error'; error?: string }
  > {
    const leaseUntil = new Date(Date.now() + EVENT_LEASE_MS).toISOString();
    const attempts = Number(event.attempts ?? 0) + 1;
    const admin = this.adminClient();
    if (admin) {
      const { data, error } = await admin
        .from('owner_inbound_events')
        .update({ state: 'PROCESSING', attempts, leaseUntil })
        .eq('id', event.id)
        .in('state', ['RECEIVED', 'FAILED'])
        .select('id')
        .maybeSingle();
      if (error) {
        // A database ERROR is a failed claim — never "another worker won".
        logger.warn(`[OwnerIntake] event claim UPDATE FAILED (fail-closed, no side effects): ${error.message}`);
        return { ok: false, reason: 'error', error: error.message };
      }
      if (!data) {
        // Condition matched zero rows: a concurrent worker holds the claim.
        logger.warn('[OwnerIntake] event claim lost (concurrent worker or state moved)');
        return { ok: false, reason: 'concurrent' };
      }
      return { ok: true, event: { ...event, state: 'PROCESSING', attempts, leaseUntil } };
    }
    // Record-layer fallback: await the update; failure ⇒ NOT claimed.
    try {
      await updateRecord('owner_inbound_events', event.id, {
        state: 'PROCESSING',
        attempts,
        leaseUntil,
      });
    } catch (err: any) {
      logger.warn(`[OwnerIntake] event claim update FAILED (fail-closed, no side effects): ${err?.message}`);
      return { ok: false, reason: 'error', error: String(err?.message ?? err) };
    }
    return { ok: true, event: { ...event, state: 'PROCESSING', attempts, leaseUntil } };
  }

  /**
   * P0 6.3: completion write with HONEST persistence reporting. Returns
   * whether the ledger row actually reached COMPLETED. A `false` return means
   * side effects may exist while the ledger still shows PROCESSING — the
   * caller marks the outcome `uncertain` and the lease expiry lets a replay
   * resume the pinned intake instead of duplicating work.
   */
  private static async completeEvent(
    eventId: string | undefined,
    outcome: IntakeOutcome,
  ): Promise<boolean> {
    if (!eventId) return true; // nothing to persist — the outcome is the truth
    try {
      await updateRecord('owner_inbound_events', eventId, {
        state: 'COMPLETED',
        processedAt: new Date().toISOString(),
        leaseUntil: null,
        lastError: null,
        intakeId: outcome.intakeId ?? null,
        unitId: outcome.unitId ?? null,
        result: {
          action: outcome.action,
          intakeId: outcome.intakeId ?? null,
          intakeCode: outcome.intakeCode ?? null,
          unitId: outcome.unitId ?? null,
        },
      });
      return true;
    } catch (err: any) {
      logger.error(
        `[OwnerIntake] event completion write FAILED — outcome is UNCERTAIN (side effects may exist, ledger still PROCESSING; lease expires in ${EVENT_LEASE_MS}ms and replay resumes the pinned intake): ${err?.message}`,
      );
      return false;
    }
  }

  /** P0 6.3: failure write with honest persistence reporting (see completeEvent). */
  private static async failEvent(eventId: string | undefined, error: string, intakeId?: string): Promise<boolean> {
    if (!eventId) return true;
    try {
      await updateRecord('owner_inbound_events', eventId, {
        state: 'FAILED',
        lastError: error.slice(0, 500),
        leaseUntil: null,
        // Persist the intake linkage so a replay RESUMES this intake
        // instead of re-creating it (P0 3C retry-without-duplicate).
        ...(intakeId ? { intakeId } : {}),
      });
      return true;
    } catch (err: any) {
      logger.error(
        `[OwnerIntake] event FAILURE write also failed — outcome is UNCERTAIN (ledger still PROCESSING; lease expiry enables retry): ${err?.message}`,
      );
      return false;
    }
  }

  // ── The single entry point every intake source calls ──
  static async processOwnerMessage(msg: OwnerIntakeMessage): Promise<IntakeOutcome> {
    const senderPhone = normalizePhone(msg.sender);
    if (!senderPhone) {
      return { action: 'error', error: 'sender could not be normalized' };
    }

    // 2 + 3C: event ledger — replay handling, fail-closed, retry/resume.
    const ledger = await this.claimEvent(msg);
    if (ledger.kind === 'ledger_error') {
      return { action: 'error', error: `event ledger unavailable — intake refused (fail-closed): ${ledger.error}` };
    }
    if (ledger.kind === 'replay_completed') {
      const prior = (ledger.event.result ?? {}) as Record<string, unknown>;
      return {
        action: 'duplicate_event',
        priorAction: typeof prior.action === 'string' ? prior.action : undefined,
        intakeId: typeof prior.intakeId === 'string' ? prior.intakeId : undefined,
        intakeCode: typeof prior.intakeCode === 'string' ? prior.intakeCode : undefined,
        unitId: typeof prior.unitId === 'string' ? prior.unitId : undefined,
      };
    }
    if (ledger.kind === 'in_flight') {
      return { action: 'error', error: 'event is currently being processed by another worker' };
    }

    const eventId = ledger.event.id;
    // A resumed event pins the intake it already produced (P0 3C: retries
    // resume the same work instead of creating a second intake).
    const pinnedIntakeId =
      ledger.kind === 'resume' && ledger.event.intakeId ? ledger.event.intakeId : undefined;

    try {
      const outcome = await this.process(msg, senderPhone, pinnedIntakeId);
      // An 'error' outcome (caught internal failure) is FAILED — retryable
      // — never COMPLETED: the provider's replay resumes the pinned intake.
      // P0 6.3: the persisted flag tells the caller whether the ledger
      // actually reflects the outcome; an unpersisted success/failure is
      // reported back as UNCERTAIN, never silently upgraded.
      if (outcome.action === 'error') {
        const persisted = await this.failEvent(eventId, outcome.error ?? 'processing failed', outcome.intakeId);
        return persisted ? outcome : { ...outcome, uncertain: true };
      }
      const persisted = await this.completeEvent(eventId, outcome);
      return persisted ? outcome : { ...outcome, uncertain: true };
    } catch (err: any) {
      const message = String(err?.message ?? err);
      const persisted = await this.failEvent(eventId, message, typeof err?.intakeId === 'string' ? err.intakeId : undefined);
      logger.warn(`[OwnerIntake] processing failed (event ${persisted ? 'FAILED, retryable' : 'UNCERTAIN — ledger write also failed; lease expiry enables retry'}): ${message}`);
      return { action: 'error', error: message, ...(persisted ? {} : { uncertain: true }) };
    }
  }

  // ── Core processing (inside the event tracking envelope) ──
  private static async process(
    msg: OwnerIntakeMessage,
    senderPhone: string,
    pinnedIntakeId?: string,
  ): Promise<IntakeOutcome> {
    // 4: extraction over ONLY the actual source content
    let parsed: any;
    try {
      parsed = await WhatsAppParserService.parseMessage(
        msg.text,
        msg.media?.[0] ? { data: msg.media[0].data, mimeType: msg.media[0].mimeType } : undefined,
      );
    } catch (parseErr: any) {
      logger.warn(`[OwnerIntake] AI parse unavailable, heuristic fallback: ${parseErr?.message}`);
      parsed = null;
    }
    const extracted = this.mergeExtracted({}, parsed ?? {}, senderPhone);

    // A listing needs an actual LISTING signal (price / compound / type /
    // mode / beds / area). A sender phone alone is conversational context —
    // it must never classify a greeting as a unit.
    const listingSignalFields = ['compound', 'price', 'type', 'mode', 'bedrooms', 'area'] as const;
    const isListing =
      parsed?.isListing === true ||
      listingSignalFields.some(
        (f) => !this.isEmptyValue(f, extracted[f]) &&
          !(f === 'compound' && /unknown|5th settlement/i.test(String(extracted[f]))) &&
          !(f === 'type' && String(extracted[f]).toLowerCase() === 'unknown')
      );

    // ── Correlation keys (P0 3B) ──
    const pinned = await this.resolvePinnedIntake(msg, pinnedIntakeId);

    // ── P0 3A: MEDIA-ONLY messages are never discarded ──
    // A media payload with no listing signal correlates to an intake
    // (explicit code / quoted context / one unambiguous open intake) or is
    // durably parked in UNASSIGNED_MEDIA for staff. Never `not_a_listing`.
    if (!isListing && (msg.media?.length ?? 0) > 0) {
      return await this.handleMediaOnlyMessage(msg, senderPhone, pinned);
    }

    if (!isListing) {
      return { action: 'not_a_listing' };
    }

    // 6: cross-source duplicate detection (before creating anything).
    // The PINNED intake (a retried event resuming its own work) is never a
    // "duplicate" of itself — it is the work unit being resumed.
    // P0 6.4: lookups are NOT wrapped in `.catch(() => [])` — a database
    // outage must NEVER be interpreted as "no duplicate exists". A failed
    // check propagates, marks the event FAILED (retryable) and the provider
    // replay re-runs the whole dedupe pass.
    const fingerprint = computeIntakeFingerprint(extracted);
    if (fingerprint) {
      const existingIntakeRows = await listRecords<{ id: string; intakeCode: string }>('owner_listing_intakes', {
        where: [{ column: 'dupeCheckHash', value: fingerprint }],
        select: 'id,intakeCode',
        limit: 5,
      });
      const existingIntake = existingIntakeRows.find((r) => r.id !== pinnedIntakeId);
      if (existingIntake) {
        // Media still counts: attach any new photos to the existing intake.
        await this.attachMedia(existingIntake.id, msg);
        return {
          action: 'duplicate_listing',
          intakeId: existingIntake.id,
          intakeCode: existingIntake.intakeCode,
        };
      }

      // Cross-source: the same fingerprint on an existing canonical listing
      // (a prior intake-created unit, or any projection carrying the hash).
      const existingUnit = await listRecords<{ id: string; code: string | null }>('listings', {
        where: [{ column: 'dupeCheckHash', value: fingerprint }],
        select: 'id,code',
        limit: 1,
      });
      if (existingUnit.length > 0) {
        return await this.recordDuplicateAgainstListing(
          msg, senderPhone, extracted, fingerprint, existingUnit[0].id, existingUnit[0].code ?? undefined,
        );
      }

      // Explainable near-match against the canonical inventory itself
      // (compound + type + beds equality, price/area tolerance) — catches
      // sheet-synced / manually entered units that carry no intake hash.
      const nearMatch = await this.findCanonicalNearDuplicate(extracted);
      if (nearMatch) {
        return await this.recordDuplicateAgainstListing(
          msg, senderPhone, extracted, fingerprint, nearMatch.id, nearMatch.code ?? undefined,
        );
      }
    }

    // 3 + 12: correlate the reply — pinned target, unambiguous open intake,
    // a clearly-different property, or an AMBIGUOUS_REPLY staff queue.
    if (pinned) {
      return await this.mergeIntoIntake(pinned, msg, extracted, fingerprint);
    }

    const openIntakes = await this.findOpenIntakes(senderPhone);
    if (openIntakes.length === 1) {
      // "Clearly starts a different property": a concrete compound that
      // contradicts the open intake's recorded compound opens a NEW intake
      // (P0 3B) — it is never merged across properties.
      const open = openIntakes[0];
      const newCompound = String(extracted.compound ?? '').trim().toLowerCase();
      const openCompound = String((open.extracted ?? {}).compound ?? '').trim().toLowerCase();
      const compoundsContradict =
        newCompound && openCompound &&
        !/unknown|5th settlement/i.test(newCompound) && !/unknown|5th settlement/i.test(openCompound) &&
        newCompound !== openCompound;
      if (!compoundsContradict) {
        return await this.mergeIntoIntake(open, msg, extracted, fingerprint);
      }
      // Different property → new intake below (concurrent intakes allowed).
    } else if (openIntakes.length > 1) {
      // Several possible targets — persist durably and queue for staff;
      // ask the owner for the unit code. NEVER guess (P0 3B).
      return await this.recordAmbiguousReply(msg, senderPhone, extracted, fingerprint, openIntakes);
    }

    // 3: create the durable intake record FIRST — before asking anything
    const intakeCode = this.generateIntakeCode(msg.source);
    const missingFields = this.computeMissing(extracted);
    const mediaUrls = await this.storeMedia(msg, intakeCode);

    const intake = await insertRecord<IntakeRow>('owner_listing_intakes', {
      intakeCode,
      state: missingFields.length > 0 ? 'NEEDS_INFORMATION' : 'REVIEW_REQUIRED',
      source: msg.source,
      senderPhone,
      groupId: msg.groupId ?? null,
      extracted,
      missingFields,
      mediaUrls,
      rawText: msg.text,
      dupeCheckHash: fingerprint ?? null,
    });

    // 12: queue the missing-field questions against the DURABLE record
    if (missingFields.length > 0) {
      const reply = this.buildMissingFieldsPrompt(intakeCode, missingFields, msg.sender);
      await this.enqueueReply(msg, reply);
      await this.notifyStaff(intake, missingFields);
      return {
        action: 'needs_information',
        intakeId: intake.id,
        intakeCode,
        missingFields,
        replyMessage: reply,
      };
    }

    // 7 + 11: complete → canonical inventory record, exactly once
    return await this.finalizeIntake(intake, extracted, msg, mediaUrls);
  }

  // ── P0 3A: media-only correlation ──
  private static async handleMediaOnlyMessage(
    msg: OwnerIntakeMessage,
    senderPhone: string,
    pinned: IntakeRow | null,
  ): Promise<IntakeOutcome> {
    // 1. explicit code / quoted-message context → the pinned intake
    if (pinned) {
      await this.attachMedia(pinned.id, msg);
      await this.syncMediaToUnitIfLinked(pinned);
      return {
        action: 'media_attached',
        intakeId: pinned.id,
        intakeCode: pinned.intakeCode,
        unitId: pinned.unitId ?? undefined,
        mediaUrls: pinned.mediaUrls ?? [],
      };
    }

    // 2. exactly one unambiguous open intake for this sender
    const open = await this.findOpenIntakes(senderPhone);
    if (open.length === 1) {
      await this.attachMedia(open[0].id, msg);
      await this.syncMediaToUnitIfLinked(open[0]);
      return {
        action: 'media_attached',
        intakeId: open[0].id,
        intakeCode: open[0].intakeCode,
        unitId: open[0].unitId ?? undefined,
        mediaUrls: open[0].mediaUrls ?? [],
      };
    }

    // 3. zero or several candidates → durable UNASSIGNED_MEDIA review state.
    //    The image is persisted (storage permitting), the event is already in
    //    the ledger, and staff correlate it from the admin queue.
    const intakeCode = this.generateIntakeCode(msg.source);
    const mediaUrls = await this.storeMedia(msg, intakeCode);
    const intake = await insertRecord<IntakeRow>('owner_listing_intakes', {
      intakeCode,
      state: 'UNASSIGNED_MEDIA',
      source: msg.source,
      senderPhone,
      groupId: msg.groupId ?? null,
      extracted: {},
      missingFields: ['correlation'],
      mediaUrls,
      rawText: msg.text || '[media-only message]',
      lastError: mediaUrls.length === 0 && (msg.media?.length ?? 0) > 0
        ? 'media storage unavailable — binary not persisted, staff must collect via photo-request'
        : null,
    });

    // Ambiguous case: ask the owner which unit code the photos belong to.
    if (open.length > 1) {
      const reply =
        `📎 *سييرا إستيتس | صورة بدون كود وحدة*\n\n` +
        `يوجد أكثر من طلب مفتوح باسمكم — يرجى الرد بكود الوحدة المعنية` +
        ` (${open.map((i) => `\`${i.intakeCode}\``).join(' أو ')}) لربط الصور بها.`;
      await this.enqueueReply(msg, reply);
    }

    await this.notifyStaff(
      { ...intake, state: 'UNASSIGNED_MEDIA' },
      ['correlation'],
    );
    return {
      action: 'unassigned_media',
      intakeId: intake.id,
      intakeCode,
      mediaUrls,
    };
  }

  // ── Correlation key resolution: explicit code → quoted context ──
  private static async resolvePinnedIntake(
    msg: OwnerIntakeMessage,
    pinnedIntakeId?: string,
  ): Promise<IntakeRow | null> {
    // (a) resumed event pins its own intake
    if (pinnedIntakeId) {
      const rows = await listRecords<IntakeRow>('owner_listing_intakes', {
        where: [{ column: 'id', value: pinnedIntakeId }],
        limit: 1,
      });
      if (rows[0]) return rows[0];
    }

    // (b) explicit intake code inside the reply text
    const codeMatch = (msg.text ?? '').match(INTAKE_CODE_PATTERN);
    if (codeMatch) {
      const code = codeMatch[0].toUpperCase();
      const rows = await listRecords<IntakeRow>('owner_listing_intakes', {
        where: [{ column: 'intakeCode', value: code }],
        limit: 1,
      });
      if (rows[0]) return rows[0];
    }

    // (c) provider reply/quoted-message context: the quoted message is a
    //     prior inbound event whose intake_id points at the target intake.
    if (msg.quotedMessageId) {
      const source = msg.source.split('-')[0];
      const events = await listRecords<{ intakeId: string | null }>('owner_inbound_events', {
        where: [
          { column: 'source', value: source },
          { column: 'messageId', value: String(msg.quotedMessageId) },
        ],
        select: 'intakeId',
        limit: 1,
      });
      const targetIntakeId = events[0]?.intakeId;
      if (targetIntakeId) {
        const rows = await listRecords<IntakeRow>('owner_listing_intakes', {
          where: [{ column: 'id', value: targetIntakeId }],
          limit: 1,
        });
        if (rows[0]) return rows[0];
      }
    }

    return null;
  }

  // ── Merge a follow-up reply into the SAME intake ──
  private static async mergeIntoIntake(
    intake: IntakeRow,
    msg: OwnerIntakeMessage,
    freshExtracted: Record<string, unknown>,
    fingerprint: string | null,
  ): Promise<IntakeOutcome> {
    // Previously-supplied fields win; only previously-NULL fields are filled.
    const merged = this.mergeExtracted(intake.extracted ?? {}, freshExtracted, intake.senderPhone);
    const mediaUrls = [
      ...new Set([...(intake.mediaUrls ?? []), ...(await this.storeMedia(msg, intake.intakeCode))]),
    ];
    const missingFields = this.computeMissing(merged);

    try {
      await updateRecord('owner_listing_intakes', intake.id, {
        extracted: merged,
        missingFields,
        mediaUrls,
        rawText: `${intake.rawText ?? ''}\n---\n${msg.text}`.slice(0, 8000),
        state: missingFields.length > 0 ? 'NEEDS_INFORMATION' : 'REVIEW_REQUIRED',
        dupeCheckHash: fingerprint ?? intake.dupeCheckHash,
        lastError: null,
        updatedAt: new Date().toISOString(),
      });
    } catch (mergeErr: any) {
      // Attach the intake linkage so the event replay resumes THIS intake.
      (mergeErr as any).intakeId = intake.id;
      throw mergeErr;
    }

    const updated: IntakeRow = { ...intake, extracted: merged, mediaUrls, missingFields };

    if (missingFields.length > 0) {
      const reply = this.buildMissingFieldsPrompt(intake.intakeCode, missingFields, msg.sender);
      await this.enqueueReply(msg, reply);
      return {
        action: 'merged',
        intakeId: intake.id,
        intakeCode: intake.intakeCode,
        missingFields,
        replyMessage: reply,
      };
    }

    const finalized = await this.finalizeIntake(updated, merged, msg, mediaUrls);
    return { ...finalized, action: finalized.action === 'unit_recorded' ? 'unit_recorded' : 'merged' };
  }

  // ── 11: write the canonical inventory record exactly once ──
  private static async finalizeIntake(
    intake: IntakeRow,
    extracted: Record<string, unknown>,
    msg: OwnerIntakeMessage,
    mediaUrls: string[],
  ): Promise<IntakeOutcome> {
    if (intake.unitId) {
      // Already linked — media merge only; never a second unit.
      await this.syncMediaToUnit(intake.unitId, mediaUrls);
      return { action: 'merged', intakeId: intake.id, intakeCode: intake.intakeCode, unitId: intake.unitId };
    }

    const compound = String(extracted.compound ?? '').trim();
    const propertyType = String(extracted.type ?? '').trim();
    // P0 3D: an unknown sale/rent mode must NOT default to 'sale'.
    const rawMode = String(extracted.mode ?? '').trim().toLowerCase();
    const mode = rawMode === 'rent' || rawMode === 'sale' ? rawMode : null;
    const price = Number(extracted.price) > 0 ? Number(extracted.price) : undefined;

    // 7 + 3F: a canonical code is assigned ONLY when it can be derived
    // safely under the established Sierra coding scheme; the intake code
    // remains the stable cross-reference, and a retry re-derives the same
    // code deterministically (same compound/rooms/price inputs).
    let listingCode: string | null = null;
    if (mode && compound && propertyType && price != null && extracted.bedrooms != null) {
      try {
        listingCode = generateSierraCode({
          compound,
          rooms: Number(extracted.bedrooms),
          price,
          furnishingStatus: extracted.finishing != null ? String(extracted.finishing) : undefined,
          features: [],
        });
      } catch {
        listingCode = null;
      }
    }
    if (!listingCode) {
      await updateRecord('owner_listing_intakes', intake.id, {
        state: 'NEEDS_CODE',
        missingFields: this.computeMissing(extracted),
        lastError: 'canonical Sierra code not derivable — staff assignment required',
        updatedAt: new Date().toISOString(),
      });
      await this.notifyStaff({ ...intake, state: 'NEEDS_CODE' }, this.computeMissing(extracted));
      return {
        action: 'needs_code',
        intakeId: intake.id,
        intakeCode: intake.intakeCode,
        missingFields: this.computeMissing(extracted),
      };
    }

    const now = new Date().toISOString();

    const listingDocument = {
      code: listingCode,
      title: `${propertyType} · ${compound}`,
      titleAr: `${propertyType} في ${compound}`,
      compound,
      city: deriveCityFromCompound(compound),
      propertyType,
      dealType: mode as string,
      price,
      bedrooms: extracted.bedrooms == null ? undefined : Number(extracted.bedrooms),
      bathrooms: extracted.bathrooms == null ? undefined : Number(extracted.bathrooms),
      areaSqm: extracted.area == null ? undefined : Number(extracted.area),
      finishingType: extracted.finishing ?? undefined,
      ownerName: extracted.ownerName ?? msg.sender,
      ownerPhone: extracted.contactPhone ?? intake.senderPhone,
      ownerType: 'owner',
      // P0 3D: the owner's availability CLAIM is preserved separately; an
      // unverified submission is NOT a confirmed 'available' fact. 'pending'
      // keeps the unit out of every availability-asserting path until staff
      // verification confirms it (the publish gate's condition 1 fails).
      status: 'pending',
      // §21 + Phase D: owner intake is UNVERIFIED — private until staff review.
      publishStatus: 'REVIEW_REQUIRED',
      dupeCheckHash: intake.dupeCheckHash ?? undefined,
      images: mediaUrls,
      photoCount: mediaUrls.length,
      sourceChannel: msg.source,
      description: msg.text,
      createdAt: now,
      updatedAt: now,
      rawData: {
        intakeId: intake.id,
        intakeCode: intake.intakeCode,
        whatsappGroupId: msg.groupId ?? null,
        ownerAvailabilityClaim: 'available',
        contactSource:
          extracted.contactPhone != null ? 'owner-stated' : 'sender-fallback',
      },
    };

    try {
      const created = await insertRecord<{ id: string }>(
        'listings',
        toListingColumns(listingDocument),
      );
      await updateRecord('owner_listing_intakes', intake.id, {
        state: 'REVIEW_REQUIRED',
        unitId: created.id,
        listingCode,
        lastError: null,
        updatedAt: now,
      });

      // 14: notify staff with the persistent code + status
      await this.notifyStaff(
        { ...intake, listingCode, state: 'REVIEW_REQUIRED' },
        [],
        created.id,
      );

      return {
        action: 'unit_recorded',
        intakeId: intake.id,
        intakeCode: intake.intakeCode,
        unitId: created.id,
        extracted,
        mediaUrls,
      };
    } catch (dbErr: any) {
      // Durable FAILED state — retryable against the same intake id/code.
      await updateRecord('owner_listing_intakes', intake.id, {
        state: 'FAILED',
        lastError: String(dbErr?.message ?? dbErr).slice(0, 500),
        updatedAt: new Date().toISOString(),
      }).catch(() => undefined);
      return { action: 'error', intakeId: intake.id, intakeCode: intake.intakeCode, error: String(dbErr?.message ?? dbErr) };
    }
  }

  // ── P0 3B: several open intakes — durable AMBIGUOUS_REPLY for staff ──
  private static async recordAmbiguousReply(
    msg: OwnerIntakeMessage,
    senderPhone: string,
    extracted: Record<string, unknown>,
    fingerprint: string | null,
    openIntakes: IntakeRow[],
  ): Promise<IntakeOutcome> {
    const intakeCode = this.generateIntakeCode(msg.source);
    const mediaUrls = await this.storeMedia(msg, intakeCode);
    const intake = await insertRecord<IntakeRow>('owner_listing_intakes', {
      intakeCode,
      state: 'AMBIGUOUS_REPLY',
      source: msg.source,
      senderPhone,
      groupId: msg.groupId ?? null,
      extracted,
      missingFields: ['correlation'],
      mediaUrls,
      rawText: msg.text,
      dupeCheckHash: fingerprint ?? null,
      lastError: `ambiguous reply — candidates: ${openIntakes.map((i) => i.intakeCode).join(', ')}`,
    });

    const reply =
      `🤔 *سييرا إستيتس | توضيح مطلوب*\n\n` +
      `يوجد أكثر من طلب مفتوح باسمكم:\n` +
      openIntakes.map((i) => ` • \`${i.intakeCode}\``).join('\n') +
      `\nيرجى الرد بكود الوحدة المعنية لربط هذه البيانات بها.`;
    await this.enqueueReply(msg, reply);
    await this.notifyStaff({ ...intake, state: 'AMBIGUOUS_REPLY' }, ['correlation']);
    return {
      action: 'ambiguous_reply',
      intakeId: intake.id,
      intakeCode,
      replyMessage: reply,
      extracted,
    };
  }

  // ── P0 3E: explainable near-duplicate against canonical inventory ──
  private static async findCanonicalNearDuplicate(
    extracted: Record<string, unknown>,
  ): Promise<{ id: string; code: string | null } | null> {
    const compound = String(extracted.compound ?? '').trim();
    const propertyType = String(extracted.type ?? '').trim().toLowerCase();
    if (!compound || !propertyType) return null;
    const where: Array<{ column: string; value: unknown }> = [
      { column: 'compound', value: compound },
      { column: 'propertyType', value: propertyType },
    ];
    if (extracted.bedrooms != null) where.push({ column: 'bedrooms', value: Number(extracted.bedrooms) });

    const rows = await listRecords<{ id: string; code: string | null; price: number | null; areaSqm: number | null }>(
      'listings',
      { where, select: 'id,code,price,areaSqm', limit: 50 },
    );

    const price = Number(extracted.price);
    const area = Number(extracted.area);
    for (const row of rows) {
      const priceClose = Number.isFinite(price) && price > 0 && row.price != null
        ? Math.abs(Number(row.price) - price) / price <= 0.02
        : false;
      const areaClose = Number.isFinite(area) && area > 0 && row.areaSqm != null
        ? Math.abs(Number(row.areaSqm) - area) / area <= 0.10
        : false;
      // Require compound + type + beds (query) AND (price OR area evidence):
      // never flag two properties as duplicates solely because they share an
      // owner, a similar price or a similar description.
      if (priceClose || areaClose) return { id: row.id, code: row.code };
    }
    return null;
  }

  // ── Duplicate linkage to an existing canonical listing (staff review) ──
  private static async recordDuplicateAgainstListing(
    msg: OwnerIntakeMessage,
    senderPhone: string,
    extracted: Record<string, unknown>,
    fingerprint: string,
    existingUnitId: string,
    existingUnitCode?: string,
  ): Promise<IntakeOutcome> {
    const intakeCode = this.generateIntakeCode(msg.source);
    const mediaUrls = await this.storeMedia(msg, intakeCode);
    const intake = await insertRecord<IntakeRow>('owner_listing_intakes', {
      intakeCode,
      state: 'DUPLICATE',
      source: msg.source,
      senderPhone,
      groupId: msg.groupId ?? null,
      extracted,
      missingFields: [],
      mediaUrls,
      rawText: msg.text,
      dupeCheckHash: fingerprint,
      unitId: existingUnitId,
      listingCode: existingUnitCode ?? null,
      lastError: `duplicate of listing ${existingUnitId}${existingUnitCode ? ` (${existingUnitCode})` : ''} — staff review`,
    });
    await this.notifyStaff({ ...intake, state: 'DUPLICATE' }, []);
    return {
      action: 'duplicate_listing',
      intakeId: intake.id,
      intakeCode,
      unitId: existingUnitId,
    };
  }

  // ── 8+9+10: real photos → Supabase Storage → same intake/unit ──
  private static async storeMedia(
    msg: OwnerIntakeMessage,
    code: string,
  ): Promise<string[]> {
    if (!msg.media?.length) return [];
    const url = usableEnv('NEXT_PUBLIC_SUPABASE_URL') || usableEnv('SUPABASE_URL');
    const serviceKey = usableEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) {
      logger.warn('[OwnerIntake] Supabase Storage not configured — media held in intake raw state only');
      return [];
    }
    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
    const urls: string[] = [];
    for (const [i, m] of msg.media.entries()) {
      try {
        const ext = /png/i.test(m.mimeType) ? 'png' : /webp/i.test(m.mimeType) ? 'webp' : 'jpg';
        const path = `whatsapp/${code}_${Date.now()}_${i}.${ext}`;
        const { error } = await adminClient.storage
          .from('listing-photos')
          .upload(path, Buffer.from(m.data, 'base64'), { contentType: m.mimeType, upsert: false });
        if (error) {
          logger.warn(`[OwnerIntake] media upload failed: ${error.message}`);
          continue;
        }
        const { data } = adminClient.storage.from('listing-photos').getPublicUrl(path);
        if (data?.publicUrl) urls.push(data.publicUrl);
      } catch (err: any) {
        logger.warn(`[OwnerIntake] media upload error (non-fatal): ${err?.message}`);
      }
    }
    return urls;
  }

  private static async syncMediaToUnit(unitId: string, mediaUrls: string[]): Promise<void> {
    if (mediaUrls.length === 0) return;
    try {
      const { getRecord } = await import('@sierra-estates/db');
      const unit = await getRecord<{ images?: string[]; photoCount?: number }>('listings', unitId);
      if (!unit) return;
      const images = [...new Set([...(unit.images ?? []), ...mediaUrls])];
      await updateRecord('listings', unitId, {
        images,
        photoCount: images.length,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.warn(`[OwnerIntake] unit media sync failed: ${err?.message}`);
    }
  }

  private static async syncMediaToUnitIfLinked(intake: IntakeRow): Promise<void> {
    if (intake.unitId && (intake.mediaUrls?.length ?? 0) > 0) {
      await this.syncMediaToUnit(intake.unitId, intake.mediaUrls ?? []);
    }
  }

  private static async attachMedia(
    intakeId: string,
    msg: OwnerIntakeMessage,
  ): Promise<void> {
    try {
      const rows = await listRecords<IntakeRow>('owner_listing_intakes', {
        where: [{ column: 'id', value: intakeId }],
        limit: 1,
      });
      const intake = rows[0];
      if (!intake) return;
      const mediaUrls = [
        ...new Set([...(intake.mediaUrls ?? []), ...(await this.storeMedia(msg, intake.intakeCode))]),
      ];
      await updateRecord('owner_listing_intakes', intakeId, {
        mediaUrls,
        updatedAt: new Date().toISOString(),
      });
      if (intake.unitId) await this.syncMediaToUnit(intake.unitId, mediaUrls);
    } catch (err: any) {
      logger.warn(`[OwnerIntake] duplicate-path media attach failed: ${err?.message}`);
    }
  }

  // ── helpers ──

  private static mergeExtracted(
    base: Record<string, unknown>,
    fresh: Record<string, unknown>,
    senderPhone: string,
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(fresh ?? {})) {
      // Previously-supplied values win; only previously-empty slots are filled.
      if (this.isEmptyValue(key, value)) continue;
      if (this.isEmptyValue(key, merged[key])) merged[key] = value;
    }
    if (this.isEmptyValue('contactPhone', merged.contactPhone)) {
      const freshPhone = typeof (fresh as Record<string, unknown>)?.phoneNumber === 'string'
        ? (fresh as Record<string, unknown>).phoneNumber as string
        : '';
      const digits = freshPhone.replace(/\D/g, '') || senderPhone.replace(/\D/g, '');
      if (digits.length >= 8) merged.contactPhone = digits;
    }
    return merged;
  }

  /** Domain-aware emptiness: for price/area, 0 means UNKNOWN (not a value). */
  private static isEmptyValue(key: string, value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (typeof value === 'number' && !Number.isFinite(value)) return true;
    if ((key === 'price' || key === 'area') && Number(value) <= 0) return true;
    return false;
  }

  private static computeMissing(extracted: Record<string, unknown>): string[] {
    const missing: string[] = [];
    if (!extracted.compound || /unknown|5th settlement/i.test(String(extracted.compound))) missing.push('compound');
    if (!(Number(extracted.price) > 0)) missing.push('price');
    if (extracted.bedrooms == null) missing.push('bedrooms');
    if (!(Number(extracted.area) > 0)) missing.push('area');
    if (!extracted.type || String(extracted.type).toLowerCase() === 'unknown') missing.push('type');
    if (!['sale', 'rent'].includes(String(extracted.mode ?? '').toLowerCase())) missing.push('mode');
    if (!extracted.contactPhone || String(extracted.contactPhone).replace(/\D/g, '').length < 8) {
      missing.push('contactPhone');
    }
    return missing;
  }

  private static generateIntakeCode(source: string): string {
    const prefix =
      source === 'whatsapp-august-owners' ? 'SE-AUG'
      : source.startsWith('whatsapp') ? 'SE-WA'
      : source === 'telegram' ? 'SE-TG'
      : source === 'sheet' ? 'SE-SH'
      : 'SE-WB';
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${stamp}-${rand}`;
  }

  private static buildMissingFieldsPrompt(
    intakeCode: string,
    missingFields: string[],
    sender: string,
  ): string {
    const bullets = missingFields
      .map((f) => ` • *${INTAKE_FIELDS_LABELS_AR[f] ?? f}* (${INTAKE_FIELDS_LABELS_EN[f] ?? f})`)
      .join('\n');
    const senderName = (sender || '').split('@')[0] || 'الزميل العزيز';
    return (
      `⚠️ *سييرا إستيتس | مطلوب استكمال بيانات الوحدة (كود: ${intakeCode})*\n\n` +
      `مرحباً @${senderName}، تم رصد بيانات الوحدة المذكورة وتسجيلها بالكود أعلاه.\n` +
      `لتتم المراجعة والتحقق من فريق سييرا، يرجى توضيح البيانات الآتية:\n\n` +
      `${bullets}\n\n` +
      `💬 يرجى الرد على هذه الرسالة لإتمام الإضافة آلياً — سيتم دمج ردكم مع نفس الكود.`
    );
  }

  private static async enqueueReply(msg: OwnerIntakeMessage, body: string): Promise<void> {
    const target = msg.groupId || msg.sender;
    try {
      await enqueueWhatsAppJob({ purpose: 'general-outreach', toPhone: target, body });
    } catch (err: any) {
      logger.warn(`[OwnerIntake] reply enqueue failed: ${err?.message}`);
    }
  }

  /** 14: staff notification with persistent code, source, missing info, status. */
  private static async notifyStaff(
    intake: { intakeCode: string; state: string; source: string; listingCode?: string | null },
    missingFields: string[],
    unitId?: string,
  ): Promise<void> {
    try {
      const missing = missingFields.length > 0
        ? missingFields.map((f) => INTAKE_FIELDS_LABELS_EN[f] ?? f).join(', ')
        : 'none — complete, awaiting review';
      const alert = [
        `📥 <b>Owner Intake Update</b>`,
        `<b>Code:</b> <code>${escapeTelegramHtml(intake.intakeCode)}</code>`,
        `<b>Source:</b> ${escapeTelegramHtml(intake.source)}`,
        `<b>State:</b> ${escapeTelegramHtml(intake.state)}`,
        `<b>Missing:</b> ${escapeTelegramHtml(missing)}`,
        unitId ? `<b>Unit:</b> ${escapeTelegramHtml(unitId)}` : '',
        intake.state === 'REVIEW_REQUIRED'
          ? '<b>Action:</b> awaiting staff review in the admin verification queue (private until verified)'
          : '',
        intake.state === 'UNASSIGNED_MEDIA'
          ? '<b>Action:</b> media-only message with no unambiguous intake — correlate it in the admin queue'
          : '',
        intake.state === 'AMBIGUOUS_REPLY'
          ? '<b>Action:</b> reply could not be correlated (several open intakes) — resolve in the admin queue'
          : '',
        intake.state === 'DUPLICATE'
          ? '<b>Action:</b> likely duplicate of an existing unit — review, do not overwrite'
          : '',
      ].filter(Boolean).join('\n');
      await sendTelegramMessage(alert);
    } catch (err: any) {
      logger.warn(`[OwnerIntake] staff Telegram notification skipped: ${err?.message}`);
    }
    const notifyAdminNumber = process.env.LEAD_NOTIFY_WHATSAPP_NUMBER || process.env.ADMIN_PHONE;
    if (notifyAdminNumber) {
      try {
        await enqueueWhatsAppJob({
          purpose: 'general-outreach',
          toPhone: notifyAdminNumber,
          body: `📥 [Sierra Intake] ${intake.intakeCode} — state ${intake.state}, source ${intake.source}. Missing: ${missingFields.join(', ') || 'none'}. Private until staff review.`,
        });
      } catch (err: any) {
        logger.warn(`[OwnerIntake] staff WhatsApp notification skipped: ${err?.message}`);
      }
    }
  }

  /**
   * P0 3B: ALL open intakes for a sender (code/context correlation happens
   * before this is consulted; ambiguity is handled by recordAmbiguousReply).
   */
  // P0 6.4: open-intake lookup fails CLOSED — a database outage during
  // correlation must produce a retryable error, never an empty candidate list
  // that would silently start a duplicate intake.
  private static async findOpenIntakes(senderPhone: string): Promise<IntakeRow[]> {
    const rows = await listRecords<IntakeRow>('owner_listing_intakes', {
      where: [{ column: 'senderPhone', value: senderPhone }],
      orderBy: { column: 'createdAt', ascending: false },
      limit: 20,
    });
    return rows.filter((r) => (OPEN_INTAKE_STATES as readonly string[]).includes(r.state));
  }
}
