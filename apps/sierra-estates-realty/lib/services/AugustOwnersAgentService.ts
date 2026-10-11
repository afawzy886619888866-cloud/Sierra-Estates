import 'server-only';
import { logger } from '@/lib/logger';
import { appendToExcelInventory } from '@/lib/services/ExcelInventoryService';
import { sendTelegramMessage, escapeTelegramHtml } from '@/lib/telegram';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';


/**
 * AugustOwnersAgentService
 *
 * Dedicated autonomous agent for the Sierra Estates "Owners August 2026"
 * WhatsApp intake group (ID: 120363044918239011@g.us).
 *
 * Workflow (Phase 2 restructure — one canonical intake path):
 * 1. Delegates to OwnerListingIntakeService: durable intake record FIRST,
 *    Arabic/English extraction, reply merging, cross-source dedupe, real
 *    photo storage, canonical listing created exactly once (REVIEW_REQUIRED).
 * 2. Slot-filling questions reference the persistent intake code; owner
 *    replies merge into the SAME intake (never a second unit).
 * 3. August extras only: Excel master-sheet append, management alerts and
 *    the group confirmation message. Property Finder publication is NEVER
 *    triggered here — the C6 publish gate requires staff verification.
 * 4. Two-way sync: when external bots or web forms receive units, broadcast to this group.
 */

export const AUGUST_OWNERS_GROUP_ID = '120363044918239011@g.us';

export interface ProcessGroupMessageParams {
  rawMessage: string;
  sender: string;
  group: string;
  groupId?: string;
  /** Provider message id — the idempotency key for replayed webhooks. */
  messageId?: string;
  /** base64-encoded image data forwarded by owners-harvester */
  media?: { data: string; mimeType: string; photoCode?: string };
}

export interface AugustAgentResult {
  handled: boolean;
  isListing: boolean;
  action: 'missing_info_requested' | 'unit_recorded_pending_verification' | 'not_a_listing' | 'error';
  listingCode?: string;
  unitId?: string;
  pfReference?: string;
  missingFields?: string[];
  replyMessage?: string;
}

/**
 * §21: city is derived ONLY from an explicit compound→city vocabulary and
 * returned as undefined when the compound is not recognised — never the old
 * blanket 'New Cairo' (which mislabelled Sheikh Zayed / Sokhna / North Coast
 * posts). The units row then simply carries no city until verified.
 * Shared with OwnerListingIntakeService (one canonical vocabulary).
 */
export function deriveCityFromCompound(compound: string): string | undefined {
  const c = (compound || '').toLowerCase();
  if (!c) return undefined;
  if (/sokhna|سوخنة|azha|أزها/.test(c)) return 'Ain Sokhna';
  if (/hacienda|marassi|north coast|الساحل|marina/.test(c)) return 'North Coast';
  if (/sheikh zayed|زايد|6th of october|أكتوبر|october/.test(c)) return 'Giza';
  if (/new capital|العاصمة|newcapital/.test(c)) return 'New Administrative Capital';
  if (/alex|إسكندرية|اسكندرية/.test(c)) return 'Alexandria';
  if (/rehab|الرحاب|madinaty|مدينتي|new cairo|التجمع|5th settlement|5th|ميفيدا|hyde park|هايد|mivida/.test(c)) {
    return 'New Cairo';
  }
  return undefined;
}

export class AugustOwnersAgentService {
  /**
   * Check if a message originated from the August Owners group
   */
  static isAugustOwnersGroup(groupNameOrId: string): boolean {
    if (!groupNameOrId) return false;
    const lower = groupNameOrId.toLowerCase();
    return (
      groupNameOrId === AUGUST_OWNERS_GROUP_ID ||
      lower.includes('120363044918239011') ||
      lower.includes('owners august') ||
      lower.includes('august 2026') ||
      lower.includes('أغسطس') ||
      lower.includes('اغسطس')
    );
  }

  /**
   * Process a message incoming from the August Owners group.
   *
   * PHASE 2 RESTRUCTURE: this method is now a thin August-specific wrapper.
   * ALL parsing, durable intake, dedupe, media storage and canonical
   * listing creation live in OwnerListingIntakeService (the one reusable
   * server-side intake path). This wrapper only adds the August group
   * extras: Excel master-sheet append, management alerts and the group
   * confirmation message.
   */
  static async processGroupMessage(params: ProcessGroupMessageParams): Promise<AugustAgentResult> {
    const { rawMessage, sender, group, groupId, media, messageId } = params;
    const targetGroupId = groupId || (this.isAugustOwnersGroup(group) ? AUGUST_OWNERS_GROUP_ID : group);

    logger.info(
      `[AugustOwnersAgent] Delegating intake for sender in group "${group}" (durable intake lifecycle)`
    );

    const { OwnerListingIntakeService } = await import('@/lib/services/OwnerListingIntakeService');
    const outcome = await OwnerListingIntakeService.processOwnerMessage({
      source: 'whatsapp-august-owners',
      sender,
      groupId: targetGroupId,
      messageId,
      text: rawMessage,
      media: media ? [{ data: media.data, mimeType: media.mimeType }] : undefined,
    });

    switch (outcome.action) {
      case 'duplicate_event':
        // Replayed webhook — nothing done, nothing announced.
        return { handled: true, isListing: true, action: 'not_a_listing' };

      case 'not_a_listing':
        return { handled: true, isListing: false, action: 'not_a_listing' };

      case 'duplicate_listing':
        return {
          handled: true,
          isListing: true,
          action: 'not_a_listing',
          listingCode: outcome.intakeCode,
          unitId: outcome.unitId,
        };

      case 'needs_information':
      case 'needs_code': {
        // The durable intake record already exists — the reply prompt
        // references its persistent code and replies will merge into it.
        return {
          handled: true,
          isListing: true,
          action: 'missing_info_requested',
          listingCode: outcome.intakeCode,
          missingFields: outcome.missingFields ?? [],
          replyMessage: outcome.replyMessage,
        };
      }

      case 'merged': {
        // Follow-up merged into the same intake. If it completed the record,
        // a canonical unit now exists — run the August extras.
        if (outcome.unitId && outcome.extracted) {
          await this.augustExtras(outcome, targetGroupId, sender);
        }
        return {
          handled: true,
          isListing: true,
          action: outcome.unitId
            ? 'unit_recorded_pending_verification'
            : 'missing_info_requested',
          listingCode: outcome.intakeCode,
          unitId: outcome.unitId,
          missingFields: outcome.missingFields ?? [],
          replyMessage: outcome.replyMessage,
        };
      }

      case 'unit_recorded': {
        await this.augustExtras(outcome, targetGroupId, sender);
        return {
          handled: true,
          isListing: true,
          action: 'unit_recorded_pending_verification',
          listingCode: outcome.intakeCode,
          unitId: outcome.unitId,
          replyMessage: this.buildGroupConfirmation(outcome, targetGroupId),
        };
      }

      case 'error':
      default:
        logger.warn(`[AugustOwnersAgent] Intake error: ${outcome.error ?? 'unknown'}`);
        return { handled: true, isListing: true, action: 'error' };
    }
  }

  /** August-group extras after a canonical unit is recorded (exactly once). */
  private static async augustExtras(
    outcome: {
      intakeCode?: string;
      unitId?: string;
      extracted?: Record<string, unknown>;
      mediaUrls?: string[];
    },
    targetGroupId: string,
    sender: string,
  ): Promise<void> {
    const extracted = outcome.extracted ?? {};
    const compound = String(extracted.compound ?? '');
    const propertyType = String(extracted.type ?? '');
    const mode = String(extracted.mode ?? 'sale') === 'rent' ? 'rent' : 'sale';
    const price = Number(extracted.price) > 0 ? Number(extracted.price) : 0;
    const bedrooms = extracted.bedrooms == null ? undefined : Number(extracted.bedrooms);
    const bathrooms = extracted.bathrooms == null ? undefined : Number(extracted.bathrooms);
    const area = extracted.area == null ? undefined : Number(extracted.area);
    const contactPhone = String(extracted.contactPhone ?? '');
    const specStr = `${bedrooms ?? '?'} Beds · ${bathrooms ?? '?'} Baths · ${area ?? '?'} m²`;
    const listingCode = outcome.intakeCode ?? '';

    // Step 2: Append to Master Excel Inventory Sheet and mark Available
    try {
      await appendToExcelInventory({
        recordId: listingCode,
        code: listingCode,
        compound,
        propertyType,
        operation: mode === 'rent' ? 'Rent' : 'Sale',
        price,
        areaSqm: area,
        bedrooms,
        bathrooms,
        furnishing: extracted.finishing ? String(extracted.finishing) : undefined,
        contactName: extracted.ownerName ? String(extracted.ownerName) : sender,
        contactPhone,
        inventoryStatus: 'Available',
        sourceType: 'owner',
        description: '',
      });
      logger.info(`[AugustOwnersAgent] Appended unit ${listingCode} to Excel Master Inventory (Available)`);
    } catch (excelErr: any) {
      logger.warn(`[AugustOwnersAgent] Excel append error (non-fatal): ${excelErr?.message}`);
    }

    // Immediate Telegram Notification (honest: unverified, PF NOT created)
    try {
      const telegramAlert = `
🚀 <b>New August Owner Unit Recorded!</b>
<b>Compound:</b> ${escapeTelegramHtml(compound)}
<b>Type:</b> ${escapeTelegramHtml(propertyType)} (${mode.toUpperCase()})
<b>Price:</b> EGP ${price.toLocaleString('en-US')}
<b>Specs:</b> ${specStr}
<b>Contact:</b> ${escapeTelegramHtml(contactPhone)}
<b>Code:</b> <code>${listingCode}</code>
<b>Status:</b> Unverified — REVIEW_REQUIRED (private until verified)
<b>Property Finder:</b> Not created — publish gate requires staff verification first
<b>Source:</b> WhatsApp Group (Owners August 2026)
      `.trim();
      await sendTelegramMessage(telegramAlert);
    } catch (tgErr: any) {
      logger.warn(`[AugustOwnersAgent] Telegram notification skipped: ${tgErr?.message}`);
    }

    // Direct WhatsApp alert to manager / admin phone
    const notifyAdminNumber = process.env.LEAD_NOTIFY_WHATSAPP_NUMBER || process.env.ADMIN_PHONE;
    if (notifyAdminNumber) {
      try {
        await enqueueWhatsAppJob({
          purpose: 'general-outreach',
          toPhone: notifyAdminNumber,
          body: `🚀 [Sierra Admin Alert] New Unit Recorded from August Owners Group!\n📍 ${compound}\n💰 EGP ${price.toLocaleString('en-US')}\n📐 ${specStr}\n🔖 Code: ${listingCode}\n⏳ Unverified (REVIEW_REQUIRED) — private until verified. PF publish gate: not eligible yet.`,
        });
      } catch (waAdminErr: any) {
        logger.warn(`[AugustOwnersAgent] Admin WhatsApp alert skipped: ${waAdminErr?.message}`);
      }
    }

    // Group confirmation — honest pending status, no fabricated PF reference.
    const confirmationMsg = this.buildGroupConfirmation(outcome, targetGroupId);
    try {
      await enqueueWhatsAppJob({
        purpose: 'general-outreach',
        toPhone: targetGroupId,
        body: confirmationMsg,
      });
    } catch (confirmErr: any) {
      logger.warn(`[AugustOwnersAgent] Group confirmation enqueue skipped: ${confirmErr?.message}`);
    }
  }

  /** Honest confirmation copy — recorded + pending verification, never "live now". */
  private static buildGroupConfirmation(
    outcome: { intakeCode?: string; extracted?: Record<string, unknown> },
    _targetGroupId: string,
  ): string {
    const extracted = outcome.extracted ?? {};
    const compound = String(extracted.compound ?? '');
    const propertyType = String(extracted.type ?? '');
    const mode = String(extracted.mode ?? 'sale') === 'rent' ? 'rent' : 'sale';
    const price = Number(extracted.price) > 0 ? Number(extracted.price) : 0;
    const bedrooms = extracted.bedrooms == null ? '?' : String(extracted.bedrooms);
    const bathrooms = extracted.bathrooms == null ? '?' : String(extracted.bathrooms);
    const area = extracted.area == null ? '?' : String(extracted.area);
    const listingCode = outcome.intakeCode ?? '';
    const specStrAr = `${bedrooms} غرف · ${bathrooms} حمام · ${area} م²`;

    return (
      `✅ *تم تسجيل الوحدة بنجاح!* (Sierra Estates Agent)\n\n` +
      `📍 *الكومباوند:* ${compound}\n` +
      `🏠 *النوع:* ${propertyType} (${mode === 'rent' ? 'إيجار' : 'بيع'})\n` +
      `💰 *السعر:* ${price.toLocaleString('en-US')} ج.م\n` +
      `📐 *المواصفات:* ${specStrAr}\n` +
      `🔖 *كود الوحدة:* ${listingCode}\n` +
      `📊 *شيت المخزون:* تم القيد بالحالة (Available)\n` +
      `🏢 *بروبيرتي فايندر:* سيتم إنشاء الإعلان بعد التحقق والمراجعة من فريق سييرا\n` +
      `⏳ *الحالة:* الوحدة تحت المراجعة والتحقق — سيتم عرضها للعملاء بعد التأكيد.\n` +
      `🌐 https://sierra-estates.net/properties`
    );
  }

  /**
   * Broadcast new units received by other bots (scrapers, /add-listing form)
   * into the August Owners WhatsApp group.
   */
  static async broadcastNewUnitToGroup(unitData: {
    code: string;
    compound: string;
    propertyType: string;
    price: number;
    beds?: number;
    area?: number;
    mode?: string;
  }): Promise<void> {
    const broadcastMsg = `📢 *[Sierra Estates Fleet] وحدة جديدة مضافة للنظام*\n\n` +
      `📍 *الكومباوند:* ${unitData.compound}\n` +
      `🏠 *النوع:* ${unitData.propertyType} (${(unitData.mode || '').toString().toUpperCase() || '—'})\n` +
      `💰 *السعر:* ${Number(unitData.price).toLocaleString('en-US')} ج.م\n` +
      `📐 *المواصفات:* ${unitData.beds ?? '?'} غرف · ${unitData.area ?? '?'} م²\n` +
      `🔖 *الكود:* ${unitData.code}\n` +
      `⏳ الوحدة مسجلة بالنظام وتخضع للمراجعة والتحقق قبل عرضها للعملاء.\n` +
      `🌐 https://sierra-estates.net/properties`;

    try {
      await enqueueWhatsAppJob({
        purpose: 'general-outreach',
        toPhone: AUGUST_OWNERS_GROUP_ID,
        body: broadcastMsg,
      });
      logger.info(`[AugustOwnersAgent] Broadcasted new unit ${unitData.code} to August Owners Group`);
    } catch (err: any) {
      logger.warn(`[AugustOwnersAgent] Broadcast to August Owners Group skipped: ${err?.message}`);
    }
  }

}
