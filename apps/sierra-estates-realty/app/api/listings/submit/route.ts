/**
 * POST /api/listings/submit
 *
 * Public listing submission endpoint, reachable from the /add-listing form.
 *
 * Accepts a listing submission payload, validates fields via Zod, and persists
 * it to Firestore (and the Google Sheets sync queue).
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
import { getAdminDb } from '@/lib/firebase-admin';
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

    const db = await getAdminDb();
    let id = listingCode;

    if (db) {
      const docRef = await db.collection('houyez_listings').add(listingDocument);
      id = docRef.id;
      await db.collection('listings').doc(id).set({ ...listingDocument, id }, { merge: true });
      logger.info(`[LISTING_SUBMIT] Saved new listing ${id} (${listingCode}) to Firestore`);
    } else {
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
  } catch (error: any) {
    logger.error('[LISTING_SUBMIT_ERROR]', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit listing' },
      { status: 500 }
    );
  }
}
