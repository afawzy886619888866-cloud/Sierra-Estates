import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistanceKm,
  calculateBoundingBox,
  toGeoJsonFeature,
  toGeoJsonFeatureCollection,
} from '../../lib/server/spatial-utils';
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
    expect(body.listings).toBeInstanceOf(Array);
    expect(body.geojson.type).toBe('FeatureCollection');
  });

  it('respects ?format=geojson parameter to return pure FeatureCollection', async () => {
    const req = new Request('http://localhost:3000/api/listings/spatial?format=geojson');
    const res = await spatialGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.type).toBe('FeatureCollection');
    expect(body.features).toBeInstanceOf(Array);
    if (body.features.length > 0) {
      expect(body.features[0].geometry.type).toBe('Point');
      expect(body.features[0].properties.distanceKm).toBeDefined();
    }
  });
});

describe('GET /api/listings with Proximity Parameters', () => {
  it('accepts lat, lng, and radiusKm query parameters on unified listings route', async () => {
    const req = new Request('http://localhost:3000/api/listings?lat=30.01&lng=31.74&radiusKm=35');
    const res = await listingsGET(req);
    expect(res.status).toBe(200);
    const listings = await res.json();

    expect(listings).toBeInstanceOf(Array);
    if (listings.length > 0) {
      expect(listings[0].distanceKm).toBeDefined();
    }
  });
});
