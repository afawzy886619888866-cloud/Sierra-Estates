/**
 * /api/listings/spatial
 *
 * High-performance PostGIS Proximity & Spatial Search Endpoint.
 * Queries Supabase's `get_listings_near_capital` stored procedure to locate
 * properties within a given radius of coordinates [lat, lng].
 *
 * Returns both distance-sorted listing cards and an RFC 7946 GeoJSON FeatureCollection
 * ready for direct consumption by Mapbox GL, Leaflet, or Google Maps.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { logger } from '@/lib/logger';
import {
  calculateHaversineDistanceKm,
  calculateBoundingBox,
  toGeoJsonFeature,
  toGeoJsonFeatureCollection,
} from '@/lib/server/spatial-utils';
import { isPubliclyVisibleListingStatus } from '@/lib/models/schema';
import { SEED_LISTINGS } from '@/lib/seed';
import type { Listing } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_NEW_CAIRO_LAT = 30.045;
const DEFAULT_NEW_CAIRO_LNG = 31.59;
const DEFAULT_RADIUS_KM = 25;

const spatialQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).default(DEFAULT_NEW_CAIRO_LAT),
  lng: z.coerce.number().min(-180).max(180).default(DEFAULT_NEW_CAIRO_LNG),
  radiusKm: z.coerce.number().positive().max(100).default(DEFAULT_RADIUS_KM),
  limit: z.coerce.number().int().positive().max(200).default(50),
  mode: z.enum(['sale', 'rent', 'all']).default('all'),
  type: z.string().optional(),
  beds: z.coerce.number().int().min(0).optional(),
  maxUsd: z.coerce.number().min(0).optional(),
  compound: z.string().optional(),
  format: z.enum(['full', 'geojson', 'listings']).default('full'),
});

interface SpatialListingItem extends Listing {
  distanceKm: number;
  latitude: number;
  longitude: number;
}

export async function GET(request: Request) {
  const rateLimitResponse = await applyRateLimit(request, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const parseResult = spatialQuerySchema.safeParse({
      lat: searchParams.get('lat') ?? undefined,
      lng: searchParams.get('lng') ?? undefined,
      radiusKm: searchParams.get('radiusKm') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      mode: searchParams.get('mode') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      beds: searchParams.get('beds') ?? undefined,
      maxUsd: searchParams.get('maxUsd') ?? undefined,
      compound: searchParams.get('compound') ?? undefined,
      format: searchParams.get('format') ?? undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { lat, lng, radiusKm, limit, mode, type, beds, maxUsd, compound, format } =
      parseResult.data;

    const radiusMeters = radiusKm * 1000;
    let rawItems: any[] = [];
    let isLiveRpc = false;

    // 1. Try querying PostGIS via Supabase RPC
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_listings_near_capital',
        {
          capital_lat: lat,
          capital_lng: lng,
          radius_meters: radiusMeters,
        }
      );

      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        rawItems = rpcData;
        isLiveRpc = true;
      } else if (rpcError) {
        logger.warn('[SPATIAL_RPC] Supabase RPC call returned an error, falling back:', rpcError.message);
      }
    } catch (err: any) {
      logger.warn('[SPATIAL_RPC] Supabase client unavailable or failed:', err?.message || err);
    }

    // 2. Live-table fallback: the PostGIS RPC (`get_listings_near_capital`)
    //    is not deployed on the live Supabase project (deployed schema
    //    diverged from supabase/schema.sql), so read public.listings
    //    directly — the same live read /api/listings filter mode uses — and
    //    let the haversine pass below apply the radius. Seed data stays as
    //    the final offline tier.
    let isLive = isLiveRpc;
    if (!isLiveRpc || rawItems.length === 0) {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: liveRows, error: liveErr } = await supabase
          .from('listings')
          .select('*')
          .in('status', ['active', 'available'])
          .limit(500);

        if (!liveErr && Array.isArray(liveRows) && liveRows.length > 0) {
          rawItems = liveRows
            .filter((r: any) => r.latitude != null && r.longitude != null)
            .map((r: any) => ({
              ...r,
              // Presentation fields (img) are parked in raw_data on the live
              // table; surface them through the images array the processor
              // reads (lib/server/listing-columns.ts convention).
              images:
                Array.isArray(r.images) && r.images.length > 0
                  ? r.images
                  : r.raw_data?.img
                    ? [r.raw_data.img]
                    : [],
            }));
          isLive = true;
        } else if (liveErr) {
          logger.warn('[SPATIAL_LIVE] Live listings read failed, trying seed:', liveErr.message);
        }
      } catch (err: any) {
        logger.warn('[SPATIAL_LIVE] Supabase client unavailable:', err?.message || err);
      }
    }

    // 3. Seed fallback (offline / sandbox only)
    if (!isLive || rawItems.length === 0) {
      // Map seed listings into spatial records using haversine
      rawItems = SEED_LISTINGS.map((l) => {
        // Approximate location around New Cairo if not set
        const itemLat = (l as any).latitude ?? DEFAULT_NEW_CAIRO_LAT + (Math.random() - 0.5) * 0.1;
        const itemLng = (l as any).longitude ?? DEFAULT_NEW_CAIRO_LNG + (Math.random() - 0.5) * 0.1;
        return {
          id: l.id,
          title: `${l.type} in ${l.compound}`,
          compound: l.compound,
          property_type: l.type,
          deal_type: l.mode,
          price: l.usd * 50,
          bedrooms: l.beds,
          bathrooms: l.bath,
          area_sqm: l.area,
          latitude: itemLat,
          longitude: itemLng,
          status: l.status,
          images: l.img ? [l.img] : [],
          description: l.description,
        };
      });
    }

    // 4. Process, calculate exact geodesic distance, and filter
    const processed: SpatialListingItem[] = [];

    for (const item of rawItems) {
      const itemLat = Number(item.latitude);
      const itemLng = Number(item.longitude);

      if (isNaN(itemLat) || isNaN(itemLng)) continue;

      const distanceKm = calculateHaversineDistanceKm(lat, lng, itemLat, itemLng);

      // Verify within requested radius
      if (distanceKm > radiusKm) continue;

      // Filter by visibility status
      const status = item.status || 'available';
      if (!isPubliclyVisibleListingStatus(status)) continue;

      // Filter by deal mode
      const itemMode = item.deal_type === 'rent' ? 'rent' : 'sale';
      if (mode !== 'all' && itemMode !== mode) continue;

      // Filter by compound
      if (compound && !String(item.compound || '').toLowerCase().includes(compound.toLowerCase())) {
        continue;
      }

      // Filter by property type
      if (type && String(item.property_type || '').toLowerCase() !== type.toLowerCase()) {
        continue;
      }

      // Filter by bedrooms
      const itemBeds = Number(item.bedrooms) || 0;
      if (beds != null && itemBeds < beds) continue;

      // Price mapping
      const priceEgp = Number(item.price) || 0;
      const egpM = priceEgp > 100000 ? priceEgp / 1_000_000 : priceEgp;
      const usd = Math.round(priceEgp / 50);

      if (maxUsd != null && usd > maxUsd) continue;

      processed.push({
        id: item.id || item.ref_id,
        code: item.code || item.reference_code || `SE-${String(item.id).substring(0, 4)}`,
        compound: item.compound || 'New Cairo',
        zone: item.location_area || item.zone || '5th Settlement',
        type: item.property_type || 'Apartment',
        beds: itemBeds,
        bath: Number(item.bathrooms) || 1,
        area: Number(item.area_sqm) || 150,
        egpM: Number(egpM.toFixed(2)),
        usd,
        aiScore: item.roi_percentage ? 9.2 : 8.9,
        tag: item.featured ? 'Featured' : 'Verified Location',
        mode: itemMode,
        agent: item.owner_name ? `${item.owner_name} (Owner)` : 'Sierra Advisor',
        img: (item.images && item.images[0]) || '',
        status,
        description: item.description || '',
        distanceKm,
        latitude: itemLat,
        longitude: itemLng,
      } as SpatialListingItem);
    }

    // 5. Sort by distance (nearest first)
    processed.sort((a, b) => a.distanceKm - b.distanceKm);

    // Apply limit
    const sliced = processed.slice(0, limit);

    // 6. Generate GeoJSON FeatureCollection
    const features = sliced.map((item) =>
      toGeoJsonFeature(item.latitude, item.longitude, {
        id: item.id,
        code: item.code,
        title: `${item.type} in ${item.compound}`,
        compound: item.compound,
        zone: item.zone,
        type: item.type,
        beds: item.beds,
        bath: item.bath,
        area: item.area,
        priceEgp: item.egpM,
        priceUsd: item.usd,
        mode: item.mode,
        distanceKm: item.distanceKm,
        img: item.img,
      })
    );

    const boundingBox = calculateBoundingBox(lat, lng, radiusKm);
    const geojson = toGeoJsonFeatureCollection(features, {
      center: { lat, lng },
      radiusKm,
      totalMatches: processed.length,
      returnedCount: sliced.length,
      boundingBox,
    });

    if (format === 'geojson') {
      return NextResponse.json(geojson);
    }

    if (format === 'listings') {
      return NextResponse.json(sliced);
    }

    return NextResponse.json({
      success: true,
      meta: {
        center: { lat, lng },
        radiusKm,
        totalFound: processed.length,
        returned: sliced.length,
        isLiveRpc,
        // True when data came from either live source (PostGIS RPC or a
        // direct public.listings read); false means seed/demo data.
        isLive,
        boundingBox,
      },
      listings: sliced,
      geojson,
    });
  } catch (error: any) {
    logger.error('[SPATIAL_ERROR] Failed to query spatial listings:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
