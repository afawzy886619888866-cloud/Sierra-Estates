/**
 * POST /api/easy-listing
 *
 * Easy Listing — the smart coding & routing endpoint.
 *
 * Input (the exact envelope a data-entry clerk / owner / broker pastes):
 *   { role, name, phone, details }        — role accepts موظف/مالك/وسيط or
 *                                            the AGENT/OWNER/BROKER enums.
 *
 * Routing (see lib/server/easy-listing.ts for the full contract):
 *   AGENT | OWNER → MAIN_INVENTORY — staged into public.listings with
 *                   status 'Pending Review' (the same moderation gate
 *                   /api/listings/submit uses), plus generated Facebook /
 *                   PropertyFinder ad copy.
 *   BROKER       → MAP_SHEET — staged into public.map_sheet_entries
 *                   (migration 018), NO ads, and a WhatsApp photo request
 *                   is enqueued to the broker via whatsapp_queue so the bot
 *                   can collect photos when a serious client appears.
 *
 * Honesty contract: the parser never invents fields — anything the text
 * omits comes back as null with a parse warning, and the internal code uses
 * UNK/FX segments instead of fabricated values. The listing insert is NOT a
 * publish: 'Pending Review' rows stay out of the public feed until staff
 * verify them (isPubliclyVisibleListingStatus).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { insertRecord, updateRecord } from '@sierra-estates/db';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { toListingColumns } from '@/lib/server/listing-columns';
import { LISTING_STATUS_PENDING_REVIEW } from '@/lib/models/schema';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';
import {
  parseEasyListing,
  toPayload,
  summarizeAr,
  EasyListingValidationError,
} from '@/lib/server/easy-listing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const easyListingSchema = z.object({
  role: z.string().min(2, 'role (الصفة) is required'),
  name: z.string().min(2, 'name (الاسم) is required').max(120),
  phone: z.string().min(8, 'phone (التليفون) is required').max(30),
  details: z.string().min(5, 'details (تفاصيل الوحدة) must be at least 5 characters').max(4000),
});

/** Arabic photo-request message the bot sends the broker (role-only copy). */
function brokerPhotoRequestMessage(name: string, code: string): string {
  return [
    `مرحباً ${name} 👋`,
    `معاك بوت Sierra Blu Realty — تم تسجيل الوحدة ${code} على شيت الخريطة (MAP_SHEET).`,
    ``,
    `عند وجود عميل جاد على الوحدة، سنحتاج منك:`,
    `📷 3 صور على الأقل للوحدة (واجهة + داخل)`,
    `📍 اسم الكمبوند والدور بالتحديد`,
    `💵 آخر سعر معتمد`,
    ``,
    `شكراً لتعاونك 🙏`,
  ].join('\n');
}

export async function POST(request: Request) {
  const rateLimitResponse = await applyRateLimit(request, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = easyListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Validation failed — الحقول المطلوبة: role / name / phone / details',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const result = (() => {
    try {
      return { ok: true as const, value: parseEasyListing(parsed.data) };
    } catch (e) {
      if (e instanceof EasyListingValidationError) return { ok: false as const, error: e.message };
      throw e;
    }
  })();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const r = result.value;
  const payload = toPayload(r);
  const now = new Date().toISOString();

  const base = {
    ok: true as const,
    internal_code: r.internal_code,
    routing_destination: r.routing_destination,
    summary_ar: summarizeAr(r),
    parse_warnings: r.parse_warnings,
    ads: r.ads,
    payload,
  };

  /* ── AGENT / OWNER → MAIN_INVENTORY (public.listings, Pending Review) ── */
  if (r.routing_destination === 'MAIN_INVENTORY') {
    const d = r.property_details;
    const doc = {
      code: r.internal_code,
      title: `${d.unit_type ?? 'Unit'} · ${d.compound ?? d.region ?? 'Unknown location'}`,
      compound: d.compound ?? d.region ?? 'Unknown',
      locationArea: d.region ?? 'New Cairo',
      city: 'Cairo',
      propertyType: d.unit_type ?? 'Apartment',
      dealType: d.deal_type,
      price: d.price_egp ?? 0,
      priceCurrency: 'EGP',
      bedrooms: d.bedrooms ?? 0,
      bathrooms: d.bathrooms ?? 0,
      areaSqm: d.area_m2 ?? 0,
      ...(r.floor_label ? { floorLabel: r.floor_label } : {}),
      ...(r.floor_number != null ? { floorNumber: r.floor_number } : {}),
      ...(r.property_details.price_egp == null
        ? {}
        : { pricePerSqm: Math.round(d.price_egp! / Math.max(1, d.area_m2 ?? 1)) }),
      status: LISTING_STATUS_PENDING_REVIEW,
      description: parsed.data.details,
      // AGENT rows keep the agent name; OWNER rows use the owner columns.
      ...(r.role === 'AGENT'
        ? { agentName: r.uploader_name }
        : { ownerName: r.uploader_name, ownerPhone: r.uploader_phone }),
      sourceChannel: 'easy-listing',
      syncSource: 'easy-listing',
      rawData: {
        easy_listing: {
          uploader_role: r.role,
          uploader_name: r.uploader_name,
          uploader_phone: r.uploader_phone,
          internal_code: r.internal_code,
          floor_label: r.floor_label,
          parse_warnings: r.parse_warnings,
          deal_type: d.deal_type,
          raw_text: parsed.data.details,
          submitted_at: now,
        },
      },
    };

    try {
      const created = await insertRecord<{ id: string }>('listings', {
        ...toListingColumns(doc),
        title: doc.title, // NOT NULL in Postgres; toListingColumns may route it
      });
      logger.info(
        `[EASY_LISTING] ${r.role} ${r.uploader_name} → MAIN_INVENTORY ${r.internal_code} (${created?.id ?? 'id?'})`,
      );
      return NextResponse.json({
        ...base,
        persisted: { table: 'listings', id: created?.id ?? null, status: LISTING_STATUS_PENDING_REVIEW },
      });
    } catch (writeError) {
      // Same degradation contract as /api/listings/submit: sandbox dev keeps
      // working without Supabase credentials; production must surface it.
      if (process.env.NODE_ENV === 'production') {
        logger.error('[EASY_LISTING] listings insert failed:', writeError);
        return NextResponse.json(
          { ok: false, error: 'Failed to save the listing to MAIN_INVENTORY' },
          { status: 502 },
        );
      }
      logger.info(
        `[EASY_LISTING] Sandbox mode — parsed ${r.internal_code} for ${r.uploader_name} (not persisted)`,
      );
      return NextResponse.json({ ...base, persisted: null });
    }
  }

  /* ── BROKER → MAP_SHEET (public.map_sheet_entries + photo request) ── */
  try {
    const entry = await insertRecord<{ id: string }>('map_sheet_entries', {
      internalCode: r.internal_code,
      uploaderRole: r.role,
      uploaderName: r.uploader_name,
      uploaderPhone: r.uploader_phone,
      region: r.property_details.region,
      compound: r.property_details.compound,
      unitType: r.property_details.unit_type,
      floorLabel: r.floor_label,
      areaM2: r.property_details.area_m2,
      bedrooms: r.property_details.bedrooms,
      bathrooms: r.property_details.bathrooms,
      priceEgp: r.property_details.price_egp,
      dealType: r.property_details.deal_type,
      rawText: parsed.data.details,
      photoRequestStatus: 'not_requested',
    });

    // Ask the broker for photos via the WhatsApp queue (drained by the cron
    // dispatcher). Failure to enqueue must not lose the map-sheet row — the
    // entry simply stays 'not_requested' and the response carries the warning.
    let photoRequest: 'queued' | 'failed' = 'failed';
    try {
      await enqueueWhatsAppJob({
        purpose: 'general-outreach',
        toPhone: r.uploader_phone,
        toName: r.uploader_name,
        body: brokerPhotoRequestMessage(r.uploader_name, r.internal_code),
        metadata: {
          kind: 'easy-listing-photo-request',
          internal_code: r.internal_code,
          map_sheet_entry_id: entry?.id ?? null,
        },
      });
      photoRequest = 'queued';
      if (entry?.id) {
        await updateRecord('map_sheet_entries', entry.id, {
          photoRequestStatus: 'requested',
          photoRequestQueuedAt: now,
        });
      }
    } catch (queueError) {
      logger.warn('[EASY_LISTING] photo-request enqueue failed (non-fatal):', queueError);
    }

    logger.info(
      `[EASY_LISTING] BROKER ${r.uploader_name} → MAP_SHEET ${r.internal_code} (photo request: ${photoRequest})`,
    );
    return NextResponse.json({
      ...base,
      persisted: {
        table: 'map_sheet_entries',
        id: entry?.id ?? null,
        photo_request: photoRequest,
      },
    });
  } catch (writeError) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[EASY_LISTING] map_sheet_entries insert failed:', writeError);
      return NextResponse.json(
        { ok: false, error: 'Failed to save the broker entry to MAP_SHEET' },
        { status: 502 },
      );
    }
    logger.info(
      `[EASY_LISTING] Sandbox mode — parsed ${r.internal_code} for broker ${r.uploader_name} (not persisted)`,
    );
    return NextResponse.json({ ...base, persisted: null });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/easy-listing',
    method: 'POST',
    input: {
      role: 'AGENT | OWNER | BROKER (موظف / مالك / وسيط)',
      name: 'uploader name',
      phone: 'Egyptian mobile 01xxxxxxxxx',
      details: 'free text — المنطقة، الكمبوند، النوع، الدور، المساحة، السعر',
    },
    code_format: '[REGION]-[COMPOUND]-[UNIT_TYPE]-[FLOOR]-[AREA]M — e.g. NC-MIV-APT-F2-175M',
    routing: {
      AGENT: 'MAIN_INVENTORY + Facebook/PropertyFinder ads',
      OWNER: 'MAIN_INVENTORY + Facebook/PropertyFinder ads',
      BROKER: 'MAP_SHEET + WhatsApp photo request (no ads)',
    },
  });
}
