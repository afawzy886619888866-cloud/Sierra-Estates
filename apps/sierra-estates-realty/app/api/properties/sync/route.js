 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/server/firebase-admin';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';
import {
  propertyFinderService,

} from '@/lib/propertyFinder-service';

const MAX_BATCH_OPERATIONS = 450;

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toDate(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return Timestamp.now();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return Timestamp.now();
  }

  return Timestamp.fromDate(parsed);
}

function getListingId(property, fallbackIndex) {
  const rawId = _nullishCoalesce(property.id, () => ( property.reference_number));
  if (typeof rawId === 'string' && rawId.trim()) return rawId;
  if (typeof rawId === 'number') return String(rawId);
  return `pf_${Date.now()}_${fallbackIndex}`;
}

function getPriceValue(price) {
  if (typeof price === 'number') return price;
  return _nullishCoalesce(_optionalChain([price, 'optionalAccess', _ => _.value]), () => ( null));
}

function getImages(property) {
  const images = _optionalChain([property, 'access', _2 => _2.images, 'optionalAccess', _3 => _3.map, 'call', _4 => _4((image) => image.url), 'access', _5 => _5.filter, 'call', _6 => _6(Boolean)]);
  if (_optionalChain([images, 'optionalAccess', _7 => _7.length])) return images;

  return _optionalChain([property, 'access', _8 => _8.photos, 'optionalAccess', _9 => _9.map, 'call', _10 => _10((photo) => photo.url), 'access', _11 => _11.filter, 'call', _12 => _12(Boolean)]) || [];
}

function getRentPeriods(property) {
  if (typeof property.price === 'number') return [];
  if (!_optionalChain([property, 'access', _13 => _13.price, 'optionalAccess', _14 => _14.period])) return [];

  const period = property.price.period.trim().toLowerCase();
  if (!period) return [];

  return [period.charAt(0).toUpperCase() + period.slice(1)];
}

function mapProperty(property) {
  const latitude = _nullishCoalesce(_nullishCoalesce(_optionalChain([property, 'access', _15 => _15.location, 'optionalAccess', _16 => _16.latitude]), () => ( _optionalChain([property, 'access', _17 => _17.location, 'optionalAccess', _18 => _18.coordinates, 'optionalAccess', _19 => _19.lat]))), () => ( null));
  const longitude = _nullishCoalesce(_nullishCoalesce(_optionalChain([property, 'access', _20 => _20.location, 'optionalAccess', _21 => _21.longitude]), () => ( _optionalChain([property, 'access', _22 => _22.location, 'optionalAccess', _23 => _23.coordinates, 'optionalAccess', _24 => _24.lng]))), () => ( null));
  const priceValue = getPriceValue(property.price);

  return {
    code: String(property.reference_number || property.id || ''),
    timestamp: toDate(property.created_at || property.updated_at || property.publishedDate),
    name: _optionalChain([property, 'access', _25 => _25.agent, 'optionalAccess', _26 => _26.name]) || 'Unknown',
    mobile: _optionalChain([property, 'access', _27 => _27.agent, 'optionalAccess', _28 => _28.phone]) || '',
    availability:
      typeof property.isAvailable === 'boolean'
        ? property.isAvailable
          ? 'Available'
          : 'Unavailable'
        : property.status || 'Available',
    bedrooms: toNumber(property.bedrooms),
    location: _optionalChain([property, 'access', _29 => _29.city, 'optionalAccess', _30 => _30.name]) || _optionalChain([property, 'access', _31 => _31.location, 'optionalAccess', _32 => _32.name]) || 'Unknown',
    unitPrice: priceValue,
    furnitureStatus: _optionalChain([property, 'access', _33 => _33.furnish, 'optionalAccess', _34 => _34.name]) || null,
    propertyType:
      typeof property.type === 'string' ? property.type : _optionalChain([property, 'access', _35 => _35.type, 'optionalAccess', _36 => _36.name]) || 'Property',
    owner: property.postedBy === 'agent' ? 'Agent' : 'Owner',
    rentPeriodType: property.offering_type === 'rent' ? getRentPeriods(property) : [],
    agentName: _optionalChain([property, 'access', _37 => _37.agent, 'optionalAccess', _38 => _38.name]) || 'Unknown',
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
    syncSource: 'property-finder' ,
    lastSyncAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

export async function POST(request) {
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {

    const body = await request.json();
    const cityId = _optionalChain([body, 'optionalAccess', _39 => _39.cityId]);

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
        logger.error(`Error mapping property ${_nullishCoalesce(property.id, () => ( index))}:`, _error);
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
