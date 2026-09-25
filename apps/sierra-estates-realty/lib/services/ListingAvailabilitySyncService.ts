import 'server-only';
import {
  listRecords,
  getRecord,
  insertRecord,
  updateRecord,
  getSupabaseAdmin,
} from '@sierra-estates/db';
import { toListingColumns } from '@/lib/server/listing-columns';
import { logger } from '@/lib/logger';
import consolidatedRaw from '@/data/consolidated-master-inventory.json';
import realListingsRaw from '@/data/real-listings.json';

export interface OwnerInboundSyncParams {
  negotiationId?: string;
  unitId?: string;
  ownerPhone: string;
  ownerName?: string;
  text: string;
  mediaUrls?: string[];
}

export type DetectedAvailability = 'available' | 'rented' | 'sold' | 'unavailable' | 'neutral';

export interface SyncAnalysisResult {
  detectedStatus: DetectedAvailability;
  extractedPrice?: number;
  refinedNotes?: string;
  matchedListingId?: string;
  actionTaken: 'updated_existing' | 'inserted_from_local' | 'created_new_intake' | 'negotiation_only';
}

/**
 * Normalizes phone numbers to last 9 digits for robust Egyptian matching
 * e.g., +201012345678 -> 1012345678
 */
function cleanPhoneLast9(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-9);
}

/**
 * Heuristic Arabic & English NLP parser for owner WhatsApp messages.
 */
export function analyzeOwnerMessageText(text: string): {
  status: DetectedAvailability;
  extractedPrice?: number;
  isDetailedProperty: boolean;
} {
  const lower = text.toLowerCase();

  // 1. Check for rental/sold indicators first (negative overrides positive)
  if (
    lower.includes('اتأجرت') ||
    lower.includes('اتاجرت') ||
    lower.includes('تاجر') ||
    lower.includes('أجرتها') ||
    lower.includes('تم التأجير') ||
    lower.includes('rented') ||
    lower.includes('leased')
  ) {
    return { status: 'rented', isDetailedProperty: false };
  }

  if (
    lower.includes('اتباعت') ||
    lower.includes('اتبعت') ||
    lower.includes('تباع') ||
    lower.includes('بيعت') ||
    lower.includes('تم البيع') ||
    lower.includes('sold')
  ) {
    return { status: 'sold', isDetailedProperty: false };
  }

  if (
    lower.includes('غير متاح') ||
    lower.includes('مش متاح') ||
    lower.includes('مش موجود') ||
    lower.includes('مش للبيع') ||
    lower.includes('لأ مش متاح') ||
    lower.includes('not available')
  ) {
    return { status: 'unavailable', isDetailedProperty: false };
  }

  // 2. Check for availability indicators
  const isAvailable =
    lower.includes('متاح') ||
    lower.includes('موجود') ||
    lower.includes('جاهز') ||
    lower.includes('لسه معايا') ||
    lower.includes('فاضي') ||
    lower.includes('فاضية') ||
    lower.includes('تمام') ||
    lower.includes('أه متاح') ||
    lower.includes('نعم متاح') ||
    lower.includes('نعم') ||
    lower.includes('ايوة') ||
    lower.includes('available') ||
    lower.includes('still available') ||
    lower.includes('ready') ||
    lower.includes('yes');

  // 3. Extract price if present
  let extractedPrice: number | undefined;
  const priceRegex = /(?:مطلوب|السعر|ب|price|egp)\s*(\d+(?:[.,]\d+)?)\s*(مليون|million|m|الف|ألف|k)?/i;
  const match = text.match(priceRegex);
  if (match) {
    let num = parseFloat(match[1].replace(/,/g, ''));
    const unit = (match[2] || '').toLowerCase();
    if (unit.includes('مليون') || unit.includes('million') || unit === 'm') {
      num = num * 1_000_000;
    } else if (unit.includes('الف') || unit.includes('ألف') || unit === 'k') {
      num = num * 1_000;
    } else if (num < 1000 && num > 0) {
      // e.g. "مطلوب 45" in rental context = 45k, or in sale context "15" = 15m
      num = num > 100 ? num * 1_000 : num * 1_000_000;
    }
    extractedPrice = num;
  }

  // Check if message is a detailed intake listing (specs)
  const isDetailed =
    (lower.includes('شقة') || lower.includes('فيلا') || lower.includes('دوبلكس') || lower.includes('تاون')) &&
    (lower.includes('متر') || lower.includes('غرف') || lower.includes('نوم') || lower.includes('حمام') || lower.includes('دور'));

  return {
    status: isAvailable ? 'available' : isDetailed ? 'available' : 'neutral',
    extractedPrice,
    isDetailedProperty: isDetailed,
  };
}

/**
 * Searches the local committed JSON datasets for matching unit definitions.
 */
function findInLocalInventory(unitIdOrCode?: string, ownerPhone?: string): any | null {
  const localItems = [
    ...(Array.isArray(realListingsRaw) ? realListingsRaw : []),
    ...(Array.isArray(consolidatedRaw) ? consolidatedRaw : []),
  ];

  if (unitIdOrCode) {
    const target = String(unitIdOrCode).trim().toLowerCase();
    const found = localItems.find((u: any) => {
      const id = String(u.id || '').toLowerCase();
      const code = String(u.code || u.sierraCode || u.sbrCode || '').toLowerCase();
      return id === target || code === target || `se-${id}` === target || `se-${code}` === target;
    });
    if (found) return found;
  }

  if (ownerPhone) {
    const cleanPhone = cleanPhoneLast9(ownerPhone);
    if (cleanPhone) {
      const found = localItems.find((u: any) => {
        const p = cleanPhoneLast9(u.ownerPhone || u.phone || u.mobile || u.contact_info);
        return p && (p.includes(cleanPhone) || cleanPhone.includes(p));
      });
      if (found) return found;
    }
  }

  return null;
}

export class ListingAvailabilitySyncService {
  /**
   * Finds an existing listing in Supabase public.listings by unitId/code or ownerPhone.
   */
  static async findDatabaseListing(
    unitIdOrCode?: string,
    ownerPhone?: string,
  ): Promise<Record<string, unknown> | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    if (unitIdOrCode) {
      // 1. Direct ID lookup
      try {
        const byId = await getRecord<Record<string, unknown>>('listings', unitIdOrCode);
        if (byId) return byId;
      } catch {}

      // 2. By code / unitCode / sierraCode / refId
      for (const col of ['code', 'unit_code', 'sierra_code', 'sbr_code', 'ref_id', 'reference_code']) {
        try {
          const { data } = await supabase
            .from('listings')
            .select('*')
            .eq(col, unitIdOrCode)
            .limit(1)
            .maybeSingle();
          if (data) return data;
        } catch {}
      }
    }

    // 3. By owner phone
    if (ownerPhone) {
      const cleanPhone = cleanPhoneLast9(ownerPhone);
      if (cleanPhone) {
        try {
          const { data } = await supabase
            .from('listings')
            .select('*')
            .or(`owner_phone.ilike.%${cleanPhone}%,mobile.ilike.%${cleanPhone}%`)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) return data;
        } catch {}
      }
    }

    return null;
  }

  /**
   * Main sync engine: called whenever an owner responds to an outreach WhatsApp message
   * or sends property details to the bot.
   */
  static async syncFromInboundOwnerMessage(params: OwnerInboundSyncParams): Promise<SyncAnalysisResult> {
    const { negotiationId, unitId, ownerPhone, ownerName, text, mediaUrls = [] } = params;
    const now = new Date().toISOString();

    const analysis = analyzeOwnerMessageText(text);
    const { status, extractedPrice, isDetailedProperty } = analysis;

    logger.info(
      `[ListingAvailabilitySync] Processing owner reply for phone ${ownerPhone}, unit: ${unitId || 'unknown'}: detected status: ${status}, price: ${extractedPrice || 'none'}`
    );

    // Locate listing in Supabase
    let dbListing = await this.findDatabaseListing(unitId, ownerPhone);

    // 1. Update Existing DB Listing
    if (dbListing && dbListing.id) {
      const listingId = String(dbListing.id);
      const patch: Record<string, unknown> = {
        updatedAt: now,
      };

      if (status === 'available') {
        patch.status = 'available';
      } else if (status === 'rented') {
        patch.status = 'rented';
      } else if (status === 'sold') {
        patch.status = 'sold';
      } else if (status === 'unavailable') {
        patch.status = 'archived';
      }

      if (extractedPrice !== undefined && extractedPrice > 0) {
        patch.price = extractedPrice;
      }

      if (mediaUrls.length > 0) {
        const existingImages = Array.isArray(dbListing.images) ? (dbListing.images as string[]) : [];
        patch.images = Array.from(new Set([...existingImages, ...mediaUrls]));
      }

      // Add verification note to rawData
      const existingRaw = (dbListing.rawData || dbListing.raw_data || {}) as Record<string, unknown>;
      patch.rawData = {
        ...existingRaw,
        lastOwnerVerification: {
          timestamp: now,
          rawReply: text,
          detectedStatus: status,
          updatedPrice: extractedPrice,
        },
      };

      await updateRecord('listings', listingId, {
        ...toListingColumns(patch),
        updatedAt: now,
      });

      logger.info(`[ListingAvailabilitySync] Updated listing ${listingId} to status '${patch.status || dbListing.status}'`);

      // Update negotiation record status
      if (negotiationId) {
        try {
          const negPatch: Record<string, unknown> = {
            updatedAt: now,
            lastContactAt: now,
          };
          if (status === 'available') negPatch.status = 'negotiating';
          if (status === 'rented' || status === 'sold') negPatch.status = 'stale';
          if (extractedPrice) negPatch.currentOfferPrice = extractedPrice;
          await updateRecord('owner_negotiations', negotiationId, negPatch);
        } catch {}
      }

      return {
        detectedStatus: status,
        extractedPrice,
        matchedListingId: listingId,
        actionTaken: 'updated_existing',
      };
    }

    // 2. Not in DB yet — check local datasets (consolidated / real-listings)
    const localUnit = findInLocalInventory(unitId, ownerPhone);
    if (localUnit) {
      const payload: Record<string, unknown> = {
        ...localUnit,
        id: localUnit.id || `SE-${Date.now()}`,
        status: status === 'rented' ? 'rented' : status === 'sold' ? 'sold' : 'available',
        price: extractedPrice || localUnit.price || localUnit.priceEgp || 0,
        ownerPhone: ownerPhone || localUnit.ownerPhone || localUnit.phone || '',
        ownerName: ownerName || localUnit.ownerName || localUnit.name || 'Owner',
        sourceChannel: 'Owner WhatsApp Inbound Sync',
        images: mediaUrls.length > 0 ? mediaUrls : localUnit.photos || [],
        createdAt: now,
        updatedAt: now,
        rawData: {
          originalLocalUnit: localUnit,
          verifiedViaWhatsApp: true,
          verificationText: text,
          verifiedAt: now,
        },
      };

      const cols = toListingColumns(payload);
      const inserted = await insertRecord<{ id: string }>('listings', cols);
      const newListingId = inserted?.id || String(payload.id);

      logger.info(`[ListingAvailabilitySync] Ingested local inventory unit ${newListingId} into live listings as '${payload.status}'`);

      return {
        detectedStatus: status,
        extractedPrice,
        matchedListingId: newListingId,
        actionTaken: 'inserted_from_local',
      };
    }

    // 3. Detailed property intake sent directly by owner
    if (isDetailedProperty || (status === 'available' && extractedPrice)) {
      const newPayload: Record<string, unknown> = {
        title: `Unit from Owner - ${ownerPhone}`,
        propertyType: text.toLowerCase().includes('فيلا') ? 'Villa' : text.toLowerCase().includes('دوبلكس') ? 'Duplex' : 'Apartment',
        dealType: text.toLowerCase().includes('ايجار') || text.toLowerCase().includes('إيجار') ? 'rent' : 'sale',
        compound: 'New Cairo',
        price: extractedPrice || 0,
        ownerPhone: ownerPhone,
        ownerName: ownerName || 'Direct Owner',
        status: 'available',
        sourceChannel: 'WhatsApp Direct Owner Intake',
        description: text,
        images: mediaUrls,
        createdAt: now,
        updatedAt: now,
      };

      const cols = toListingColumns(newPayload);
      const created = await insertRecord<{ id: string }>('listings', cols);
      const newId = created?.id;

      logger.info(`[ListingAvailabilitySync] Created fresh direct owner listing ${newId} in live inventory`);

      return {
        detectedStatus: 'available',
        extractedPrice,
        matchedListingId: newId,
        actionTaken: 'created_new_intake',
      };
    }

    // 4. Record only on negotiation thread
    return {
      detectedStatus: status,
      extractedPrice,
      actionTaken: 'negotiation_only',
    };
  }
}
