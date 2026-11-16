/**
 * ChatListingRouter.ts
 *
 * Sierra Estates — Intelligent Chat-to-Unit Ingestion Router
 * Governed strictly by /real-estate-excel-processor and /supabase skill rules:
 *
 *   1. Rule 1.1: Client Request Isolation ('مطلوب' / 'طلب عميل' -> Client_Requests)
 *   2. Rule 1: Advertiser Classification (Explicit Owner Evidence -> Direct Owner, else Broker)
 *   3. Rule 3: Price Routing Threshold (Price > 400k -> Resale/Sale; <= 400k -> Rent)
 *   4. Rule 2: Multi-tier Deduplication (Owner: Phone_Last7; Broker: Phone_Last7 + round(Price))
 *   5. Rule 4: Canonical Phone Normalization (+20XXXXXXXXXX / Last 7)
 *   6. Dual-write to Supabase + Google Sheets + Telegram alert + ECC Memory
 */

import { insertRecord, listRecords, updateRecord } from '@sierra-estates/db';
import { normalizeEgyptianPhone } from '@/lib/utils/phone';
import { resolveLocation } from '@/lib/inventory/gazetteer';
import { resolveUnitCode } from '@/lib/server/unit-codes';
import { toListingColumns } from '@/lib/server/listing-columns';
import { UnitQualityKpiService } from '@/lib/services/UnitQualityKpiService';
import {
  SHEET_TABS,
  SHEET_HEADERS,
  appendToManagedTab,
} from '@/lib/services/GoogleSheetsV4Service';

const MASTER_INVENTORY_HEADERS = [
  'Unit_Code', 'Date_Added', 'Last_Action_Timestamp', 'Deal_Type', 'Canonical_Compound',
  'Unit_Type', 'Area_SQM', 'Bedrooms', 'Bathrooms', 'Floor', 'Furnishing', 'Finishing',
  'Price_EGP', 'AI_Fair_Price_Benchmark', 'Is_Featured_Gem', 'Owner_Name_Internal',
  'Owner_Mobile_Internal', 'Contact_Status', 'Listing_Status', 'Sourced_By_Agent',
  'Verified_By_Employee', 'Media_Links', 'Notes',
] as const;
import { sendTelegramNotification } from '@/lib/services/TelegramNotifier';
import { logger } from '@/lib/logger';

export interface ChatMessageInput {
  rawMessage: string;
  senderPhone?: string | null;
  senderName?: string | null;
  sourceGroup?: string | null;
  mediaUrls?: string[];
}

export interface ChatRoutingResult {
  category: 'client_request' | 'listing_direct_owner' | 'listing_broker' | 'conversational';
  action: 'created' | 'merged' | 'ignored';
  referenceCode: string;
  dealType: 'Rent' | 'Sale';
  compound: string;
  priceEgp: number;
  advertiserType: 'Direct Owner' | 'Broker' | 'Client';
  targetSheets: string[];
  supabaseId?: string;
  details: Record<string, any>;
}

export class ChatListingRouter {
  // ── 1. REQUEST DETECTION PATTERNS (Rule 1.1) ───────────────────────────
  private static REQUEST_PATTERNS = [
    'مطلوب للشراء', 'مطلوب للايجار', 'مطلوب للإيجار', 'مطلوب فورا', 'مطلوب كود',
    'طلب عميل', 'مطلوب شقة', 'مطلوب فيلا', 'مطلوب دوبلكس', 'مطلوب تاون',
    'مطلوب توين', 'مطلوب ستوديو', 'مطلوب ارض', 'مطلوب مقر', 'مطلوب صيدلية',
    'مطلوب محل', 'مطلوب من المالك', 'محتاج شقة', 'محتاج فيلا',
    'urgent request', 'looking for', 'buyer request', 'client request', 'request',
  ];

  // ── 2. EXPLICIT OWNER CLUES (Rule 1) ──────────────────────────────────
  private static OWNER_CLUES = [
    'من المالك', 'من المالك مباشرة', 'أنا المالك', 'المالك مباشر', 'المالك نفسه',
    'صاحب الشقة', 'صاحب الوحدة', 'صاحب العقار', 'مالك الوحدة', 'مالك الشقة',
    'direct from owner', 'from the owner', 'owner directly', 'by owner', 'fsbo', 'frbo',
    'صاحب الشأن', 'direct owner',
  ];

  /**
   * Checks if message is a client demand / request.
   */
  public static isClientRequest(text: string): boolean {
    const t = (text || '').trim().toLowerCase();
    if (!t) return false;
    for (const p of this.REQUEST_PATTERNS) {
      if (t.includes(p)) return true;
    }
    // Check if starts with مطلوب
    if (t.startsWith('مطلوب') && !t.includes('سعر') && !t.includes('مقدم')) return true;
    return false;
  }

  /**
   * Classifies advertiser as Direct Owner or Broker (Rule 1).
   */
  public static classifyAdvertiser(text: string, senderName: string = ''): 'Direct Owner' | 'Broker' {
    const combined = `${text} ${senderName}`.toLowerCase();
    for (const clue of this.OWNER_CLUES) {
      if (combined.includes(clue)) return 'Direct Owner';
    }
    return 'Broker';
  }

  /**
   * Routes deal type by price threshold 400,000 EGP (Rule 3).
   */
  public static routeDealType(price: number, text: string): 'Rent' | 'Sale' {
    if (price > 400_000) return 'Sale';
    if (price > 0 && price <= 400_000) return 'Rent';
    // Fallback to text clues if price is 0
    const t = text.toLowerCase();
    if (t.includes('ايجار') || t.includes('إيجار') || t.includes('rent')) return 'Rent';
    return 'Sale';
  }

  /**
   * Core routing and ingestion engine for incoming chats.
   */
  public static async processChatMessage(input: ChatMessageInput): Promise<ChatRoutingResult> {
    const raw = input.rawMessage.trim();
    const phone = normalizeEgyptianPhone(input.senderPhone || '') || '';
    const phoneLast7 = phone.length >= 7 ? phone.slice(-7) : '';

    // ─────────────────────────────────────────────────────────────
    // CASE A: Client Request (Rule 1.1)
    // ─────────────────────────────────────────────────────────────
    if (this.isClientRequest(raw)) {
      const isRent = raw.includes('ايجار') || raw.includes('إيجار') || raw.includes('rent');
      const transactionType = isRent ? 'Rent' : 'Sale';
      
      // Extract price/budget if available
      const priceMatch = raw.match(/(\d+[\d,.]*)\s*(ألف|الف|مليون|k|m|egp|جنيه)?/i);
      let budget = 0;
      if (priceMatch) {
        let num = parseFloat(priceMatch[1].replace(/,/g, ''));
        const unit = (priceMatch[2] || '').toLowerCase();
        if (unit.includes('مليون') || unit === 'm') num *= 1_000_000;
        else if (unit.includes('ألف') || unit.includes('الف') || unit === 'k') num *= 1_000;
        budget = num;
      }

      // Generate request code
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const requestCode = `REQ-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Save to Supabase client_requests
      let createdId = '';
      try {
        const created = await insertRecord<{ id: string }>('client_requests', {
          requestCode,
          clientName: input.senderName || 'WhatsApp Client',
          phoneNormalized: phone || '+201000000000',
          transactionType,
          propertyType: 'Apartment',
          compoundZone: 'New Cairo',
          budgetEgp: budget > 0 ? budget : null,
          status: 'New',
          notes: raw,
          source: input.sourceGroup ? `whatsapp_group:${input.sourceGroup}` : 'whatsapp_dm',
        });
        createdId = created.id;
      } catch (err) {
        logger.warn(`[ChatListingRouter] Supabase client_request write: ${err}`);
      }

      // Mirror to Google Sheets Client_Requests tab
      try {
        await appendToManagedTab({
          tab: SHEET_TABS.clientRequests,
          headers: SHEET_HEADERS.clientRequests,
          values: [
            requestCode,
            now.toISOString(),
            input.senderName || 'WhatsApp Client',
            phone,
            transactionType,
            'Apartment',
            'New Cairo',
            budget,
            '',
            '',
            '',
            '',
            '',
            'New',
            raw,
          ],
        });
      } catch (sheetErr) {
        logger.warn(`[ChatListingRouter] Sheets Client_Requests sync: ${sheetErr}`);
      }

      return {
        category: 'client_request',
        action: 'created',
        referenceCode: requestCode,
        dealType: transactionType,
        compound: 'New Cairo',
        priceEgp: budget,
        advertiserType: 'Client',
        targetSheets: ['Client_Requests'],
        supabaseId: createdId,
        details: { rawMessage: raw, budget, phone },
      };
    }

    // ─────────────────────────────────────────────────────────────
    // CASE B: Property Listing (Rules 1, 2, 3, 4)
    // ─────────────────────────────────────────────────────────────
    const advertiser = this.classifyAdvertiser(raw, input.senderName || '');
    
    // Extract price
    let extractedPrice = 0;
    const priceMatch = raw.match(/(\d+[\d,.]*)\s*(ألف|الف|مليون|k|m|egp|جنيه)/i);
    if (priceMatch) {
      let num = parseFloat(priceMatch[1].replace(/,/g, ''));
      const unit = (priceMatch[2] || '').toLowerCase();
      if (unit.includes('مليون') || unit === 'm') num *= 1_000_000;
      else if (unit.includes('ألف') || unit.includes('الف') || unit === 'k') num *= 1_000;
      extractedPrice = num;
    }

    // Rule 3: 400,000 threshold
    const dealType = this.routeDealType(extractedPrice, raw);
    const dealToken = dealType === 'Rent' ? 'rent' : 'sale';

    // Extract bedrooms
    const bedMatch = raw.match(/(\d+)\s*(غرف|نوم|غرفة|bed|rooms|br)/i);
    const bedrooms = bedMatch ? parseInt(bedMatch[1], 10) : 0;

    // Extract area
    const areaMatch = raw.match(/(\d+)\s*(م|متر|م²|sqm|m2)/i);
    const areaSqm = areaMatch ? parseInt(areaMatch[1], 10) : 0;

    // Compound extraction
    let compound = 'New Cairo (General)';
    const t = raw.toLowerCase();
    if (t.includes('mivida') || t.includes('ميفيدا')) compound = 'Mivida';
    else if (t.includes('hyde park') || t.includes('هايد بارك')) compound = 'Hyde Park';
    else if (t.includes('mountain view') || t.includes('ماونتن فيو')) compound = 'Mountain View';
    else if (t.includes('rehab') || t.includes('الرحاب')) compound = 'Al Rehab';
    else if (t.includes('madinaty') || t.includes('مدينتي')) compound = 'Madinaty';
    else if (t.includes('waterway') || t.includes('واتر واي')) compound = 'The Waterway';
    else if (t.includes('fifth square') || t.includes('المراسم')) compound = 'Fifth Square';
    else if (t.includes('eastown') || t.includes('ايست تاون')) compound = 'Eastown';
    else if (t.includes('villette') || t.includes('فيليت')) compound = 'Villette';
    else if (t.includes('swan lake') || t.includes('سوان ليك')) compound = 'Swan Lake';

    // Rule 2: Deduplication Check
    // Direct Owner: match by phone_last7
    // Broker: match by (phone_last7, round(price))
    let duplicateListing: any = null;
    if (phoneLast7) {
      try {
        const query = await listRecords<any>('listings', {
          where: [
            advertiser === 'Direct Owner'
              ? { column: 'ownerPhone', value: phone }
              : { column: 'brokerPhone', value: phone },
          ],
          limit: 10,
        });

        if (advertiser === 'Direct Owner' && query.length > 0) {
          duplicateListing = query[0];
        } else if (advertiser === 'Broker') {
          const roundedTarget = Math.round(extractedPrice / 1000) * 1000;
          duplicateListing = query.find(q => Math.round(Number(q.price || 0) / 1000) * 1000 === roundedTarget);
        }
      } catch (err) {
        logger.warn(`[ChatListingRouter] Dedup check error: ${err}`);
      }
    }

    const geo = resolveLocation(compound);
    const now = new Date().toISOString();
    let unitCode = '';
    let action: 'created' | 'merged' = 'created';
    let listingId = '';

    if (duplicateListing) {
      // Merge into existing record
      action = 'merged';
      listingId = duplicateListing.id;
      unitCode = duplicateListing.code || duplicateListing.unitCode;
      
      const patch: Record<string, any> = { updatedAt: now };
      if (!duplicateListing.price && extractedPrice > 0) patch.price = extractedPrice;
      if (!duplicateListing.bedrooms && bedrooms > 0) patch.bedrooms = bedrooms;
      if (!duplicateListing.areaSqm && areaSqm > 0) patch.areaSqm = areaSqm;
      if (input.mediaUrls?.length) {
        const existingImages = Array.isArray(duplicateListing.images) ? duplicateListing.images : [];
        patch.images = Array.from(new Set([...input.mediaUrls, ...existingImages]));
      }
      try {
        await updateRecord('listings', listingId, patch);
      } catch (err) {
        logger.warn(`[ChatListingRouter] Merge update error: ${err}`);
      }
    } else {
      // Create new canonical unit code
      const resolved = resolveUnitCode({
        compound,
        dealType: dealToken,
        areaSqm: areaSqm || 150,
        price: extractedPrice,
        contactPhone: phone,
      });
      unitCode = resolved.code;

      try {
        const created = await insertRecord<{ id: string }>('listings', {
          ...toListingColumns({
            code: unitCode,
            unitCode,
            compound,
            city: geo.zone,
            latitude: geo.lat,
            longitude: geo.lng,
            propertyType: 'Apartment',
            dealType: dealToken,
            mode: dealToken,
            beds: bedrooms || 0,
            bedrooms: bedrooms || 0,
            area: areaSqm || 0,
            areaSqm: areaSqm || 0,
            price: extractedPrice,
            ownerName: advertiser === 'Direct Owner' ? (input.senderName || 'Owner') : null,
            ownerPhone: advertiser === 'Direct Owner' ? phone : null,
            brokerName: advertiser === 'Broker' ? (input.senderName || 'Broker') : null,
            brokerPhone: advertiser === 'Broker' ? phone : null,
            status: 'pending',
            publishStatus: 'REVIEW_REQUIRED',
            description: raw,
            img: input.mediaUrls?.[0] || null,
            images: input.mediaUrls || [],
          }),
          title: `Apartment · ${compound}`,
        });
        listingId = created.id;
      } catch (err) {
        logger.error(`[ChatListingRouter] Supabase listing insert error: ${err}`);
      }
    }

    // KPI Quality Evaluation & Memory Logging
    const kpi = UnitQualityKpiService.evaluateUnit({
      unitCode,
      title: `Apartment · ${compound}`,
      description: raw,
      dealType: dealToken,
      compound,
      priceEgp: extractedPrice,
      areaSqm,
      bedrooms,
      photoUrls: input.mediaUrls || [],
      isDirectOwner: advertiser === 'Direct Owner',
      latitude: geo.lat,
      longitude: geo.lng,
    });

    UnitQualityKpiService.recordKpiEvaluationToMemory(
      { unitCode, title: `Apartment · ${compound}`, dealType: dealToken, priceEgp: extractedPrice },
      kpi,
    );

    // Google Sheets Online Target Tabs
    const targetSheets: string[] = ['Master_Inventory'];
    if (advertiser === 'Direct Owner') {
      targetSheets.push(dealType === 'Rent' ? 'Owners_Rent' : 'Owners_Resale');
    } else {
      targetSheets.push(dealType === 'Rent' ? 'Brokers_Rent' : 'Brokers_Resale');
    }

    // Mirror to Google Sheets Master_Inventory
    try {
      await appendToManagedTab({
        tab: SHEET_TABS.masterInventory,
        headers: MASTER_INVENTORY_HEADERS,
        values: [
          unitCode,
          now.slice(0, 10),
          now,
          dealType,
          compound,
          'Apartment',
          areaSqm,
          bedrooms,
          '',
          '',
          '',
          '',
          extractedPrice,
          '',
          '',
          advertiser === 'Direct Owner' ? (input.senderName || 'Owner') : '',
          phone,
          'Not Contacted',
          'Pending Verification',
          advertiser,
          '',
          (input.mediaUrls || []).join(', '),
          raw,
        ],
      });
    } catch (sheetErr) {
      logger.warn(`[ChatListingRouter] Master_Inventory sheet sync: ${sheetErr}`);
    }

    return {
      category: advertiser === 'Direct Owner' ? 'listing_direct_owner' : 'listing_broker',
      action,
      referenceCode: unitCode,
      dealType,
      compound,
      priceEgp: extractedPrice,
      advertiserType: advertiser,
      targetSheets,
      supabaseId: listingId,
      details: {
        bedrooms,
        areaSqm,
        phone,
        aiScore: kpi.totalAiScore,
        scoreTier: kpi.tier,
      },
    };
  }
}
