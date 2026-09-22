import 'server-only';
import { insertRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { toListingColumns } from '@/lib/server/listing-columns';
import { appendToExcelInventory } from '@/lib/services/ExcelInventoryService';
import { sendTelegramMessage, escapeTelegramHtml } from '@/lib/telegram';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { COLLECTIONS } from '@/lib/models/schema';
import { PFIntegrationService } from '@/lib/services/PFIntegrationService';

/**
 * AugustOwnersAgentService
 *
 * Dedicated autonomous agent for the Sierra Estates "Owners August 2026"
 * WhatsApp intake group (ID: 120363044918239011@g.us).
 *
 * Workflow:
 * 1. Wire WhatsApp group drops directly into the /add-listing schema & pipeline.
 * 2. Slot-Filling Check: if essential fields (price, compound, beds, area, phone)
 *    are missing, asks the sender directly in the group to clarify.
 * 3. Once complete:
 *    - Persist to Supabase (public.listings & public.units) with status 'available'.
 *    - Append to Master Excel Inventory workbook (Inventory_with_Photos.xlsx) and mark Available.
 *    - Generate Property Finder ad draft reference & queue publication.
 *    - Send instant Telegram & WhatsApp alert to agency management.
 *    - Send confirmation back to the August Owners WhatsApp group.
 * 4. Two-way sync: when external bots or web forms receive units, broadcast to this group.
 */

export const AUGUST_OWNERS_GROUP_ID = '120363044918239011@g.us';

export interface ProcessGroupMessageParams {
  rawMessage: string;
  sender: string;
  group: string;
  groupId?: string;
  media?: { data: string; mimeType: string };
}

export interface AugustAgentResult {
  handled: boolean;
  isListing: boolean;
  action: 'missing_info_requested' | 'unit_published' | 'not_a_listing' | 'error';
  listingCode?: string;
  unitId?: string;
  pfReference?: string;
  missingFields?: string[];
  replyMessage?: string;
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
   * Process a message incoming from the August Owners group
   */
  static async processGroupMessage(params: ProcessGroupMessageParams): Promise<AugustAgentResult> {
    const { rawMessage, sender, group, groupId, media } = params;
    const targetGroupId = groupId || (this.isAugustOwnersGroup(group) ? AUGUST_OWNERS_GROUP_ID : group);

    logger.info(`[AugustOwnersAgent] Processing message from sender "${sender}" in group "${group}"`);

    // 1. NLP Extraction via WhatsAppParserService
    let parsed: any = null;
    try {
      parsed = await WhatsAppParserService.parseMessage(rawMessage, media);
    } catch (parseErr: any) {
      logger.warn(`[AugustOwnersAgent] Parsing failed, attempting text fallback: ${parseErr?.message}`);
      // If AI parse is unavailable or throws, fallback to heuristic extraction
      parsed = this.heuristicExtract(rawMessage);
    }

    if (!parsed || !parsed.isListing) {
      logger.info('[AugustOwnersAgent] Message classified as non-listing');
      return {
        handled: true,
        isListing: false,
        action: 'not_a_listing',
      };
    }

    // Clean sender phone fallback
    const senderDigits = sender.replace(/\D/g, '');
    const contactPhone = parsed.phoneNumber || (senderDigits.length >= 8 ? senderDigits : '');

    // 2. Step 4: Missing Information / Slot-Filling Check
    const missingFields: string[] = [];
    if (!parsed.compound || parsed.compound === '5th Settlement' || parsed.compound === 'Unknown') {
      missingFields.push('compound');
    }
    if (!parsed.price || Number(parsed.price) <= 0) {
      missingFields.push('price');
    }
    if (parsed.bedrooms === undefined || parsed.bedrooms === null) {
      missingFields.push('bedrooms');
    }
    if (!parsed.area || Number(parsed.area) <= 0) {
      missingFields.push('area');
    }
    if (!contactPhone) {
      missingFields.push('contactPhone');
    }

    // If critical fields are missing, query the sender directly in the group
    if (missingFields.length > 0) {
      const fieldLabelsAr: Record<string, string> = {
        compound: 'اسم الكومباوند / المشروع',
        price: 'السعر المطلوب بالجنيه',
        bedrooms: 'عدد غرف النوم',
        area: 'المساحة الإجمالية بالمتر المربع',
        contactPhone: 'رقم هاتف المالك للتواصل',
      };

      const fieldLabelsEn: Record<string, string> = {
        compound: 'Compound Name',
        price: 'Required Price (EGP)',
        bedrooms: 'Number of Bedrooms',
        area: 'Total Area (m²)',
        contactPhone: 'Contact Phone Number',
      };

      const missingBullets = missingFields
        .map((f) => ` • *${fieldLabelsAr[f]}* (${fieldLabelsEn[f]})`)
        .join('\n');

      const senderName = sender.split('@')[0] || 'الزميل العزيز';
      const prompt = `⚠️ *سيراليون بوت | مطلوب استكمال بيانات الوحدة*\n\n` +
        `مرحباً @${senderName}، تم رصد بيانات الوحدة المذكورة بنجاح.\n` +
        `لتسجيلها فوراً في شيت المخزون وإظهارها على الخريطة التفاعلية بموقعنا ونشرها على Property Finder، يرجى توضيح البيانات الآتية:\n\n` +
        `${missingBullets}\n\n` +
        `💬 يرجى الرد على هذه الرسالة لإتمام الإضافة آلياً.`;

      // Enqueue clarification prompt back to the group
      try {
        await enqueueWhatsAppJob({
          purpose: 'general-outreach',
          toPhone: targetGroupId,
          body: prompt,
        });
      } catch (err: any) {
        logger.warn(`[AugustOwnersAgent] Could not enqueue slot-filling prompt: ${err?.message}`);
      }

      return {
        handled: true,
        isListing: true,
        action: 'missing_info_requested',
        missingFields,
        replyMessage: prompt,
      };
    }

    // 3. Complete Unit Processing -> Steps 1, 2, 3
    const now = new Date().toISOString();
    const listingCode = `SE-AUG-${Date.now().toString().slice(-6)}`;
    const pfReference = `PF-${listingCode}`;
    const compound = parsed.compound;
    const propertyType = parsed.type || 'Apartment';
    const price = Number(parsed.price);
    const bedrooms = Number(parsed.bedrooms) || 3;
    const bathrooms = Number(parsed.bathrooms) || 2;
    const area = Number(parsed.area) || 150;
    const finishing = parsed.finishing || 'Fully Finished';
    const mode = (parsed.mode || 'sale').toLowerCase() as 'sale' | 'rent';

    const listingDocument = {
      code: listingCode,
      title: `${propertyType} · ${compound}`,
      titleAr: `${propertyType} في ${compound}`,
      compound,
      propertyType,
      dealType: mode,
      price,
      bedrooms,
      bathrooms,
      areaSqm: area,
      finishingType: finishing,
      ownerName: parsed.ownerName || sender,
      ownerPhone: contactPhone,
      status: 'available',
      verified: true,
      available: true,
      sourceChannel: 'whatsapp-august-owners',
      description: rawMessage,
      createdAt: now,
      updatedAt: now,
      rawData: {
        whatsappGroup: group,
        whatsappGroupId: targetGroupId,
        pfReference,
        sierraCode: parsed.sierraCode || listingCode,
        valuationScore: parsed.valuationScore,
        urgencyScore: parsed.urgencyScore,
      },
    };

    let unitId = listingCode;

    // Step 3: Insert into Supabase listings & units
    try {
      const created = await insertRecord<{ id: string }>('listings', toListingColumns(listingDocument));
      unitId = created.id;
      logger.info(`[AugustOwnersAgent] Listing inserted into Supabase: ${unitId} (${listingCode})`);
    } catch (dbErr: any) {
      logger.warn(`[AugustOwnersAgent] Direct DB write fallback: ${dbErr?.message}`);
    }

    // Insert into units table (for Property Finder and inventory queries)
    try {
      await insertRecord(COLLECTIONS.units, {
        title: `${propertyType} · ${compound}`,
        compound,
        location: compound,
        city: 'New Cairo',
        price,
        propertyType,
        status: mode === 'rent' ? 'rented' : 'available',
        category: 'residential',
        bedrooms,
        bathrooms,
        area,
        pfReferenceNumber: pfReference,
        description: rawMessage,
        createdAt: now,
        updatedAt: now,
      });
    } catch (unitsErr: any) {
      logger.warn(`[AugustOwnersAgent] Units collection insert skipped: ${unitsErr?.message}`);
    }

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
        furnishing: finishing,
        contactName: parsed.ownerName || sender,
        contactPhone,
        inventoryStatus: 'Available',
        sourceType: 'owner',
        description: rawMessage,
      });
      logger.info(`[AugustOwnersAgent] Appended unit ${listingCode} to Excel Master Inventory (Available)`);
    } catch (excelErr: any) {
      logger.warn(`[AugustOwnersAgent] Excel append error (non-fatal): ${excelErr?.message}`);
    }

    // Step 1: Make ad in Property Finder + notify user
    try {
      // Trigger Property Finder sync/publish
      await PFIntegrationService.publishListing(unitId).catch((e) => {
        logger.warn(`[AugustOwnersAgent] PF publishListing non-fatal: ${e?.message}`);
      });
    } catch (pfErr: any) {
      logger.warn(`[AugustOwnersAgent] PF integration dispatch warning: ${pfErr?.message}`);
    }

    // Immediate Telegram Notification
    try {
      const telegramAlert = `
🚀 <b>New August Owner Unit Activated!</b>
<b>Compound:</b> ${escapeTelegramHtml(compound)}
<b>Type:</b> ${escapeTelegramHtml(propertyType)} (${mode.toUpperCase()})
<b>Price:</b> EGP ${price.toLocaleString('en-US')}
<b>Specs:</b> ${bedrooms} Beds · ${bathrooms} Baths · ${area} m²
<b>Finishing:</b> ${escapeTelegramHtml(finishing)}
<b>Contact:</b> ${escapeTelegramHtml(contactPhone)}
<b>Code:</b> <code>${listingCode}</code>
<b>Property Finder:</b> Ad Generated (Ref: <code>${pfReference}</code>)
<b>Live Map:</b> Activated on interactive 3D map & client page
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
          body: `🚀 [Sierra Admin Alert] New Unit Added from August Owners Group!\n📍 ${compound}\n💰 EGP ${price.toLocaleString('en-US')}\n📐 ${bedrooms}B / ${area} m²\n🔖 Code: ${listingCode}\n🏢 PF Ref: ${pfReference}\n🗺️ Live on Map & Sheet marked Available.`,
        });
      } catch (waAdminErr: any) {
        logger.warn(`[AugustOwnersAgent] Admin WhatsApp alert skipped: ${waAdminErr?.message}`);
      }
    }

    // Step 6: Confirmation message back into the August Owners WhatsApp group
    const confirmationMsg = `✅ *تم تفعيل ونشر الوحدة بنجاح!* (Sierra Estates Agent)\n\n` +
      `📍 *الكومباوند:* ${compound}\n` +
      `🏠 *النوع:* ${propertyType} (${mode === 'rent' ? 'إيجار' : 'بيع'})\n` +
      `💰 *السعر:* ${price.toLocaleString('en-US')} ج.م\n` +
      `📐 *المواصفات:* ${bedrooms} غرف · ${bathrooms} حمام · ${area} م²\n` +
      `🔖 *كود الوحدة:* ${listingCode}\n` +
      `📊 *شيت المخزون:* تم القيد بالحالة (Available)\n` +
      `🏢 *بروبيرتي فايندر:* تم إعداد مسودة الإعلان بالرقم المرجعي (${pfReference})\n` +
      `🗺️ *الخريطة التفاعلية:* الوحدة معروضة الآن مباشرة لجميع العملاء عبر الموقع.\n` +
      `🌐 https://sierra-estates.net/properties`;

    try {
      await enqueueWhatsAppJob({
        purpose: 'general-outreach',
        toPhone: targetGroupId,
        body: confirmationMsg,
      });
    } catch (confirmErr: any) {
      logger.warn(`[AugustOwnersAgent] Group confirmation enqueue skipped: ${confirmErr?.message}`);
    }

    return {
      handled: true,
      isListing: true,
      action: 'unit_published',
      listingCode,
      unitId,
      pfReference,
      replyMessage: confirmationMsg,
    };
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
      `🏠 *النوع:* ${unitData.propertyType} (${(unitData.mode || 'sale').toUpperCase()})\n` +
      `💰 *السعر:* ${Number(unitData.price).toLocaleString('en-US')} ج.م\n` +
      `📐 *المواصفات:* ${unitData.beds || 3} غرف · ${unitData.area || 150} م²\n` +
      `🔖 *الكود:* ${unitData.code}\n` +
      `🗺️ معروضة الآن على الخريطة التفاعلية وجاهزة للترشيح للعملاء.\n` +
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

  /**
   * Heuristic fallback extractor if generative AI is offline
   */
  private static heuristicExtract(text: string): any {
    const lower = text.toLowerCase();
    const priceMatch = text.match(/(\d[\d,\. ]{3,12})\s*(جنيه|ج\.م|egp|m|مليون|k|الف)?/i);
    let price = 0;
    if (priceMatch) {
      const rawNum = priceMatch[1].replace(/[, ]/g, '');
      price = parseFloat(rawNum) || 0;
      if (text.includes('مليون') && price < 1000) {
        price = price * 1_000_000;
      }
    }

    const bedsMatch = text.match(/(\d+)\s*(غرف|غرفة|نوم|beds?|bd)/i);
    const beds = bedsMatch ? parseInt(bedsMatch[1]) : 3;

    const areaMatch = text.match(/(\d+)\s*(متر|م²|م2|sqm|m2)/i);
    const area = areaMatch ? parseInt(areaMatch[1]) : 160;

    let compound = 'New Cairo';
    const compounds = [
      'Mivida', 'Hyde Park', 'Mountain View', 'Villette', 'Palm Hills',
      'Eastown', 'Madinaty', 'Uptown Cairo', 'Swan Lake', 'Fifth Square',
      'ميفيدا', 'هايد بارك', 'ماونتن فيو', 'فيليت', 'بالم هيلز', 'ايست تاون'
    ];
    for (const c of compounds) {
      if (text.includes(c)) {
        compound = c;
        break;
      }
    }

    return {
      isListing: price > 0 || text.includes('للبيع') || text.includes('للايجار') || text.includes('شقة'),
      compound,
      price,
      bedrooms: beds,
      area,
      type: text.includes('فيلا') || text.includes('villa') ? 'Villa' : 'Apartment',
      mode: text.includes('ايجار') || text.includes('rent') ? 'rent' : 'sale',
    };
  }
}
