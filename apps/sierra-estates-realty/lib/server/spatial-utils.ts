/**
 * Spatial & Geographic Utilities for Sierra Estates
 *
 * Implements geodesic distance calculations, bounding boxes, and RFC 7946
 * GeoJSON serializers for PostGIS-backed real estate listings.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface GeoJsonPointGeometry {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude] as per RFC 7946
}

export interface GeoJsonFeature<P = Record<string, unknown>> {
  type: 'Feature';
  geometry: GeoJsonPointGeometry;
  properties: P;
}

export interface GeoJsonFeatureCollection<P = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: GeoJsonFeature<P>[];
  properties?: Record<string, unknown>;
}

const EARTH_RADIUS_KM = 6371.0088;

/**
 * Calculates the great-circle distance between two points in kilometers
 * using the Haversine formula.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = EARTH_RADIUS_KM * c;

  return Math.round(dist * 100) / 100; // Round to 2 decimal places
}

/**
 * Computes the approximate bounding box around a center point for a given radius in kilometers.
 */
export function calculateBoundingBox(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): BoundingBox {
  const latDelta = radiusKm / 111.045;
  const lngDelta = radiusKm / (111.045 * Math.cos((centerLat * Math.PI) / 180));

  return {
    minLat: Number((centerLat - latDelta).toFixed(6)),
    maxLat: Number((centerLat + latDelta).toFixed(6)),
    minLng: Number((centerLng - lngDelta).toFixed(6)),
    maxLng: Number((centerLng + lngDelta).toFixed(6)),
  };
}

/**
 * Converts a listing item with latitude and longitude into an RFC 7946 GeoJSON Feature.
 */
export function toGeoJsonFeature<P extends Record<string, unknown>>(
  lat: number,
  lng: number,
  properties: P
): GeoJsonFeature<P> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lng, lat], // GeoJSON standard is [longitude, latitude]
    },
    properties,
  };
}

/**
 * Wraps an array of GeoJSON Features into a FeatureCollection.
 */
export function toGeoJsonFeatureCollection<P = Record<string, unknown>>(
  features: GeoJsonFeature<P>[],
  metadata?: Record<string, unknown>
): GeoJsonFeatureCollection<P> {
  return {
    type: 'FeatureCollection',
    features,
    ...(metadata ? { properties: metadata } : {}),
  };
}
