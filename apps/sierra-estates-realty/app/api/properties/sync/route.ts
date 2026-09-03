import { NextRequest, NextResponse } from 'next/server';
import { upsertRecord } from '@sierra-estates/db';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';
import {
  propertyFinderService,
  type PropertyFinderListing,
} from '@/lib/propertyFinder-service';

/**
 * Property Finder city sync → public.listings.
 *
 * Firestore → Postgres field mapping. Every field mapProperty produced is still
 * written; those with a canonical column go there instead of being duplicated:
 *
 *   location        → compound + location_area   unitPrice → price
 *   name/agentName  → agent_name                 mobile    → broker_phone
 *   latitude/longitude, images, featured, propertyType, bedrooms → own columns
 *
 * The rest (availability, furnitureStatus, owner, rentPeriodType, timestamp, and
 * the raw unitPrice before the null→0 coercion the NOT NULL price column forces)
 * is kept verbatim under listings.raw_data, so nothing is lost.
 *
 * `title` is required by the schema and the Property Finder payload has no
 * guaranteed title, so it falls back to the listing reference.
 */

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toDate(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
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
  const code = String(property.reference_number || property.id || '');
  const location = property.city?.name || property.location?.name || 'Unknown';
  const availability =
    typeof property.isAvailable === 'boolean'
      ? property.isAvailable
        ? 'Available'
        : 'Unavailable'
      : property.status || 'Available';

  return {
    code,
    title: (typeof property.title === 'string' && property.title.trim()) || `Property ${code}`,
    agentName: property.agent?.name || 'Unknown',
    brokerPhone: property.agent?.phone || '',
    bedrooms: toNumber(property.bedrooms),
    compound: location,
    locationArea: location,
    price: priceValue ?? 0,
    propertyType:
      typeof property.type === 'string' ? property.type : property.type?.name || 'Property',
    latitude,
    longitude,
    images: getImages(property),
    featured: false,
    rawData: {
      timestamp: toDate(property.created_at || property.updated_at || property.publishedDate),
      name: property.agent?.name || 'Unknown',
      mobile: property.agent?.phone || '',
      availability,
      location,
      unitPrice: priceValue,
      furnitureStatus: property.furnish?.name || null,
      owner: property.postedBy === 'agent' ? 'Agent' : 'Owner',
      rentPeriodType: property.offering_type === 'rent' ? getRentPeriods(property) : [],
    },
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
    lastSyncAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

    let syncedCount = 0;
    let failedCount = 0;

    // Was a chunked Firestore batch (450 ops per commit). Postgres upserts run
    // one row at a time here, so a failure part-way through leaves the rows
    // already written in place instead of rolling the chunk back. That matches
    // the per-row failure accounting this route already reported (failedCount),
    // and the upsert is keyed on the listing id so a re-run converges.
    for (const [index, property] of properties.entries()) {
      try {
        const documentId = getListingId(property, index);
        await upsertRecord('listings', { id: documentId, ...mapProperty(property) });
        syncedCount += 1;
      } catch (_error) {
        failedCount += 1;
        logger.error(`Error mapping property ${property.id ?? index}:`, _error);
      }
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
