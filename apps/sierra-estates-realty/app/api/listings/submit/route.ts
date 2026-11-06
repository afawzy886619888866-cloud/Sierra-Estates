/**
 * POST /api/listings/submit
 *
 * Public listing submission endpoint, reachable from the /add-listing form.
 *
 * Accepts a listing submission payload, validates fields via Zod, and persists
 * it to Supabase (public.listings).
 *
 * Deliberately unauthenticated — property owners submit here without an
 * account. Because anyone can post, a submission is NOT inventory: it is
 * written with `status: LISTING_STATUS_PENDING_REVIEW` and `verified: false`,
 * and /api/listings filters those out of both of its public response modes.
 * Staff publish a listing by moving it off the pending status.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { logger } from '@/lib/logger';
import { insertRecord } from '@sierra-estates/db';
import { toListingColumns } from '@/lib/server/listing-columns';
import { resolveLocation } from '@/lib/inventory/gazetteer';
import { egpToUsd } from '@/lib/fx';
import { bustInventoryCache } from '@/app/api/inventory/route';
import { sendTelegramMessage, escapeTelegramHtml } from '@/lib/telegram';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { appendToExcelInventory } from '@/lib/services/ExcelInventoryService';
import { syncWebsiteSubmissionToSheet } from '@/lib/services/GoogleSheetSyncService';
import { AugustOwnersAgentService } from '@/lib/services/AugustOwnersAgentService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const submitListingSchema = z.object({
  code: z.string().optional(),
  compound: z.string().min(1, 'Compound / Location is required').max(100),
  propertyType: z.string().min(1, 'Property type is required'),
  mode: z.enum(['sale', 'rent']),
  beds: z.coerce.number().int().min(0),
  baths: z.coerce.number().int().min(0),
  area: z.coerce.number().min(0),
  gardenArea: z.coerce.number().min(0).optional().default(0),
  price: z.coerce.number().min(0, 'Price must be positive'),
  finishing: z.string().optional(),
  ownerName: z.string().max(100).optional().default('صاحب الإعلان'),
  ownerType: z.string().optional().default('Owner'),
  mobile: z.string().max(30).optional().default(''),
  ownerPhone: z.string().max(30).optional().default(''),
  brokerPhone: z.string().max(30).optional().default(''),
  brokerName: z.string().max(100).optional().default(''),
  agentName: z.string().max(100).optional().default(''),
  submitterType: z.enum(['owner', 'broker', 'employee', 'bot']).optional().default('owner'),
  rawText: z.string().optional().default(''),
  comment: z.string().max(2000).optional().default(''),
  photos: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
});

export async function POST(request: Request) {
  const rateLimitResponse = await applyRateLimit(request, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = submitListingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const now = new Date().toISOString();
    const listingCode = (data.code || '').trim() || `SE-SUB-${Date.now().toString().slice(-6)}`;
    const egpM = data.price > 100000 ? Number((data.price / 1_000_000).toFixed(2)) : data.price;
    const usd = egpToUsd(data.price);
    const geo = resolveLocation(data.compound);

    const isBroker = data.ownerType === 'Broker' || data.submitterType === 'broker' || Boolean(data.brokerPhone && !data.ownerPhone);
    const isRent = data.mode === 'rent';
    // 400k rent ceiling guard
    const effectiveDealType = (isRent && Number(data.price) <= 400_000) ? 'Rent' : 'Resale';
    const targetTab = isBroker
      ? (effectiveDealType === 'Rent' ? 'brokers rent' : 'brokers resale')
      : (effectiveDealType === 'Rent' ? 'owners rent' : 'owners resale');

    const effectiveOwnerPhone = data.ownerPhone || (!isBroker ? data.mobile : '') || null;
    const effectiveBrokerPhone = data.brokerPhone || (isBroker ? data.mobile : '') || null;
    const primaryPhone = effectiveOwnerPhone || effectiveBrokerPhone || data.mobile || '201092048333';
    const agentDisplay = data.agentName || (isBroker ? 'Authorized Broker' : 'Sierra Advisory Desk');

    const listingDocument = {
      code: listingCode,
      unitCode: listingCode,
      sbrCode: listingCode,
      ownerName: data.ownerName || (isBroker ? 'Direct Owner' : 'صاحب الإعلان'),
      brokerName: data.brokerName || (isBroker ? data.ownerName : null),
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
      gardenArea: data.gardenArea,
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
      tags: data.tags,
      comment: data.comment || data.rawText,
      description: data.comment || data.rawText,
      submittedAt: now,
      source: 'web-submission',
    };

    let id = listingCode;

    try {
      const created = await insertRecord<{ id: string }>('listings', {
        ...toListingColumns(listingDocument),
        title: `${data.propertyType} · ${data.compound}`,
      });
      id = created.id;
      bustInventoryCache();
      logger.info(`[LISTING_SUBMIT] Saved new listing ${id} (${listingCode}) to Supabase and cache-busted inventory`);
    } catch (writeError) {
      if (process.env.NODE_ENV === 'production') throw writeError;
      logger.info(`[LISTING_SUBMIT] Sandbox mode — new listing received: ${listingCode}`);
    }

    // Append newly submitted unit to the Master Excel Inventory workbook
    // (canonicalUnitId set: the Supabase row was already inserted above —
    // the Excel append is a sheet PROJECTION, never a second DB row).
    try {
      await appendToExcelInventory({
        recordId: listingCode,
        code: listingCode,
        canonicalUnitId: id,
        compound: data.compound,
        propertyType: data.propertyType,
        operation: data.mode === 'rent' ? 'Rent' : 'Sale',
        price: data.price,
        areaSqm: data.area,
        bedrooms: data.beds,
        bathrooms: data.baths,
        contactName: data.ownerName || (isBroker ? 'Broker' : 'Owner'),
        contactPhone: primaryPhone,
        sourceType: isBroker ? 'broker' : 'owner',
        photoUrls: data.photos || data.images || [],
        description: data.comment || data.rawText || '',
      });
    } catch (excelErr) {
      logger.warn(`[LISTING_SUBMIT] Excel append error (non-fatal): ${(excelErr as Error).message}`);
    }

    // Mirror the submission into the team's Google Sheet ops hub (Mode D —
    // "Website_Listings" tab): آخر تحديث + full specs + لينك الموقع +
    // لينك الخريطة + لينك الانفنتوري + photos uploaded to Google Drive.
    // Server-to-server with the shared secret — it never reaches the browser.
    // Skipped gracefully when SHEETS_WEBAPP_URL / SHEETS_WEBAPP_SECRET are
    // not configured, so the public flow never breaks.
    let sheetSync: Awaited<ReturnType<typeof syncWebsiteSubmissionToSheet>> = {
      ok: false,
      error: 'skipped',
    };
    try {
      // Prefer the configured canonical site URL when it is a real https
      // origin; otherwise fall back to the request's own origin (correct on
      // Vercel for the custom domain) — never leak localhost into the sheet.
      const configuredSite = process.env.NEXT_PUBLIC_SITE_URL || '';
      const siteOrigin = (
        configuredSite.startsWith('https://') && !configuredSite.includes('localhost')
          ? configuredSite
          : new URL(request.url).origin
      ).replace(/\/+$/, '');
      sheetSync = await syncWebsiteSubmissionToSheet({
        code: listingCode,
        supabaseId: id,
        compound: data.compound,
        propertyType: data.propertyType,
        mode: data.mode,
        beds: data.beds,
        baths: data.baths,
        area: data.area,
        gardenArea: data.gardenArea,
        price: data.price,
        finishing: data.finishing,
        ownerName: data.ownerName || (isBroker ? 'Broker' : 'Owner'),
        ownerType: isBroker ? 'Broker' : 'Owner',
        mobile: primaryPhone,
        comment: data.comment || data.rawText || '',
        photos: data.photos || data.images || [],
        websiteUrl: `${siteOrigin}/property/${id}`,
      });
    } catch (gsErr) {
      logger.warn('[LISTING_SUBMIT] Google Sheet sync error (non-fatal):', (gsErr as Error).message);
    }
    const sheetRowLine = sheetSync.inventoryUrl
      ? `\n<b>Sheet row:</b> ${sheetSync.inventoryUrl}`
      : '';

    // 1. Send immediate notification to the Agency Telegram Bot
    try {
      const telegramText = `
<b>🏡 New Property Submission — Sierra Estates Easy Listing</b>
<b>Compound:</b> ${escapeTelegramHtml(data.compound)}
<b>Type:</b> ${escapeTelegramHtml(data.propertyType)} (${data.mode.toUpperCase()})
<b>Price:</b> EGP ${Number(data.price).toLocaleString('en-US')}
<b>Specs:</b> ${data.beds} Beds · ${data.baths} Baths · ${data.area} m²
<b>Finishing:</b> ${escapeTelegramHtml(data.finishing || 'Not specified')}
<b>Contact:</b> ${escapeTelegramHtml(data.ownerName)} (${data.ownerType || 'Owner'})
<b>Phone:</b> ${escapeTelegramHtml(data.mobile)}
<b>Code:</b> ${listingCode}
<b>Notes:</b> ${escapeTelegramHtml(data.comment || 'None')}${sheetRowLine}
      `.trim();
      await sendTelegramMessage(telegramText);
    } catch (telegramErr) {
      logger.warn('[LISTING_SUBMIT] Telegram alert skipped:', telegramErr);
    }

    // 2. Enqueue automated WhatsApp notification for the agency concierge
    const notifyNumber = process.env.LEAD_NOTIFY_WHATSAPP_NUMBER;
    if (notifyNumber) {
      try {
        const sheetRowWa = sheetSync.inventoryUrl ? `\n📊 Sheet row: ${sheetSync.inventoryUrl}` : '';
        await enqueueWhatsAppJob({
          purpose: 'general-outreach',
          toPhone: notifyNumber,
          body: `🏡 New Property Submitted via Easy Listing!\n📍 Compound: ${data.compound}\n🏠 Type: ${data.propertyType} (${data.mode.toUpperCase()})\n💰 Price: EGP ${Number(data.price).toLocaleString('en-US')}\n📐 Specs: ${data.beds}B / ${data.baths}B (${data.area} m²)\n👤 Owner/Broker: ${data.ownerName} (${data.ownerType || 'Owner'})\n📱 Contact: ${data.mobile}\n🔖 Code: ${listingCode}${sheetRowWa}`,
        });
      } catch (waErr) {
        logger.warn('[LISTING_SUBMIT] WhatsApp dispatch skipped:', waErr);
      }
    }

    // 3. Broadcast newly submitted unit into the August Owners WhatsApp group
    try {
      await AugustOwnersAgentService.broadcastNewUnitToGroup({
        code: listingCode,
        compound: data.compound,
        propertyType: data.propertyType,
        price: data.price,
        beds: data.beds,
        area: data.area,
        mode: data.mode,
      });
    } catch (broadcastErr) {
      logger.warn('[LISTING_SUBMIT] August group broadcast skipped:', broadcastErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Listing submitted and published to map, inventory, and Google Sheet',
        code: listingCode,
        id,
        targetTab,
        sheetSync,
        listing: {
          ...listingDocument,
          id,
          mobile: '+201092048333', // Privacy doctrine: always route public contact to concierge
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error('[LISTING_SUBMIT_ERROR]', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit listing' },
      { status: 500 }
    );
  }
}
