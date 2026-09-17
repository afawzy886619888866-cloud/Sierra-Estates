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
import { LISTING_STATUS_PENDING_REVIEW } from '@/lib/models/schema';
import { sendTelegramMessage, escapeTelegramHtml } from '@/lib/telegram';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { appendToExcelInventory } from '@/lib/services/ExcelInventoryService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const submitListingSchema = z.object({
  compound: z.string().min(1, 'Compound / Location is required').max(100),
  propertyType: z.string().min(1, 'Property type is required').default('Apartment'),
  mode: z.enum(['sale', 'rent']).default('sale'),
  beds: z.coerce.number().int().min(0).default(3),
  baths: z.coerce.number().int().min(0).default(2),
  area: z.coerce.number().min(0).default(150),
  gardenArea: z.coerce.number().min(0).optional().default(0),
  price: z.coerce.number().min(0, 'Price must be positive'),
  finishing: z.string().optional().default('Fully Furnished'),
  ownerName: z.string().min(1, 'Owner name is required').max(100),
  ownerType: z.string().optional().default('Owner'),
  mobile: z.string().min(6, 'Valid contact mobile is required').max(30),
  comment: z.string().max(2000).optional().default(''),
  photos: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
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
    const listingCode = `SE-SUB-${Date.now().toString().slice(-6)}`;
    const egpM = data.price > 100000 ? Number((data.price / 1_000_000).toFixed(2)) : data.price;
    const usd = Math.round(data.price / 50);

    const listingDocument = {
      code: listingCode,
      ownerName: data.ownerName,
      mobile: data.mobile,
      status: LISTING_STATUS_PENDING_REVIEW,
      verified: false,
      cmp: data.compound,
      compound: data.compound,
      zone: data.compound.toLowerCase().includes('madinaty') ? 'Madinaty' : '5th Settlement',
      type: data.propertyType,
      beds: data.beds,
      baths: data.baths,
      area: data.area,
      gardenArea: data.gardenArea,
      price: data.price,
      egpM,
      usd,
      mode: data.mode,
      finishing: data.finishing,
      ownerType: 'Owner',
      tag: 'Direct Submission',
      // An unreviewed submission is not ranked inventory: it scores 0 until a
      // human grades it, and stays out of the client feed either way.
      aiScore: 0,
      publishToClient: false,
      agent: `${data.ownerName} (${data.ownerType || 'Owner'})`,
      ago: 'Just now',
      img: data.photos?.[0] || data.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
      photos: data.photos?.length ? data.photos : data.images?.length ? data.images : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80'],
      images: data.images?.length ? data.images : data.photos?.length ? data.photos : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80'],
      comment: data.comment,
      submittedAt: now,
      source: 'web-submission',
    };

    let id = listingCode;

    try {
      // houyez_listings and listings are one table now, so this is a single
      // insert rather than the old dual-write. `title` is NOT NULL in
      // Postgres and the public form has no title field, so it is derived the
      // same way the seed envelope derives one.
      const created = await insertRecord<{ id: string }>('listings', {
        ...toListingColumns(listingDocument),
        title: `${data.propertyType} · ${data.compound}`,
      });
      id = created.id;
      logger.info(`[LISTING_SUBMIT] Saved new listing ${id} (${listingCode}) to Supabase`);
    } catch (writeError) {
      // Local/sandbox development without Supabase credentials keeps the form
      // flow working; production must surface the failure instead.
      if (process.env.NODE_ENV === 'production') throw writeError;
      logger.info(`[LISTING_SUBMIT] Sandbox mode — new listing received: ${listingCode}`);
    }

    // Append newly submitted unit to the Master Excel Inventory workbook
    try {
      await appendToExcelInventory({
        recordId: listingCode,
        code: listingCode,
        compound: data.compound,
        propertyType: data.propertyType,
        operation: data.mode === 'rent' ? 'Rent' : 'Sale',
        price: data.price,
        areaSqm: data.area,
        bedrooms: data.beds,
        bathrooms: data.baths,
        contactName: data.ownerName,
        contactPhone: data.mobile,
        sourceType: data.ownerType === 'Broker' ? 'broker' : 'owner',
        photoUrls: data.photos || data.images || [],
        description: data.comment,
      });
    } catch (excelErr) {
      logger.warn(`[LISTING_SUBMIT] Excel append error (non-fatal): ${(excelErr as Error).message}`);
    }

    // 1. Send immediate notification to the Agency Telegram Bot
    try {
      const telegramText = `
<b>🏡 New Property Submission — Sierra Estates Easy Listing</b>
<b>Compound:</b> ${escapeTelegramHtml(data.compound)}
<b>Type:</b> ${escapeTelegramHtml(data.propertyType)} (${data.mode.toUpperCase()})
<b>Price:</b> EGP ${Number(data.price).toLocaleString('en-US')}
<b>Specs:</b> ${data.beds} Beds · ${data.baths} Baths · ${data.area} m²
<b>Finishing:</b> ${escapeTelegramHtml(data.finishing || 'Standard')}
<b>Contact:</b> ${escapeTelegramHtml(data.ownerName)} (${data.ownerType || 'Owner'})
<b>Phone:</b> ${escapeTelegramHtml(data.mobile)}
<b>Code:</b> ${listingCode}
<b>Notes:</b> ${escapeTelegramHtml(data.comment || 'None')}
      `.trim();
      await sendTelegramMessage(telegramText);
    } catch (telegramErr) {
      logger.warn('[LISTING_SUBMIT] Telegram alert skipped:', telegramErr);
    }

    // 2. Enqueue automated WhatsApp notification for the agency concierge
    const notifyNumber = process.env.LEAD_NOTIFY_WHATSAPP_NUMBER;
    if (notifyNumber) {
      try {
        await enqueueWhatsAppJob({
          purpose: 'general-outreach',
          toPhone: notifyNumber,
          body: `🏡 New Property Submitted via Easy Listing!\n📍 Compound: ${data.compound}\n🏠 Type: ${data.propertyType} (${data.mode.toUpperCase()})\n💰 Price: EGP ${Number(data.price).toLocaleString('en-US')}\n📐 Specs: ${data.beds}B / ${data.baths}B (${data.area} m²)\n👤 Owner/Broker: ${data.ownerName} (${data.ownerType || 'Owner'})\n📱 Contact: ${data.mobile}\n🔖 Code: ${listingCode}`,
        });
      } catch (waErr) {
        logger.warn('[LISTING_SUBMIT] WhatsApp dispatch skipped:', waErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Listing submitted successfully and queued for verification',
        code: listingCode,
        id,
        listing: { ...listingDocument, id },
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
