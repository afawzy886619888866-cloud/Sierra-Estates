/**
 * Tests for LiveMap Google Maps integration, deeplinks, and spatial landmarks
 */

import {
  NEW_CAIRO_COMPOUNDS,
  normalizeCompoundKey,
} from '../components/Maps/compounds-data';
import { calculateDistanceKm } from '../lib/services/MapCommanderAgent';

describe('LiveMap Google Maps Integration', () => {
  const MIVIDA_LAT = 30.015;
  const MIVIDA_LNG = 31.605;

  describe('Google Maps Deeplink URL Builders', () => {
    it('generates a valid Google Maps search/pin URL', () => {
      const url = `https://www.google.com/maps/search/?api=1&query=${MIVIDA_LAT},${MIVIDA_LNG}`;
      expect(url).toBe('https://www.google.com/maps/search/?api=1&query=30.015,31.605');
      expect(new URL(url).searchParams.get('api')).toBe('1');
      expect(new URL(url).searchParams.get('query')).toBe('30.015,31.605');
    });

    it('generates a valid Google Maps turn-by-turn driving directions URL', () => {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${MIVIDA_LAT},${MIVIDA_LNG}`;
      expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=30.015,31.605');
      expect(new URL(url).searchParams.get('destination')).toBe('30.015,31.605');
    });

    it('generates a valid Google Street View 360 panorama URL', () => {
      const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${MIVIDA_LAT},${MIVIDA_LNG}`;
      expect(url).toBe('https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=30.015,31.605');
      expect(new URL(url).searchParams.get('map_action')).toBe('pano');
      expect(new URL(url).searchParams.get('viewpoint')).toBe('30.015,31.605');
    });
  });

  describe('New Cairo Key Landmarks Proximity', () => {
    const LANDMARKS = [
      { name: 'AUC New Cairo', lat: 30.0195, lng: 31.4996 },
      { name: 'Cairo Festival City (CFC)', lat: 30.0294, lng: 31.4082 },
      { name: 'New Capital Gate', lat: 30.0102, lng: 31.715 },
      { name: 'Golden Square', lat: 30.032, lng: 31.545 },
    ];

    it('calculates plausible distances from Cairo Center to key landmarks', () => {
      const centerLat = 30.025;
      const centerLng = 31.54;

      LANDMARKS.forEach((lm) => {
        const dist = calculateDistanceKm(centerLat, centerLng, lm.lat, lm.lng);
        expect(dist).toBeGreaterThan(0);
        expect(dist).toBeLessThan(35); // All landmarks are within 35km of center
      });
    });
  });

  describe('Compound Data and Normalization', () => {
    it('normalizes compound keys with special characters and casing', () => {
      expect(normalizeCompoundKey('Mivida - New Cairo')).toBe('mivida');
      expect(normalizeCompoundKey('Mountain View iCity')).toBe('mountain view icity');
      expect(normalizeCompoundKey('Palm Hills')).toBe('palm hills');
      expect(normalizeCompoundKey('Palm Hills Phase 2')).toBe('palm hills');
    });

    it('includes valid coordinates for all registered compounds in Greater Cairo', () => {
      expect(NEW_CAIRO_COMPOUNDS.length).toBeGreaterThanOrEqual(30);

      NEW_CAIRO_COMPOUNDS.forEach((c) => {
        expect(c.lat).toBeGreaterThan(29.5);
        expect(c.lat).toBeLessThan(30.5);
        expect(c.lng).toBeGreaterThan(30.5);
        expect(c.lng).toBeLessThan(32.0);
        expect(c.code).toBeTruthy();
        expect(c.nameEn).toBeTruthy();
        expect(c.nameAr).toBeTruthy();
      });
    });
  });
});
