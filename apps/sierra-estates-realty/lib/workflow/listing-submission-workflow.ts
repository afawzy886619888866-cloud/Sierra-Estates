import { FatalError } from 'workflow';
import { listRecords, insertRecord, updateRecord } from '@sierra-estates/db';
import { toListingColumns } from '@/lib/server/listing-columns';
import { resolveLocation } from '@/lib/inventory/gazetteer';
import { egpToUsd } from '@/lib/fx';
import { bustInventoryCache } from '@/app/api/inventory/route';
import { sendTelegramMessage, escapeTelegramHtml } from '@/lib/telegram';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { appendToExcelInventory } from '@/lib/services/ExcelInventoryService';
import {
  syncWebsiteSubmissionToSheet,
  type WebsiteSheetSyncInput,
} from '@/lib/services/GoogleSheetSyncService';
import { AugustOwnersAgentService } from '@/lib/services/AugustOwnersAgentService';
import { SheetsIntegrationService } from '@/lib/services/SheetsIntegrationService';

export type ListingSubmissionWorkflowInput = {
  code?: string;
  compound: string;
  propertyType: string;
  mode: 'sale' | 'rent';
  beds: number;
  baths: number;
  area: number;
  gardenArea?: number;
  price: number;
  finishing?: string;
  ownerName?: string;
  ownerType?: string;
  mobile?: string;
  ownerPhone?: string;
  brokerPhone?: string;
  brokerName?: string;
  agentName?: string;
  submitterType?: 'owner' | 'broker' | 'employee' | 'bot';
  rawText?: string;
  comment?: string;
  photos?: string[];
  images?: string[];
  tags?: string[];
  conflictAction?: 'check_only' | 'merge' | 'new_code' | 'overwrite';
  baseVersion?: string;
  requestOrigin?: string;
};

type ListingWorkflowResult = {
  success: true;
  message: string;
  code: string;
  id: string;
  isMerged: boolean;
  targetTab: string;
  sheetSync: Awaited<ReturnType<typeof syncWebsiteSubmissionToSheet>>;
  listing: Record<string, unknown> & { mobile: string; id: string };
};

type ConflictWorkflowResult = {
  success: false;
  conflict: true;
  code: string;
  message: string;
  existing: Record<string, unknown>;
  incoming: Record<string, unknown>;
};

type PersistedListing = Record<string, unknown> & {
  id: string;
  code: string;
  compound: string;
  propertyType: string;
  mode: 'sale' | 'rent';
  price: number;
  beds: number;
  baths: number;
  area: number;
  ownerName: string;
  ownerType: string;
  mobile: string;
  photos: string[];
  comment: string;
};

type PersistedListingResult = {
  success: true;
  conflict: false;
  code: string;
  id: string;
  isMerged: boolean;
  targetTab: string;
  listing: PersistedListing;
};

export async function listingSubmissionWorkflow(
  data: ListingSubmissionWorkflowInput,
): Promise<ListingWorkflowResult | ConflictWorkflowResult> {
  'use workflow';

  const persisted = await persistListingStep(data);
  if (persisted.success === false) {
    return persisted;
  }

  const syncResult = await syncSheetStep({
    ...persisted,
    requestOrigin: data.requestOrigin ?? '',
  });

  await Promise.allSettled([
    appendExcelInventoryStep({
      ...persisted.listing,
    }),
    syncMasterInventoryStep({
      listing: persisted.listing,
      code: persisted.code,
    }),
    sendTelegramAlertStep({
      ...persisted.listing,
      sheetRowLine: syncResult.inventoryUrl
        ? `\n<b>Sheet row:</b> ${syncResult.inventoryUrl}`
        : '',
    }),
    enqueueWhatsAppStep({
      ...persisted.listing,
      sheetRowWa: syncResult.inventoryUrl ? `\n📊 Sheet row: ${syncResult.inventoryUrl}` : '',
    }),
    broadcastToAugustGroupStep({
      ...persisted.listing,
    }),
  ]);

  return {
    success: true,
    message: 'Listing submitted and published to map, inventory, and Google Sheet',
    code: persisted.code,
    id: persisted.id,
    isMerged: persisted.isMerged,
    targetTab: persisted.targetTab,
    sheetSync: syncResult,
    listing: {
      ...persisted.listing,
      id: persisted.id,
      mobile: '+201092048333',
    },
  };
}

async function persistListingStep(
  data: ListingSubmissionWorkflowInput,
): Promise<PersistedListingResult | ConflictWorkflowResult> {
  'use step';
  const now = new Date().toISOString();
  const listingCode = (data.code || '').trim() || `SE-SUB-${Date.now().toString().slice(-6)}`;
  const egpM = data.price > 100000 ? Number((data.price / 1_000_000).toFixed(2)) : data.price;
  const usd = egpToUsd(data.price);
  const geo = resolveLocation(data.compound);

  const isBroker =
    data.ownerType === 'Broker' ||
    data.submitterType === 'broker' ||
    Boolean(data.brokerPhone && !data.ownerPhone);
  const isRent = data.mode === 'rent';
  const effectiveDealType = isRent && Number(data.price) <= 400_000 ? 'Rent' : 'Resale';
  const targetTab = isBroker
    ? effectiveDealType === 'Rent'
      ? 'brokers rent'
      : 'brokers resale'
    : effectiveDealType === 'Rent'
      ? 'owners rent'
      : 'owners resale';

  const effectiveOwnerPhone = data.ownerPhone || (!isBroker ? data.mobile : '') || null;
  const effectiveBrokerPhone = data.brokerPhone || (isBroker ? data.mobile : '') || null;
  const primaryPhone = effectiveOwnerPhone || effectiveBrokerPhone || data.mobile || '201092048333';
  const agentDisplay = data.agentName || (isBroker ? 'Authorized Broker' : 'Sierra Advisory Desk');

  const listingDocument = {
    code: listingCode,
    unitCode: listingCode,
    sbrCode: listingCode,
    ownerName: data.ownerName || (isBroker ? 'Direct Owner' : 'صاحب الإعلان'),
    brokerName: data.brokerName || (isBroker ? data.ownerName ?? null : null),
    agentName: agentDisplay,
    agent: agentDisplay,
    sourcedByAgent: agentDisplay,
    mobile: primaryPhone,
    ownerPhone: effectiveOwnerPhone,
    brokerPhone: effectiveBrokerPhone,
    status: 'active',
    publishStatus: 'PUBLISHABLE',
    verified: true,
    publishToClient: true,
    cmp: data.compound,
    compound: data.compound,
    locationArea: data.compound,
    city: geo.zone,
    latitude: geo.lat,
    longitude: geo.lng,
    type: data.propertyType,
    propertyType: data.propertyType,
    dealType: effectiveDealType,
    beds: data.beds,
    bedrooms: data.beds,
    baths: data.baths,
    bathrooms: data.baths,
    area: data.area,
    areaSqm: data.area,
    gardenArea: data.gardenArea ?? 0,
    price: data.price,
    egpM,
    usd,
    mode: data.mode,
    finishing: data.finishing,
    finishingType: data.finishing,
    ownerType: isBroker ? 'Broker' : 'Owner',
    advertiserType: isBroker ? 'Broker' : 'Direct Owner',
    sourceChannel: data.submitterType || (isBroker ? 'broker' : 'owner'),
    tag: isBroker ? 'Broker Direct Submission' : 'Owner Direct Submission',
    aiScore: 92,
    ago: 'Just now',
    img: (data.photos?.[0] || data.images?.[0]) || null,
    photos: data.photos?.length ? data.photos : data.images?.length ? data.images : [],
    images: data.images?.length ? data.images : data.photos?.length ? data.photos : [],
    tags: data.tags ?? [],
    comment: data.comment || data.rawText || '',
    description: data.comment || data.rawText || '',
    submittedAt: now,
    source: 'web-submission',
  };

  let effectiveListingCode = listingCode;
  let isMergeOperation = false;
  let existingRecord: Record<string, unknown> | null = null;

  try {
    const matches = await listRecords<Record<string, unknown>>('listings', {
      where: [{ column: 'code', op: 'eq', value: listingCode }],
      limit: 1,
    });
    if (matches && matches.length > 0) {
      existingRecord = matches[0];
    }
  } catch {
    // Non-fatal: let the workflow continue unless the caller explicitly wants a conflict resolution.
  }

  if (existingRecord) {
    const conflictAction = data.conflictAction ?? 'check_only';

    if (!conflictAction || conflictAction === 'check_only') {
      return {
        success: false,
        conflict: true,
        code: listingCode,
        message: `Conflict detected: A listing with code "${listingCode}" already exists in the Master Registry.`,
        existing: {
          id: existingRecord.id,
          code: existingRecord.code,
          compound: existingRecord.compound,
          price: existingRecord.price,
          areaSqm: existingRecord.areaSqm,
          bedrooms: existingRecord.bedrooms,
          bathrooms: existingRecord.bathrooms,
          propertyType: existingRecord.propertyType,
          dealType: existingRecord.dealType,
          finishingType: existingRecord.finishingType,
          ownerName: existingRecord.ownerName,
          ownerPhone: existingRecord.ownerPhone,
          brokerName: existingRecord.brokerName,
          brokerPhone: existingRecord.brokerPhone,
          agentName: existingRecord.agentName,
          updatedAt: existingRecord.updatedAt || existingRecord.createdAt,
          images: existingRecord.images || [],
        },
        incoming: {
          code: listingCode,
          compound: data.compound,
          price: data.price,
          areaSqm: data.area,
          bedrooms: data.beds,
          bathrooms: data.baths,
          propertyType: data.propertyType,
          dealType: effectiveDealType,
          finishingType: data.finishing,
          ownerName: data.ownerName,
          ownerPhone: effectiveOwnerPhone,
          brokerName: data.brokerName,
          brokerPhone: effectiveBrokerPhone,
          agentName: agentDisplay,
        },
      } satisfies ConflictWorkflowResult;
    }

    if (conflictAction === 'new_code') {
      let variantIndex = 2;
      let candidateCode = `${listingCode}-V${variantIndex}`;
      while (variantIndex < 10) {
        try {
          const vMatches = await listRecords<Record<string, unknown>>('listings', {
            where: [{ column: 'code', op: 'eq', value: candidateCode }],
            limit: 1,
          });
          if (!vMatches || vMatches.length === 0) break;
        } catch {
          break;
        }
        variantIndex += 1;
        candidateCode = `${listingCode}-V${variantIndex}`;
      }
      effectiveListingCode = candidateCode;
      listingDocument.code = candidateCode;
      listingDocument.unitCode = candidateCode;
      listingDocument.sbrCode = candidateCode;
    } else if (conflictAction === 'merge' || conflictAction === 'overwrite') {
      isMergeOperation = true;
    }
  }

  let id = effectiveListingCode;

  try {
    if (isMergeOperation && existingRecord) {
      const existingImages = Array.isArray(existingRecord.images) ? existingRecord.images : [];
      const incomingImages = data.photos?.length ? data.photos : data.images?.length ? data.images : [];
      const combinedImages = Array.from(new Set([...incomingImages, ...existingImages]));

      await updateRecord<Record<string, unknown>>('listings', String(existingRecord.id), {
        ...toListingColumns({
          ...listingDocument,
          code: String(existingRecord.code ?? effectiveListingCode),
          images: combinedImages,
          photos: combinedImages,
          updatedAt: now,
        }),
        title: `${data.propertyType} · ${data.compound}`,
      });
      id = String(existingRecord.id);
      bustInventoryCache();
    } else {
      const created = await insertRecord<{ id: string }>('listings', {
        ...toListingColumns(listingDocument),
        title: `${data.propertyType} · ${data.compound}`,
      });
      id = created.id;
      bustInventoryCache();
    }
  } catch (writeError) {
    if (process.env.NODE_ENV === 'production') {
      throw new FatalError(
        writeError instanceof Error ? writeError.message : 'Could not persist listing',
      );
    }
  }

  return {
    success: true,
    code: effectiveListingCode,
    id,
    isMerged: isMergeOperation,
    targetTab,
    listing: {
      ...listingDocument,
      id,
      mobile: '+201092048333',
    },
    conflict: false,
  };
}

async function syncSheetStep({
  code,
  id,
  listing,
  requestOrigin,
}: {
  code: string;
  id: string;
  listing: Record<string, unknown>;
  requestOrigin: string;
}) {
  'use step';

  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL || '';
  const siteOrigin = (
    configuredSite.startsWith('https://') && !configuredSite.includes('localhost')
      ? configuredSite
      : requestOrigin || 'https://example.com'
  ).replace(/\/+$/, '');

  const payload: WebsiteSheetSyncInput = {
    code,
    supabaseId: id,
    compound: String(listing.compound ?? ''),
    propertyType: String(listing.propertyType ?? ''),
    mode: listing.mode === 'rent' ? 'rent' : 'sale',
    beds: Number(listing.beds ?? 0),
    baths: Number(listing.baths ?? 0),
    area: Number(listing.area ?? 0),
    gardenArea: Number(listing.gardenArea ?? 0),
    price: Number(listing.price ?? 0),
    finishing: String(listing.finishing ?? ''),
    ownerName: String(listing.ownerName ?? 'Owner'),
    ownerType: String(listing.ownerType ?? 'Owner'),
    mobile: String(listing.mobile ?? '201092048333'),
    comment: String(listing.comment ?? ''),
    photos: Array.isArray(listing.photos) ? (listing.photos as string[]) : [],
    websiteUrl: `${siteOrigin}/property/${id}`,
  };

  try {
    return await syncWebsiteSubmissionToSheet(payload);
  } catch {
    return { ok: false, error: 'skipped' } as Awaited<ReturnType<typeof syncWebsiteSubmissionToSheet>>;
  }
}

async function appendExcelInventoryStep({
  code,
  id,
  compound,
  propertyType,
  mode,
  price,
  area,
  beds,
  baths,
  ownerName,
  ownerType,
  mobile,
  photos,
  comment,
}: {
  code: string;
  id: string;
  compound: string;
  propertyType: string;
  mode: 'sale' | 'rent';
  price: number;
  area: number;
  beds: number;
  baths: number;
  ownerName: string;
  ownerType: string;
  mobile: string;
  photos?: string[];
  comment?: string;
}) {
  'use step';

  try {
    await appendToExcelInventory({
      recordId: code,
      code,
      canonicalUnitId: id,
      compound,
      propertyType,
      operation: mode === 'rent' ? 'Rent' : 'Sale',
      price,
      areaSqm: area,
      bedrooms: beds,
      bathrooms: baths,
      contactName: ownerName || ownerType || 'Owner',
      contactPhone: mobile,
      sourceType: ownerType === 'Broker' ? 'broker' : 'owner',
      photoUrls: photos || [],
      description: comment || '',
    });
  } catch {
    // Non-fatal side effect.
  }
}

async function sendTelegramAlertStep({
  compound,
  propertyType,
  mode,
  price,
  beds,
  baths,
  area,
  finishing,
  ownerName,
  ownerType,
  mobile,
  code,
  comment,
  sheetRowLine,
}: {
  compound: string;
  propertyType: string;
  mode: 'sale' | 'rent';
  price: number;
  beds: number;
  baths: number;
  area: number;
  finishing?: string;
  ownerName: string;
  ownerType: string;
  mobile: string;
  code: string;
  comment?: string;
  sheetRowLine: string;
}) {
  'use step';

  try {
    const telegramText = `
<b>🏡 New Property Submission — Sierra Estates Easy Listing</b>
<b>Compound:</b> ${escapeTelegramHtml(compound)}
<b>Type:</b> ${escapeTelegramHtml(propertyType)} (${mode.toUpperCase()})
<b>Price:</b> EGP ${Number(price).toLocaleString('en-US')}
<b>Specs:</b> ${beds} Beds · ${baths} Baths · ${area} m²
<b>Finishing:</b> ${escapeTelegramHtml(finishing || 'Not specified')}
<b>Contact:</b> ${escapeTelegramHtml(ownerName)} (${ownerType || 'Owner'})
<b>Phone:</b> ${escapeTelegramHtml(mobile)}
<b>Code:</b> ${code}
<b>Notes:</b> ${escapeTelegramHtml(comment || 'None')}${sheetRowLine}
    `.trim();
    await sendTelegramMessage(telegramText);
  } catch {
    // Non-fatal side effect.
  }
}

async function enqueueWhatsAppStep({
  compound,
  propertyType,
  mode,
  price,
  beds,
  baths,
  area,
  ownerName,
  ownerType,
  mobile,
  code,
  sheetRowWa,
}: {
  compound: string;
  propertyType: string;
  mode: 'sale' | 'rent';
  price: number;
  beds: number;
  baths: number;
  area: number;
  ownerName: string;
  ownerType: string;
  mobile: string;
  code: string;
  sheetRowWa: string;
}) {
  'use step';

  const notifyNumber = process.env.LEAD_NOTIFY_WHATSAPP_NUMBER;
  if (!notifyNumber) return;

  try {
    await enqueueWhatsAppJob({
      purpose: 'general-outreach',
      toPhone: notifyNumber,
      body: `🏡 New Property Submitted via Easy Listing!\n📍 Compound: ${compound}\n🏠 Type: ${propertyType} (${mode.toUpperCase()})\n💰 Price: EGP ${Number(price).toLocaleString('en-US')}\n📐 Specs: ${beds}B / ${baths}B (${area} m²)\n👤 Owner/Broker: ${ownerName} (${ownerType || 'Owner'})\n📱 Contact: ${mobile}\n🔖 Code: ${code}${sheetRowWa}`,
    });
  } catch {
    // Non-fatal side effect.
  }
}

async function broadcastToAugustGroupStep({
  code,
  compound,
  propertyType,
  price,
  beds,
  area,
  mode,
}: {
  code: string;
  compound: string;
  propertyType: string;
  price: number;
  beds: number;
  area: number;
  mode: 'sale' | 'rent';
}) {
  'use step';

  try {
    await AugustOwnersAgentService.broadcastNewUnitToGroup({
      code,
      compound,
      propertyType,
      price,
      beds,
      area,
      mode,
    });
  } catch {
    // Non-fatal side effect.
  }
}

async function syncMasterInventoryStep({
  listing,
  code,
}: {
  listing: PersistedListing;
  code: string;
}) {
  'use step';
  try {
    await SheetsIntegrationService.syncUnitToMaster({
      unitCode: code,
      dealType: String(listing.mode === 'rent' ? 'Rent' : 'Resale'),
      compound: String(listing.compound || ''),
      unitType: String(listing.propertyType || ''),
      areaSqm: Number(listing.area) || undefined,
      bedrooms: Number(listing.beds) || undefined,
      bathrooms: Number(listing.baths) || undefined,
      priceEgp: Number(listing.price) || 0,
      ownerName: String(listing.ownerName || ''),
      ownerPhone: String(listing.mobile || ''),
      contactStatus: 'Not Contacted Yet',
      listingStatus: 'Pending Verification',
      sourcedByAgent: 'Website Easy Listing',
    });
  } catch {
    // Non-fatal side effect.
  }
}

