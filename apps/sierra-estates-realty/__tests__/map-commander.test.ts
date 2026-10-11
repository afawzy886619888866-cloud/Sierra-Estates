/**
 * Unit and integration tests for MapCommanderAgent
 */

import {
  MapCommanderAgent,
  calculateDistanceKm,
} from '../lib/services/MapCommanderAgent';
import { NEW_CAIRO_COMPOUNDS, type MapUnitPin } from '../components/Maps/LiveMap';

describe('MapCommanderAgent', () => {
  describe('calculateDistanceKm', () => {
    it('calculates Haversine distance between two coordinates correctly', () => {
      // Cairo Center (30.025, 31.54) to Mivida (30.015, 31.605)
      const dist = calculateDistanceKm(30.025, 31.54, 30.015, 31.605);
      expect(dist).toBeGreaterThan(5);
      expect(dist).toBeLessThan(15);
    });

    it('returns 0 for identical coordinates', () => {
      expect(calculateDistanceKm(30.025, 31.54, 30.025, 31.54)).toBe(0);
    });
  });

  describe('auditGisCoordinates', () => {
    it('audits default New Cairo compounds within expected bounds', () => {
      const results = MapCommanderAgent.auditGisCoordinates(NEW_CAIRO_COMPOUNDS);
      expect(results.length).toBe(NEW_CAIRO_COMPOUNDS.length);

      // Verify Mivida specifically
      const mivida = results.find((r) => r.code === 'mivida');
      expect(mivida).toBeDefined();
      expect(mivida?.withinExpectedBounds).toBe(true);
      expect(mivida?.distanceFromCairoCenterKm).toBeGreaterThan(0);
    });
  });

  describe('analyzeCompoundCoverage', () => {
    it('computes coverage stats, sale/rent split, and photo completeness', () => {
      const mockUnits: MapUnitPin[] = [
        {
          id: 'u1',
          code: 'MIV-01',
          compound: 'Mivida',
          lat: 30.015,
          lng: 31.605,
          priceLabel: '15,000,000 EGP',
          type: 'Villa',
          mode: 'sale',
          img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750', // valid photo
        },
        {
          id: 'u2',
          code: 'MIV-02',
          compound: 'Mivida',
          lat: 30.015,
          lng: 31.605,
          priceLabel: '45,000 EGP / mo',
          type: 'Apartment',
          mode: 'rent',
          img: '', // missing photo
        },
      ];

      const stats = MapCommanderAgent.analyzeCompoundCoverage(
        NEW_CAIRO_COMPOUNDS,
        mockUnits
      );

      const mividaStats = stats.find((s) => s.compoundCode === 'mivida');
      expect(mividaStats).toBeDefined();
      expect(mividaStats?.totalUnits).toBe(2);
      expect(mividaStats?.saleUnits).toBe(1);
      expect(mividaStats?.rentUnits).toBe(1);
      expect(mividaStats?.unitsNeedingPhotos).toBe(1);
      expect(mividaStats?.unitsWithPhotos).toBe(1);
      expect(mividaStats?.photoCoveragePercent).toBe(50);
    });
  });

  describe('planPhotoHarvestingCampaign', () => {
    it('identifies units needing photos and assigns priority', () => {
      const mockUnits: MapUnitPin[] = [
        {
          id: 'u1',
          code: 'MIV-SALE-01',
          compound: 'Mivida',
          lat: 30.015,
          lng: 31.605,
          priceLabel: '20,000,000 EGP',
          type: 'Villa',
          mode: 'sale',
          img: undefined, // needs photo
        },
        {
          id: 'u2',
          code: 'MIV-RENT-02',
          compound: 'Mivida',
          lat: 30.015,
          lng: 31.605,
          priceLabel: '25,000 EGP / mo',
          type: 'Apartment',
          mode: 'rent',
          img: undefined, // needs photo
        },
        {
          id: 'u3',
          code: 'MIV-SALE-03',
          compound: 'Mivida',
          lat: 30.015,
          lng: 31.605,
          priceLabel: '12,000,000 EGP',
          type: 'Apartment',
          mode: 'sale',
          img: 'https://images.unsplash.com/photo-real.jpg', // has photo
        },
      ];

      const targets = MapCommanderAgent.planPhotoHarvestingCampaign(mockUnits);
      expect(targets.length).toBe(2);
      expect(targets[0].unitCode).toBe('MIV-SALE-01');
      expect(targets[0].priority).toBe('high');
      expect(targets[1].unitCode).toBe('MIV-RENT-02');
      expect(targets[1].priority).toBe('medium');
    });
  });
});
