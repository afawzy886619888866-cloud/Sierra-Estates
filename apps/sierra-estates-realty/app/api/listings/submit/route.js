 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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

export async function POST(request) {
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
    const egpM = data.price > 100000 ? Number((data.price / 1000000).toFixed(2)) : data.price;
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
      img: _optionalChain([data, 'access', _ => _.photos, 'optionalAccess', _2 => _2[0]]) || _optionalChain([data, 'access', _3 => _3.images, 'optionalAccess', _4 => _4[0]]) || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
      photos: _optionalChain([data, 'access', _5 => _5.photos, 'optionalAccess', _6 => _6.length]) ? data.photos : _optionalChain([data, 'access', _7 => _7.images, 'optionalAccess', _8 => _8.length]) ? data.images : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80'],
      images: _optionalChain([data, 'access', _9 => _9.images, 'optionalAccess', _10 => _10.length]) ? data.images : _optionalChain([data, 'access', _11 => _11.photos, 'optionalAccess', _12 => _12.length]) ? data.photos : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80'],
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
      const created = await insertRecord('listings', {
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
  } catch (error) {
    logger.error('[LISTING_SUBMIT_ERROR]', _optionalChain([error, 'optionalAccess', _13 => _13.message]) || error);
    return NextResponse.json(
      { success: false, error: _optionalChain([error, 'optionalAccess', _14 => _14.message]) || 'Failed to submit listing' },
      { status: 500 }
    );
  }
}
