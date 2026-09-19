import {
  calculateHaversineDistanceKm,
  calculateBoundingBox,
  toGeoJsonFeature,
  toGeoJsonFeatureCollection,
} from '../../lib/server/spatial-utils';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'prop-test-1',
          title: '3 Bed Apartment in Swan Lake',
          compound: 'Swan Lake',
          property_type: 'Apartment',
          deal_type: 'sale',
          price: 5000000,
          bedrooms: 3,
          bathrooms: 2,
          area_sqm: 160,
          latitude: 30.045,
          longitude: 31.635,
          status: 'available',
          images: ['https://images.unsplash.com/sample.jpg'],
        },
        {
          id: 'prop-test-2',
          title: '4 Bed Villa in City Gate',
          compound: 'City Gate',
          property_type: 'Villa',
          deal_type: 'sale',
          price: 12000000,
          bedrooms: 4,
          bathrooms: 4,
          area_sqm: 320,
          latitude: 30.015,
          longitude: 31.545,
          status: 'available',
          images: [],
        },
      ],
      error: null,
    }),
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
        in: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  },
  getSupabaseAdmin: jest.fn(),
}));

import { GET as spatialGET } from '../../app/api/listings/spatial/route';
import { GET as listingsGET } from '../../app/api/listings/route';

describe('Spatial & Proximity Math Utilities', () => {
  it('calculates geodesic distance between two points accurately using Haversine', () => {
    // New Cairo Center to AUC New Cairo Campus
    const dist = calculateHaversineDistanceKm(30.045, 31.59, 30.03, 31.47);
    expect(dist).toBeGreaterThan(10);
    expect(dist).toBeLessThan(15);
  });

  it('returns 0 distance for identical coordinates', () => {
    const dist = calculateHaversineDistanceKm(30.045, 31.59, 30.045, 31.59);
    expect(dist).toBe(0);
  });

  it('calculates bounding box within expected geographic boundaries', () => {
    const box = calculateBoundingBox(30.045, 31.59, 25);
    expect(box.minLat).toBeLessThan(30.045);
    expect(box.maxLat).toBeGreaterThan(30.045);
    expect(box.minLng).toBeLessThan(31.59);
    expect(box.maxLng).toBeGreaterThan(31.59);
  });

  it('converts listing coordinates into RFC 7946 compliant GeoJSON Feature with [lng, lat]', () => {
    const feature = toGeoJsonFeature(30.052, 31.49, {
      id: 'prop-123',
      title: 'Luxury Villa',
      compound: 'Swan Lake',
    });

    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('Point');
    // Crucial RFC 7946 check: coordinates must be [longitude, latitude]
    expect(feature.geometry.coordinates).toEqual([31.49, 30.052]);
    expect(feature.properties.title).toBe('Luxury Villa');
  });

  it('serializes an array of features into a GeoJSON FeatureCollection', () => {
    const f1 = toGeoJsonFeature(30.01, 31.5, { id: '1' });
    const f2 = toGeoJsonFeature(30.02, 31.6, { id: '2' });
    const collection = toGeoJsonFeatureCollection([f1, f2], { query: 'test' });

    expect(collection.type).toBe('FeatureCollection');
    expect(collection.features).toHaveLength(2);
    expect(collection.properties?.query).toBe('test');
  });
});

describe('GET /api/listings/spatial Endpoint', () => {
  it('rejects invalid latitude out of range with 400 Validation failed', async () => {
    const req = new Request('http://localhost:3000/api/listings/spatial?lat=195&lng=31.59');
    const res = await spatialGET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Validation failed');
  });

  it('rejects negative or excessive radiusKm with 400 Validation failed', async () => {
    const req = new Request('http://localhost:3000/api/listings/spatial?radiusKm=500');
    const res = await spatialGET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('returns valid spatial listings and GeoJSON with default New Cairo coordinates', async () => {
    const req = new Request('http://localhost:3000/api/listings/spatial?radiusKm=35');
    const res = await spatialGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.meta).toBeDefined();
    expect(body.meta.center.lat).toBe(30.045);
    expect(body.meta.center.lng).toBe(31.59);
    expect(Array.isArray(body.listings)).toBe(true);
    expect(body.geojson.type).toBe('FeatureCollection');
  });

  it('respects ?format=geojson parameter to return pure FeatureCollection', async () => {
    const req = new Request('http://localhost:3000/api/listings/spatial?format=geojson');
    const res = await spatialGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.type).toBe('FeatureCollection');
    expect(Array.isArray(body.features)).toBe(true);
    if (body.features.length > 0) {
      expect(body.features[0].geometry.type).toBe('Point');
      expect(body.features[0].properties.distanceKm).toBeDefined();
    }
  });

  it('falls back to live public.listings rows when the PostGIS RPC is not deployed', async () => {
    const { supabase } = await import('@/lib/supabase');

    // RPC missing on the live project (schema divergence) → live-table tier.
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'function public.get_listings_near_capital does not exist' },
    });
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'live-pf-1',
                ref_id: 'PF-LIVE-1',
                code: 'PF-LIVE-1',
                compound: 'Uptown Cairo',
                location_area: 'Uptown Cairo',
                property_type: 'Apartment',
                deal_type: 'sale',
                price: 8000000,
                bedrooms: 3,
                bathrooms: 3,
                area_sqm: 190,
                latitude: 30.04,
                longitude: 31.58,
                status: 'active',
                images: [
                  'https://static.shared.propertyfinder.eg/media/images/listing/x/1.jpg',
                ],
                description: 'Live PF listing',
                raw_data: { img: 'https://static.shared.propertyfinder.eg/media/images/listing/x/raw.jpg' },
              },
              // No coordinates → must be dropped by the live fallback tier.
              {
                id: 'live-nocoord',
                code: 'PF-NOCOORD',
                compound: 'Maadi',
                property_type: 'Apartment',
                deal_type: 'sale',
                price: 4000000,
                status: 'active',
                images: [],
              },
            ],
            error: null,
          }),
        }),
      }),
    });

    const req = new Request(
      'http://localhost:3000/api/listings/spatial?lat=30.045&lng=31.59&radiusKm=25&format=full'
    );
    const res = await spatialGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.meta.isLiveRpc).toBe(false);
    expect(body.meta.isLive).toBe(true);
    expect(body.listings).toHaveLength(1);
    expect(body.listings[0].code).toBe('PF-LIVE-1');
    expect(body.listings[0].img).toContain('propertyfinder');
    expect(body.listings[0].distanceKm).toBeLessThan(25);
  });
});

describe('GET /api/listings with Proximity Parameters', () => {
  it('accepts lat, lng, and radiusKm query parameters on unified listings route', async () => {
    const req = new Request('http://localhost:3000/api/listings?lat=30.01&lng=31.74&radiusKm=35');
    const res = await listingsGET(req);
    expect(res.status).toBe(200);
    const listings = await res.json();

    expect(Array.isArray(listings)).toBe(true);
    if (listings.length > 0) {
      expect(listings[0].distanceKm).toBeDefined();
    }
  });
});
