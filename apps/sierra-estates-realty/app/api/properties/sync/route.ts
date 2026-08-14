import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/server/firebase-admin';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';
import {
  propertyFinderService,
  type PropertyFinderListing,
} from '@/lib/propertyFinder-service';

const MAX_BATCH_OPERATIONS = 450;

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toDate(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return Timestamp.now();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return Timestamp.now();
  }

  return Timestamp.fromDate(parsed);
}

function getListingId(property: PropertyFinderListing, fallbackIndex: number) {
  const rawId = property.id ?? property.reference_number;
  if (typeof rawId === 'string' && rawId.trim()) return rawId;
  if (typeof rawId === 'number') return String(rawId);
  return `pf_${Date.now()}_${fallbackIndex}`;
}

function getPriceValue(price: PropertyFinderListing['price']) {
  if (typeof price === 'number') return price;
  return price?.value ?? null;
}

function getImages(property: PropertyFinderListing) {
  const images = property.images?.map((image) => image.url).filter(Boolean);
  if (images?.length) return images;

  return property.photos?.map((photo) => photo.url).filter(Boolean) || [];
}

function getRentPeriods(property: PropertyFinderListing) {
  if (typeof property.price === 'number') return [];
  if (!property.price?.period) return [];

  const period = property.price.period.trim().toLowerCase();
  if (!period) return [];

  return [period.charAt(0).toUpperCase() + period.slice(1)];
}

function mapProperty(property: PropertyFinderListing) {
  const latitude = property.location?.latitude ?? property.location?.coordinates?.lat ?? null;
  const longitude = property.location?.longitude ?? property.location?.coordinates?.lng ?? null;
  const priceValue = getPriceValue(property.price);

  return {
    code: String(property.reference_number || property.id || ''),
    timestamp: toDate(property.created_at || property.updated_at || property.publishedDate),
    name: property.agent?.name || 'Unknown',
    mobile: property.agent?.phone || '',
    availability:
      typeof property.isAvailable === 'boolean'
        ? property.isAvailable
          ? 'Available'
          : 'Unavailable'
        : property.status || 'Available',
    bedrooms: toNumber(property.bedrooms),
    location: property.city?.name || property.location?.name || 'Unknown',
    unitPrice: priceValue,
    furnitureStatus: property.furnish?.name || null,
    propertyType:
      typeof property.type === 'string' ? property.type : property.type?.name || 'Property',
    owner: property.postedBy === 'agent' ? 'Agent' : 'Owner',
    rentPeriodType: property.offering_type === 'rent' ? getRentPeriods(property) : [],
    agentName: property.agent?.name || 'Unknown',
    latitude,
    longitude,
    images: getImages(property),
    featured: false,
    // Inventory Domain Service (additive, non-breaking): `syncSource` and
    // `lastSyncAt` already exist on the canonical Unit schema (lib/models/schema.ts)
    // but were never populated by this route. Filled in here without changing any
    // existing field name or value this route already writes.
    //
    // `dupeCheckHash` is intentionally NOT set here: PropertyFinderListing has no
    // `area`/size field anywhere in this route's source type, and the dedupe
    // fingerprint requires area to be meaningful. Faking a value would produce a
    // wrong/lossy dedupe key, which is worse than leaving it unset. Tracked in
    // FUTURE_PLAN/04 as a follow-up once the Property Finder payload is confirmed
    // to expose area (or a size field it should be mapped from).
    syncSource: 'property-finder' as const,
    lastSyncAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

export async function POST(request: NextRequest) {
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {

    const body = await request.json();
    const cityId = body?.cityId;

    if (!cityId) {
      return NextResponse.json(
        { error: 'Missing required field: cityId' },
        { status: 400 }
      );
    }

    const properties = await propertyFinderService.syncPropertiesForCity(cityId);
    if (!properties.length) {
      return NextResponse.json(
        {
          success: true,
          syncedCount: 0,
          failedCount: 0,
          message: 'No new Portfolio Assets found',
        },
        { status: 200 }
      );
    }

    let batch = adminDb.batch();
    let operationsInBatch = 0;
    let syncedCount = 0;
    let failedCount = 0;

    for (const [index, property] of properties.entries()) {
      try {
        const documentId = getListingId(property, index);
        batch.set(adminDb.collection('listings').doc(documentId), mapProperty(property), { merge: true });
        operationsInBatch += 1;
        syncedCount += 1;

        if (operationsInBatch === MAX_BATCH_OPERATIONS) {
          await batch.commit();
          batch = adminDb.batch();
          operationsInBatch = 0;
        }
      } catch (_error) {
        failedCount += 1;
        logger.error(`Error mapping property ${property.id ?? index}:`, _error);
      }
    }

    if (operationsInBatch > 0) {
      await batch.commit();
    }

    return NextResponse.json(
      {
        success: true,
        syncedCount,
        failedCount,
        message: `Synced ${syncedCount} Portfolio Assets from Property Finder`,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Property sync error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync Portfolio Assets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Portfolio Assets Sync Endpoint',
      method: 'POST only',
      description: 'Use POST with Authorization header and cityId in body',
    },
    { status: 200 }
  );
}
