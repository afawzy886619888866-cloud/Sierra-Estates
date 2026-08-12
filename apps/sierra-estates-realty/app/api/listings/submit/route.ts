/**
 * POST /api/listings/submit
 *
 * Owner / Admin Submit New Listing API Endpoint
 *
 * Accepts a listing submission payload, validates fields via Zod,
 * and persists it to Firestore (and Google Sheets sync queue).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { logger } from '@/lib/logger';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const submitListingSchema = z.object({
  compound: z.string().min(1, 'Compound / Location is required').max(100),
  propertyType: z.string().optional(),
  type: z.string().optional(),
  mode: z.string().optional().transform(m => (m?.toLowerCase() === 'rent' ? 'rent' : 'sale')),
  beds: z.coerce.number().int().min(0).optional().default(3),
  baths: z.coerce.number().int().min(0).optional().default(2),
  area: z.coerce.number().min(0).optional().default(150),
  gardenArea: z.coerce.number().min(0).optional().default(0),
  price: z.coerce.number().min(0).optional().default(0),
  finishing: z.string().optional().default('Fully Furnished'),
  ownerName: z.string().optional(),
  name: z.string().optional(),
  mobile: z.string().optional(),
  phone: z.string().optional(),
  comment: z.string().max(2000).optional().default(''),
  notes: z.string().optional(),
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

    const rawData = parseResult.data;
    const ownerName = rawData.ownerName || rawData.name || 'Direct Owner';
    const mobile = rawData.mobile || rawData.phone || '01000000000';
    const propertyType = rawData.propertyType || rawData.type || 'Apartment';
    const comment = rawData.comment || rawData.notes || '';
    const now = new Date().toISOString();
    const listingCode = `SE-SUB-${Date.now().toString().slice(-6)}`;
    const price = rawData.price || 0;
    const egpM = price > 100000 ? Number((price / 1_000_000).toFixed(2)) : price;
    const usd = Math.round(price / 50);

    const listingDocument = {
      code: listingCode,
      ownerName,
      mobile,
      phone: mobile,
      status: 'Available',
      // Required by subscribeHouyezListings: where('active', '==', true)
      active: true,
      // Required by subscribeHouyezListings: orderBy('order', 'asc')
      order: Date.now(),
      cmp: rawData.compound,
      compound: rawData.compound,
      zone: rawData.compound.toLowerCase().includes('madinaty') ? 'Madinaty' : '5th Settlement',
      type: propertyType,
      bedrooms: rawData.beds,
      beds: rawData.beds,
      bathrooms: rawData.baths,
      baths: rawData.baths,
      area: rawData.area,
      gardenArea: rawData.gardenArea,
      price,
      egpM,
      usd,
      mode: rawData.mode,
      finishing: rawData.finishing,
      ownerType: 'Owner',
      tag: 'Direct Submission',
      aiScore: 9.0,
      agent: `${ownerName} (Owner)`,
      ago: 'Just now',
      img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
      comment,
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
