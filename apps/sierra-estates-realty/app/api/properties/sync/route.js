 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { upsertRecord } from '@sierra-estates/db';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';
import {
  propertyFinderService,

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
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
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
  const code = String(property.reference_number || property.id || '');
  const location = _optionalChain([property, 'access', _25 => _25.city, 'optionalAccess', _26 => _26.name]) || _optionalChain([property, 'access', _27 => _27.location, 'optionalAccess', _28 => _28.name]) || 'Unknown';
  const availability =
    typeof property.isAvailable === 'boolean'
      ? property.isAvailable
        ? 'Available'
        : 'Unavailable'
      : property.status || 'Available';

  return {
    code,
    title: (typeof property.title === 'string' && property.title.trim()) || `Property ${code}`,
    agentName: _optionalChain([property, 'access', _29 => _29.agent, 'optionalAccess', _30 => _30.name]) || 'Unknown',
    brokerPhone: _optionalChain([property, 'access', _31 => _31.agent, 'optionalAccess', _32 => _32.phone]) || '',
    bedrooms: toNumber(property.bedrooms),
    compound: location,
    locationArea: location,
    price: _nullishCoalesce(priceValue, () => ( 0)),
    propertyType:
      typeof property.type === 'string' ? property.type : _optionalChain([property, 'access', _33 => _33.type, 'optionalAccess', _34 => _34.name]) || 'Property',
    latitude,
    longitude,
    images: getImages(property),
    featured: false,
    rawData: {
      timestamp: toDate(property.created_at || property.updated_at || property.publishedDate),
      name: _optionalChain([property, 'access', _35 => _35.agent, 'optionalAccess', _36 => _36.name]) || 'Unknown',
      mobile: _optionalChain([property, 'access', _37 => _37.agent, 'optionalAccess', _38 => _38.phone]) || '',
      availability,
      location,
      unitPrice: priceValue,
      furnitureStatus: _optionalChain([property, 'access', _39 => _39.furnish, 'optionalAccess', _40 => _40.name]) || null,
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
    syncSource: 'property-finder' ,
    lastSyncAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function POST(request) {
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {

    const body = await request.json();
    const cityId = _optionalChain([body, 'optionalAccess', _41 => _41.cityId]);

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
        logger.error(`Error mapping property ${_nullishCoalesce(property.id, () => ( index))}:`, _error);
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
