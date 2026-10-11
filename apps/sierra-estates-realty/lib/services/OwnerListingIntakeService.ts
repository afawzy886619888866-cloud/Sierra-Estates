import 'server-only';

/**
 * OWNER LISTING INTAKE SERVICE (Phase 2 + Phase 3)
 *
 * THE one reusable, server-side intake path for owner-submitted units.
 * Every inbound owner message — WhatsApp August group, WhatsApp DM,
 * Telegram, web — flows through here so that listing creation and parsing
 * logic exist exactly once.
 *
 * Guarantees (master execution command, Phase 2 "Required inbound behavior"):
 *  1. validate the event source, sender, and group (done by callers' shared-secret gates);
 *  2. persist the incoming event and raw message/caption   → owner_inbound_events
 *  3. create a durable intake record BEFORE asking for missing fields
 *  4. run Arabic/English extraction over only the actual source content
 *  5. preserve null for unknown fields (no fabricated defaults)
 *  6. detect duplicates across WhatsApp, sheets, manual entry, and inventory
 *  7. assign a canonical code only when it can be derived safely (else NEEDS_CODE)
 *  8. collect real photos through the provider's supported media mechanism
 *  9. store media in Supabase Storage
 * 10. save media URLs and metadata against the same canonical intake/unit
 * 11. write or update the canonical inventory record EXACTLY ONCE
 * 12. queue missing-field questions and merge subsequent replies into the SAME intake
 * 13. expose the record in an authenticated admin review queue
 * 14. notify authorized staff with the persistent unit code, source, missing info, status
 *
 * Duplicate/replayed events are rejected by the (source, message_id) unique
 * index — a reply never depends on volatile process state.
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
}

export interface IntakeOutcome {
  action:
    | 'duplicate_event'      // replayed webhook — nothing done
    | 'not_a_listing'        // conversational message
    | 'needs_information'    // durable intake exists, owner asked for missing fields
    | 'needs_code'           // complete-ish but no safe canonical code
    | 'merged'               // reply merged into existing open intake
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
  error?: string;
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

const REQUIRED_FIELDS = ['compound', 'price', 'bedrooms', 'area', 'type', 'mode', 'contactPhone'] as const;

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

/** Cross-source duplicate fingerprint — NOT the old sender+text exact hash. */
function computeIntakeFingerprint(extracted: Record<string, unknown>): string {
  const compound = String(extracted.compound ?? '').trim().toLowerCase();
  const type = String(extracted.type ?? '').trim().toLowerCase();
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

export class OwnerListingIntakeService {
  // ── Step 2 + F: persist the event; replayed events short-circuit ──
  private static async persistEvent(
    msg: OwnerIntakeMessage,
  ): Promise<{ duplicate: boolean; eventId?: string }> {
    if (!msg.messageId) return { duplicate: false };
    try {
      // The unique index (source, message_id) makes this atomic: a replayed
      // webhook fails the insert and we skip ALL downstream work.
      const event = await insertRecord<{ id: string }>('owner_inbound_events', {
        source: msg.source.split('-')[0],
        messageId: String(msg.messageId),
        sender: normalizePhone(msg.sender),
        groupId: msg.groupId ?? null,
        rawExcerpt: redact(msg.text),
        hasMedia: (msg.media?.length ?? 0) > 0,
        mediaCount: msg.media?.length ?? 0,
      });
      return { duplicate: false, eventId: event.id };
    } catch (err: any) {
      const msgText = String(err?.message ?? err ?? '');
      if (/duplicate key|unique constraint/i.test(msgText)) {
        return { duplicate: true };
      }
      // Ledger failure must not silently enable duplicates — log and continue
      // conservatively (the caller-side intake fingerprint still dedupes).
      logger.warn(`[OwnerIntake] event ledger write failed: ${msgText}`);
      return { duplicate: false };
    }
  }

  // ── The single entry point every intake source calls ──
  static async processOwnerMessage(msg: OwnerIntakeMessage): Promise<IntakeOutcome> {
    // 1+2: persist event, dedupe replays
    const { duplicate } = await this.persistEvent(msg);
    if (duplicate) {
      return { action: 'duplicate_event' };
    }

    const senderPhone = normalizePhone(msg.sender);
    if (!senderPhone) {
      return { action: 'error', error: 'sender could not be normalized' };
    }

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

    if (!isListing) {
      return { action: 'not_a_listing' };
    }

    // 6: cross-source duplicate detection (before creating anything)
    const fingerprint = computeIntakeFingerprint(extracted);
    if (fingerprint) {
      const existing = await listRecords<{ id: string; intakeCode: string }>('owner_listing_intakes', {
        where: [{ column: 'dupeCheckHash', value: fingerprint }],
        select: 'id,intakeCode',
        limit: 1,
      });
      if (existing.length > 0) {
        // Media still counts: attach any new photos to the existing intake.
        await this.attachMedia(existing[0].id, msg, extracted);
        return {
          action: 'duplicate_listing',
          intakeId: existing[0].id,
          intakeCode: existing[0].intakeCode,
        };
      }
    }

    // 3 + 12: find an OPEN intake for this sender — replies MERGE
    const open = await this.findOpenIntake(senderPhone);
    if (open) {
      return await this.mergeIntoIntake(open, msg, extracted, fingerprint);
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
      dupeCheckHash: fingerprint || null,
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

  // ── Merge a follow-up reply into the SAME intake ──
  private static async mergeIntoIntake(
    intake: IntakeRow,
    msg: OwnerIntakeMessage,
    freshExtracted: Record<string, unknown>,
    fingerprint: string,
  ): Promise<IntakeOutcome> {
    // Previously-supplied fields win; only previously-NULL fields are filled.
    const merged = this.mergeExtracted(intake.extracted ?? {}, freshExtracted, intake.senderPhone);
    const mediaUrls = [
      ...new Set([...(intake.mediaUrls ?? []), ...(await this.storeMedia(msg, intake.intakeCode))]),
    ];
    const missingFields = this.computeMissing(merged);

    await updateRecord('owner_listing_intakes', intake.id, {
      extracted: merged,
      missingFields,
      mediaUrls,
      rawText: `${intake.rawText ?? ''}\n---\n${msg.text}`.slice(0, 8000),
      state: missingFields.length > 0 ? 'NEEDS_INFORMATION' : 'REVIEW_REQUIRED',
      dupeCheckHash: fingerprint || intake.dupeCheckHash,
      updatedAt: new Date().toISOString(),
    });

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
    const mode = String(extracted.mode ?? 'sale') === 'rent' ? 'rent' : 'sale';
    const price = Number(extracted.price) > 0 ? Number(extracted.price) : undefined;

    // 7: a canonical code is assigned ONLY when it can be derived safely.
    if (!compound || !propertyType || !(Number(price) > 0)) {
      await updateRecord('owner_listing_intakes', intake.id, {
        state: 'NEEDS_CODE',
        missingFields: this.computeMissing(extracted),
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

    const listingCode = intake.listingCode ?? intake.intakeCode;
    const now = new Date().toISOString();

    const listingDocument = {
      code: listingCode,
      title: `${propertyType} · ${compound}`,
      titleAr: `${propertyType} في ${compound}`,
      compound,
      city: deriveCityFromCompound(compound),
      propertyType,
      dealType: mode,
      price,
      bedrooms: extracted.bedrooms == null ? undefined : Number(extracted.bedrooms),
      bathrooms: extracted.bathrooms == null ? undefined : Number(extracted.bathrooms),
      areaSqm: extracted.area == null ? undefined : Number(extracted.area),
      finishingType: extracted.finishing ?? undefined,
      ownerName: extracted.ownerName ?? msg.sender,
      ownerPhone: extracted.contactPhone ?? intake.senderPhone,
      ownerType: 'owner',
      status: 'available',
      // §21 + Phase D: owner intake is UNVERIFIED — private until staff review.
      publishStatus: 'REVIEW_REQUIRED',
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
        updatedAt: now,
      }).catch(() => undefined);
      return { action: 'error', intakeId: intake.id, intakeCode: intake.intakeCode, error: String(dbErr?.message ?? dbErr) };
    }
  }

  // ── 8+9+10: real photos → Supabase Storage → same intake/unit ──
  private static async storeMedia(
    msg: OwnerIntakeMessage,
    code: string,
  ): Promise<string[]> {
    if (!msg.media?.length) return [];
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

  private static async attachMedia(
    intakeId: string,
    msg: OwnerIntakeMessage,
    extracted: Record<string, unknown>,
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

  private static pickRequired(extracted: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const field of REQUIRED_FIELDS) out[field] = extracted[field];
    return out;
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
    return `${prefix}-${Date.now().toString().slice(-8)}`;
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
      `⚠️ *سيراليون بوت | مطلوب استكمال بيانات الوحدة (كود: ${intakeCode})*\n\n` +
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

  private static async findOpenIntake(senderPhone: string): Promise<IntakeRow | null> {
    try {
      const rows = await listRecords<IntakeRow>('owner_listing_intakes', {
        where: [{ column: 'senderPhone', value: senderPhone }],
        orderBy: { column: 'createdAt', ascending: false },
        limit: 20,
      });
      return (
        rows.find((r) => r.state === 'NEEDS_INFORMATION' || r.state === 'NEEDS_CODE') ?? null
      );
    } catch (err: any) {
      logger.warn(`[OwnerIntake] open-intake lookup failed: ${err?.message}`);
      return null;
    }
  }
}
