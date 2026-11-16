/**
 * SIERRA ESTATES — ADD LISTING PIPELINE (Module 4)
 *
 * Canonical backend pipeline behind /add-listing (public Owner/Broker form)
 * and the Admin/Broker quick-add drawer:
 *
 *   1. DEDUPLICATION — match the normalized phone + compound + unit/building
 *      number or BUA (±5% band) against Supabase `listings` and the Owners
 *      Master family of tabs. A duplicate MERGES: missing price/status fields
 *      are filled in place instead of creating a second row for the same
 *      physical unit.
 *   2. UNIT CODING — the official Sierra Estates code from
 *      lib/server/unit-codes.ts (SE-SL/SE-RNT-[AREA]-[SERIAL], gazetteer
 *      area codes HYD/MVI/…; deterministic serial, no random collisions).
 *   3. DUAL WRITE — Supabase `listings` + Google Sheets:
 *      Owners Master family (owner-routed tab via the legacy Apps Script
 *      bridge, kept for its photo upload) AND Master_Inventory / Real_Available_Units
 *      via Sheets API v4 (auto-created tabs + headers).
 *   4. TELEGRAM — formatted notification with the unit code, specs and the
 *      direct admin/map link.
 */

import 'server-only';
import { listRecords, insertRecord, updateRecord } from '@sierra-estates/db';
import { resolveUnitCode } from '@/lib/server/unit-codes';
import { resolveLocation } from '@/lib/inventory/gazetteer';
import { toListingColumns } from '@/lib/server/listing-columns';
import { normalizeEgyptianPhone } from '@/lib/utils/phone';
import { bustInventoryCache } from '@/app/api/inventory/route';
import {
  SHEET_TABS,
  appendToManagedTab,
} from '@/lib/services/GoogleSheetsV4Service';
import { sendTelegramNotification, formatNewListingMessage } from '@/lib/services/TelegramNotifier';
import { logger } from '@/lib/logger';

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

export type SubmitterRole = 'Direct Owner' | 'Co-Broker' | 'Internal Agent';
export type ListingTransaction = 'Sale' | 'Rent';
export type ListingCategory =
  | 'Apartment' | 'Villa' | 'Twin House' | 'Townhouse'
  | 'Duplex' | 'Penthouse' | 'Commercial';
export type ListingFinishing = 'Core & Shell' | 'Semi-Finished' | 'Fully Finished' | 'Furnished';
export type ListingAvailability = 'Available' | 'Reserved' | 'Sold/Rented';

export interface AddListingInput {
  submitterRole: SubmitterRole;
  contactName: string;
  phone: string;
  transaction: ListingTransaction;
  category: ListingCategory;
  compound: string;
  /** Optional masterplan zone tag (e.g. 'Crystal Lagoon', 'Central Park'). */
  zone?: string | null;
  areaSqm: number;
  gardenSqm?: number | null;
  bedrooms: number;
  bathrooms: number;
  floor?: string | null;
  finishing: ListingFinishing;
  priceEgp: number;
  monthlyRentEgp?: number | null;
  downPaymentEgp?: number | null;
  installmentYears?: number | null;
  monthlyInstallmentEgp?: number | null;
  availability: ListingAvailability;
  /** Base64 data URLs from the client, or https URLs after storage upload. */
  photos?: string[];
  notes?: string | null;
  /** Explicit unit/building number when known (sharpened dedup key). */
  unitNumber?: string | null;
  source?: string;
}

export interface AddListingResult {
  ok: boolean;
  /** The official Sierra Estates unit code (SE-SL-HYD-0142 style). */
  unitCode: string;
  listingId: string;
  action: 'created' | 'merged';
  mergedInto?: string;
  photos: string[];
  sheetSync: { masterInventory: boolean; realAvailable: boolean; ownersMaster: boolean };
  telegram: { ok: boolean; error?: string };
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  STEP 1 — DEDUPLICATION                                             */
/* ------------------------------------------------------------------ */

export interface DedupMatch {
  id: string;
  code: string;
  row: Record<string, unknown>;
  /** Why this row matched — surfaced to staff on merge. */
  reason: string;
}

/**
 * Find the same physical unit: same normalized contact phone, same compound,
 * and either the same unit/building number or a BUA within ±5%.
 */
export async function findDuplicateListing(input: AddListingInput): Promise<DedupMatch | null> {
  const phone = normalizeEgyptianPhone(input.phone);
  if (!phone) return null;

  let candidates: Record<string, unknown>[] = [];
  try {
    candidates = await listRecords<Record<string, unknown>>('listings', {
      where: [{ column: 'owner_phone', op: 'eq', value: phone }],
      limit: 200,
    });
    // Co-broker submissions may live under broker_phone instead.
    const brokerRows = await listRecords<Record<string, unknown>>('listings', {
      where: [{ column: 'broker_phone', op: 'eq', value: phone }],
      limit: 200,
    });
    const seen = new Set(candidates.map((r) => String(r.id)));
    candidates = [...candidates, ...brokerRows.filter((r) => !seen.has(String(r.id)))];
  } catch (err) {
    logger.warn(
      `[AddListingPipeline] dedup lookup failed (non-fatal): ${err instanceof Error ? err.message : err}`,
    );
    return null;
  }

  const compoundKey = input.compound.trim().toLowerCase();
  for (const row of candidates) {
    const rowCompound = String(row.compound ?? '').trim().toLowerCase();
    if (!rowCompound || rowCompound !== compoundKey) continue;

    const rowNum = String(row.zone ?? row.unitNumber ?? '').trim().toLowerCase();
    const inNum = String(input.unitNumber ?? '').trim().toLowerCase();
    if (inNum && rowNum && rowNum === inNum) {
      return {
        id: String(row.id),
        code: String(row.code ?? ''),
        row,
        reason: `same phone + compound + unit/building no. (${inNum})`,
      };
    }

    const rowArea = Number(row.areaSqm ?? row.area_sqm ?? 0) || 0;
    if (rowArea > 0 && input.areaSqm > 0) {
      const diff = Math.abs(rowArea - input.areaSqm) / Math.max(rowArea, input.areaSqm);
      if (diff <= 0.05) {
        return {
          id: String(row.id),
          code: String(row.code ?? ''),
          row,
          reason: `same phone + compound + BUA ±5% (${rowArea} ↔ ${input.areaSqm} m²)`,
        };
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  STEP 2 — UNIT CODING                                               */
/* ------------------------------------------------------------------ */

/**
 * Official Sierra Estates unit code. `resolveUnitCode` passes through a valid
 * canonical code and otherwise mints a deterministic SE-SL/SE-RNT-[AREA]-[SERIAL]
 * from compound + deal type + a stable seed, so re-submitting the same unit
 * never mints a second identity.
 */
export function generateOfficialUnitCode(input: AddListingInput, existing?: DedupMatch | null): string {
  if (existing?.code) return existing.code; // a merge keeps the registry code
  const resolved = resolveUnitCode({
    code: null,
    compound: input.compound,
    dealType: input.transaction === 'Rent' ? 'rent' : 'sale',
    seed: [normalizeEgyptianPhone(input.phone), input.unitNumber ?? '', input.areaSqm]
      .filter(Boolean)
      .join('|'),
    contactPhone: normalizeEgyptianPhone(input.phone) ?? undefined,
    areaSqm: input.areaSqm,
  });
  return resolved.code;
}

/* ------------------------------------------------------------------ */
/*  STEP 3 — STORAGE UPLOAD                                            */
/* ------------------------------------------------------------------ */

/**
 * Upload base64 data-URL photos to the public `property-media` bucket and
 * return stable https URLs. Photos already on https pass through untouched.
 */
export async function uploadListingPhotos(
  docId: string,
  photos: string[] | undefined,
): Promise<string[]> {
  if (!photos?.length) return [];
  const { StorageService } = await import('@/lib/services/StorageService');
  const urls: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    if (/^https?:\/\//i.test(photo)) {
      urls.push(photo);
      continue;
    }
    if (!photo.startsWith('data:')) continue;
    try {
      const mimeType = /data:([^;]+)/.exec(photo)?.[1] ?? 'image/jpeg';
      const ext = mimeType.split('/')[1]?.split('+')[0] ?? 'jpg';
      const url = await StorageService.uploadPropertyMedia(
        `${docId}`,
        photo,
        mimeType,
        `listing-${i + 1}.${ext}`,
      );
      if (url) urls.push(url);
    } catch (err) {
      logger.warn(
        `[AddListingPipeline] photo ${i + 1} upload failed (skipped): ${err instanceof Error ? err.message : err}`,
      );
    }
  }
  return urls;
}

/* ------------------------------------------------------------------ */
/*  STEP 4 — SHEET ROWS                                                */
/* ------------------------------------------------------------------ */

/** MASTER_HEADERS order (SheetsIntegrationService) — the Master_Inventory row. */
function buildMasterInventoryRow(args: {
  unitCode: string;
  input: AddListingInput;
  photoUrls: string[];
}): (string | number)[] {
  const { unitCode, input, photoUrls } = args;
  const geo = resolveLocation(input.compound);
  const benchmark = Math.round(input.areaSqm * 78_000); // AVM benchmark, same as SheetsIntegrationService
  const pricePerSqm = input.transaction === 'Rent' && input.monthlyRentEgp
    ? input.monthlyRentEgp / Math.max(input.areaSqm, 1)
    : input.priceEgp / Math.max(input.areaSqm, 1);
  const isFeaturedGem = pricePerSqm <= 0.85 * (benchmark / Math.max(input.areaSqm, 1)) ? 'TRUE' : 'FALSE';
  const now = new Date().toISOString();
  return [
    unitCode,                                    // Unit_Code
    now.slice(0, 10),                            // Date_Added (yyyy-mm-dd)
    now,                                         // Last_Action_Timestamp
    input.transaction === 'Rent' ? 'Rent' : 'Resale', // Deal_Type
    geo.label ?? input.compound,                 // Canonical_Compound
    input.category,                              // Unit_Type
    input.areaSqm,                               // Area_SQM
    input.bedrooms,                              // Bedrooms
    input.bathrooms,                             // Bathrooms
    input.floor ?? '',                           // Floor
    input.finishing === 'Furnished' ? 'Furnished' : 'Unfurnished', // Furnishing
    input.finishing,                             // Finishing
    input.transaction === 'Rent' ? (input.monthlyRentEgp ?? input.priceEgp) : input.priceEgp, // Price_EGP
    benchmark,                                   // AI_Fair_Price_Benchmark
    isFeaturedGem,                               // Is_Featured_Gem
    input.contactName,                           // Owner_Name_Internal
    normalizeEgyptianPhone(input.phone) ?? input.phone, // Owner_Mobile_Internal
    'Not Contacted Yet',                         // Contact_Status
    input.availability === 'Available' ? 'Pending Verification' : input.availability, // Listing_Status
    input.submitterRole,                         // Sourced_By_Agent
    '',                                          // Verified_By_Employee
    photoUrls.join(', '),                        // Media_Links
    input.notes ?? '',                           // Notes
  ];
}

/** Master_Inventory header (canonical order — mirrors MASTER_HEADERS). */
const MASTER_INVENTORY_HEADERS = [
  'Unit_Code', 'Date_Added', 'Last_Action_Timestamp', 'Deal_Type', 'Canonical_Compound',
  'Unit_Type', 'Area_SQM', 'Bedrooms', 'Bathrooms', 'Floor', 'Furnishing', 'Finishing',
  'Price_EGP', 'AI_Fair_Price_Benchmark', 'Is_Featured_Gem', 'Owner_Name_Internal',
  'Owner_Mobile_Internal', 'Contact_Status', 'Listing_Status', 'Sourced_By_Agent',
  'Verified_By_Employee', 'Media_Links', 'Notes',
] as const;

/** Real_Available_Units header = MASTER + Verified_Available_Date at index 3. */
const REAL_AVAILABLE_HEADERS = [
  'Unit_Code', 'Date_Added', 'Last_Action_Timestamp', 'Verified_Available_Date', 'Deal_Type',
  'Canonical_Compound', 'Unit_Type', 'Area_SQM', 'Bedrooms', 'Bathrooms', 'Floor',
  'Furnishing', 'Finishing', 'Price_EGP', 'AI_Fair_Price_Benchmark', 'Is_Featured_Gem',
  'Owner_Name_Internal', 'Owner_Mobile_Internal', 'Contact_Status', 'Listing_Status',
  'Sourced_By_Agent', 'Verified_By_Employee', 'Media_Links', 'Notes',
] as const;

/* ------------------------------------------------------------------ */
/*  MAIN PIPELINE                                                      */
/* ------------------------------------------------------------------ */

export interface AddListingOptions {
  /** Admin quick-add drawer marks internal submissions verified. */
  isInternal?: boolean;
  skipTelegram?: boolean;
  /** Base URL for the admin link in the Telegram alert (defaults to /admin). */
  adminBaseUrl?: string;
}

export async function processAddListing(
  input: AddListingInput,
  options: AddListingOptions = {},
): Promise<AddListingResult> {
  const phoneNormalized = normalizeEgyptianPhone(input.phone);
  if (!phoneNormalized) {
    return {
      ok: false,
      unitCode: '',
      listingId: '',
      action: 'created',
      photos: [],
      sheetSync: { masterInventory: false, realAvailable: false, ownersMaster: false },
      telegram: { ok: false, error: 'not_attempted' },
      error: 'invalid_phone',
    };
  }

  // 1. Dedup check (phone + compound + unit no./BUA band).
  const duplicate = await findDuplicateListing(input);

  // 2. Official unit code (merge keeps the existing registry code).
  const unitCode = generateOfficialUnitCode(input, duplicate);
  const geo = resolveLocation(input.compound);
  const now = new Date().toISOString();
  const transactionToken = input.transaction === 'Rent' ? 'rent' : 'sale';

  // 3a. Supabase write — merge fills missing price/status in place.
  let listingId = '';
  let action: 'created' | 'merged' = 'created';
  try {
    if (duplicate) {
      const existing = duplicate.row;
      const patch: Record<string, unknown> = {};
      // Only fill fields the existing row is missing or the new submission
      // improves — never clobber staff-verified values with web claims.
      const existingPrice = Number(existing.price ?? 0) || 0;
      const newPrice = input.transaction === 'Rent' ? (input.monthlyRentEgp ?? input.priceEgp) : input.priceEgp;
      if (!existingPrice && newPrice > 0) patch.price = newPrice;
      const existingStatus = String(existing.status ?? '');
      if (!existingStatus && input.availability) patch.status = input.availability === 'Sold/Rented' ? 'sold' : input.availability === 'Reserved' ? 'reserved' : 'available';
      if (!existing.finishingType && input.finishing) patch.finishingType = input.finishing;
      if (!existing.floor && input.floor) patch.floor = input.floor;
      if (!existing.bedrooms && input.bedrooms) patch.bedrooms = input.bedrooms;
      if (!existing.bathrooms && input.bathrooms) patch.bathrooms = input.bathrooms;
      patch.updatedAt = now;
      if (input.notes) {
        patch.description = `${existing.description ?? ''}\n[Add-listing update ${now.slice(0, 10)}] ${input.notes}`.trim();
      }
      await updateRecord('listings', duplicate.id, patch);
      listingId = duplicate.id;
      action = 'merged';
      bustInventoryCache();
    } else {
      const created = await insertRecord<{ id: string }>('listings', {
        ...toListingColumns({
          code: unitCode,
          unitCode,
          sbrCode: unitCode,
          compound: input.compound,
          city: geo.zone,
          latitude: geo.lat,
          longitude: geo.lng,
          zone: input.zone ?? input.unitNumber ?? null,
          type: input.category,
          propertyType: input.category,
          dealType: transactionToken,
          mode: transactionToken,
          beds: input.bedrooms,
          bedrooms: input.bedrooms,
          baths: input.bathrooms,
          bathrooms: input.bathrooms,
          area: input.areaSqm,
          areaSqm: input.areaSqm,
          gardenArea: input.gardenSqm ?? 0,
          price: input.transaction === 'Rent' ? (input.monthlyRentEgp ?? input.priceEgp) : input.priceEgp,
          egpM: Number(((input.transaction === 'Rent' ? (input.monthlyRentEgp ?? input.priceEgp) : input.priceEgp) / 1_000_000).toFixed(2)),
          finishing: input.finishing,
          finishingType: input.finishing,
          ownerName: input.contactName,
          ownerPhone: phoneNormalized,
          ownerType: input.submitterRole === 'Direct Owner' ? 'Owner' : input.submitterRole === 'Co-Broker' ? 'Broker' : 'Agent',
          mobile: phoneNormalized,
          agent: input.contactName,
          status: options.isInternal
            ? (input.availability === 'Available' ? 'active' : input.availability === 'Reserved' ? 'reserved' : 'sold')
            : 'pending',
          publishStatus: options.isInternal ? 'PUBLISHABLE' : 'REVIEW_REQUIRED',
          verified: Boolean(options.isInternal),
          publishToClient: Boolean(options.isInternal),
          sourceChannel: input.submitterRole === 'Direct Owner' ? 'owner' : input.submitterRole === 'Co-Broker' ? 'broker' : 'agent',
          comment: input.notes ?? '',
          description: input.notes ?? '',
          tag: input.submitterRole,
          img: input.photos?.[0] ?? null,
        }),
        title: `${input.category} · ${input.compound}`,
        dupeCheckHash: `${phoneNormalized}|${input.compound.trim().toLowerCase()}|${input.category.toLowerCase()}|${Math.round(input.areaSqm / 5) * 5}`,
      });
      listingId = created.id;
      bustInventoryCache();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[AddListingPipeline] Supabase write failed: ${message}`);
    return {
      ok: false,
      unitCode,
      listingId: '',
      action,
      photos: [],
      sheetSync: { masterInventory: false, realAvailable: false, ownersMaster: false },
      telegram: { ok: false, error: 'not_attempted' },
      error: `supabase_write_failed: ${message}`,
    };
  }

  // 3b. Photo upload to Supabase Storage (public https URLs).
  const photoUrls = await uploadListingPhotos(listingId, input.photos);
  if (photoUrls.length) {
    try {
      if (action === 'merged') {
        const existingImages = Array.isArray(duplicate?.row.images) ? (duplicate!.row.images as string[]) : [];
        await updateRecord('listings', listingId, {
          images: Array.from(new Set([...photoUrls, ...existingImages])),
          img: duplicate?.row.img ?? photoUrls[0],
        });
      } else {
        await updateRecord('listings', listingId, {
          images: photoUrls,
          img: photoUrls[0],
          photos: photoUrls,
        });
      }
    } catch (err) {
      logger.warn(
        `[AddListingPipeline] photo URL stamping failed (non-fatal): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // 3b-ii. KPI Quality Evaluation & ECC Memory Journal
  try {
    const { UnitQualityKpiService } = await import('./UnitQualityKpiService');
    const qualityEvaluation = UnitQualityKpiService.evaluateUnit({
      unitCode,
      title: `${input.category} · ${input.compound}`,
      description: input.notes,
      dealType: transactionToken,
      compound: input.compound,
      propertyType: input.category,
      areaSqm: input.areaSqm,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      floor: input.floor,
      finishing: input.finishing,
      priceEgp: input.priceEgp,
      monthlyRentEgp: input.monthlyRentEgp,
      photoUrls,
      isDirectOwner: input.submitterRole === 'Direct Owner',
      latitude: geo.lat,
      longitude: geo.lng,
      notes: input.notes,
    });

    UnitQualityKpiService.recordKpiEvaluationToMemory(
      {
        unitCode,
        title: `${input.category} · ${input.compound}`,
        dealType: transactionToken,
        priceEgp: input.priceEgp,
        photoUrls,
        compound: input.compound,
      },
      qualityEvaluation,
    );

    await updateRecord('listings', listingId, {
      aiScore: qualityEvaluation.totalAiScore,
      scoreTier: qualityEvaluation.tier,
      photoCount: photoUrls.length,
      aiScoredAt: now,
      ...(options.isInternal && qualityEvaluation.isPublishable ? { publishStatus: 'PUBLISHABLE' } : {}),
    });
  } catch (kpiErr) {
    logger.warn(`[AddListingPipeline] KPI evaluation/memory logging non-fatal error: ${kpiErr}`);
  }

  // 3c. Google Sheets — Master_Inventory append (tab auto-created) and
  //     Real_Available_Units append when the unit is Available.
  const masterRow = buildMasterInventoryRow({ unitCode, input, photoUrls });
  const masterSync = await appendToManagedTab({
    tab: SHEET_TABS.masterInventory,
    headers: MASTER_INVENTORY_HEADERS,
    values: masterRow,
  });

  let realSync: { ok: boolean } = { ok: false };
  if (input.availability === 'Available') {
    const realRow = [
      ...masterRow.slice(0, 3),
      now.slice(0, 10), // Verified_Available_Date (inserted after Last_Action_Timestamp)
      ...masterRow.slice(3),
    ];
    realSync = await appendToManagedTab({
      tab: SHEET_TABS.realAvailableUnits,
      headers: REAL_AVAILABLE_HEADERS,
      values: realRow,
    });
  }

  // 3d. Owners Master family — the legacy Apps Script bridge handles the
  //     owner-routed tabs (owners rent / owners resale) AND uploads photos to
  //     Google Drive; keep it in the loop for owner submissions.
  let ownersMasterOk = false;
  if (input.submitterRole === 'Direct Owner') {
    try {
      const { syncWebsiteSubmissionToSheet } = await import('@/lib/services/GoogleSheetSyncService');
      const res = await syncWebsiteSubmissionToSheet({
        code: unitCode,
        supabaseId: listingId,
        compound: input.compound,
        propertyType: input.category,
        mode: input.transaction === 'Rent' ? 'rent' : 'sale',
        beds: input.bedrooms,
        baths: input.bathrooms,
        area: input.areaSqm,
        gardenArea: input.gardenSqm ?? undefined,
        price: input.transaction === 'Rent' ? (input.monthlyRentEgp ?? input.priceEgp) : input.priceEgp,
        finishing: input.finishing,
        ownerName: input.contactName,
        ownerType: 'Owner',
        mobile: phoneNormalized,
        comment: input.notes ?? undefined,
        photos: photoUrls,
        websiteUrl: photoUrls[0] ?? '',
      });
      ownersMasterOk = Boolean(res.ok);
    } catch (err) {
      logger.warn(
        `[AddListingPipeline] Owners Master sync failed (non-fatal): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // 4. Telegram notification — unit code, specs, admin/map link.
  const adminBase = options.adminBaseUrl || process.env.NEXT_PUBLIC_SITE_URL || '';
  const mapUrl = geo.lat && geo.lng ? `https://www.google.com/maps?q=${geo.lat},${geo.lng}` : null;
  let telegram: { ok: boolean; error?: string } = { ok: false, error: 'skipped' };
  if (!options.skipTelegram) {
    telegram = await sendTelegramNotification(
      formatNewListingMessage({
        unitCode,
        submitterRole: input.submitterRole,
        contactName: input.contactName,
        phone: phoneNormalized,
        transaction: input.transaction,
        category: input.category,
        compound: input.compound,
        zone: input.zone ?? null,
        areaSqm: input.areaSqm,
        gardenSqm: input.gardenSqm ?? null,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        finishing: input.finishing,
        priceEgp: input.transaction === 'Sale' ? input.priceEgp : null,
        monthlyRentEgp: input.transaction === 'Rent' ? (input.monthlyRentEgp ?? input.priceEgp) : null,
        availability: input.availability,
        adminUrl: adminBase ? `${adminBase}/admin/console?tab=inventory_command&unit=${encodeURIComponent(unitCode)}` : `/admin/console?tab=inventory_command&unit=${encodeURIComponent(unitCode)}`,
        mapUrl,
        mergedInto: action === 'merged' ? unitCode : null,
      }),
      { role: 'sales_advisor' },
    );
  }

  return {
    ok: true,
    unitCode,
    listingId,
    action,
    mergedInto: action === 'merged' ? unitCode : undefined,
    photos: photoUrls,
    sheetSync: {
      masterInventory: masterSync.ok,
      realAvailable: realSync.ok,
      ownersMaster: ownersMasterOk,
    },
    telegram,
  };
}
