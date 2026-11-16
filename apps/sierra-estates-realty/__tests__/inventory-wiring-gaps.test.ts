import { mapSpaToListingPatch, mapListingToSpa } from '../lib/server/admin-spa-mappers';
import { fingerprint } from '../lib/services/inventory/dedupe';
import type { PropertyFinderListing } from '../lib/propertyFinder-service';

describe('Inventory Wiring Gaps 1 & 2 (FUTURE_PLAN/05)', () => {
  describe('Gap 1: Admin SPA offerType mapping and dedupe', () => {
    it('threads offerType="rent" through mapSpaToListingPatch', () => {
      const patch = mapSpaToListingPatch({
        cmp: 'Mivida',
        type: 'Apartment',
        offerType: 'rent',
        beds: 3,
        area: 180,
        price: 75000,
      });

      expect(patch.offerType).toBe('rent');
      expect(patch.dealType).toBe('rent');
      expect(patch.compound).toBe('Mivida');
      expect(patch.propertyType).toBe('Apartment');
    });

    it('threads legacy "offer" or "mode" through mapSpaToListingPatch', () => {
      const patch1 = mapSpaToListingPatch({ cmp: 'Eastown', type: 'Duplex', offer: 'rent' });
      expect(patch1.offerType).toBe('rent');
      expect(patch1.dealType).toBe('rent');

      const patch2 = mapSpaToListingPatch({ cmp: 'Eastown', type: 'Duplex', mode: 'sale' });
      expect(patch2.offerType).toBe('sale');
      expect(patch2.dealType).toBe('sale');
    });

    it('exposes offerType in mapListingToSpa', () => {
      const spaListing = mapListingToSpa('item-123', {
        id: 'item-123',
        code: 'SE-RENT-001',
        compound: 'Mivida',
        propertyType: 'apartment',
        dealType: 'rent',
        price: 85000,
      });

      expect(spaListing.offerType).toBe('rent');
    });

    it('generates distinct dupeCheckHash for sale vs rent of the same specs', () => {
      const saleHash = fingerprint({
        compound: 'Mivida',
        propertyType: 'Apartment',
        offerType: 'sale',
        bedrooms: 3,
        area: 180,
        price: 15_000_000,
      });

      const rentHash = fingerprint({
        compound: 'Mivida',
        propertyType: 'Apartment',
        offerType: 'rent',
        bedrooms: 3,
        area: 180,
        price: 15_000_000,
      });

      expect(saleHash).toBeDefined();
      expect(rentHash).toBeDefined();
      expect(saleHash).not.toBe(rentHash);
    });
  });

  describe('Gap 2: Property Finder size/area mapping and dupeCheckHash', () => {
    it('accepts size and area in PropertyFinderListing typing', () => {
      const pfListingNumeric: PropertyFinderListing = {
        id: 'pf-101',
        reference_number: 'PF-REF-101',
        size: 220,
        bedrooms: 3,
        offering_type: 'sale',
      };
      expect(pfListingNumeric.size).toBe(220);

      const pfListingObject: PropertyFinderListing = {
        id: 'pf-102',
        reference_number: 'PF-REF-102',
        size: { value: 175, unit: 'sqm' },
        bedrooms: 2,
        offering_type: 'rent',
      };
      expect(pfListingObject.size).toEqual({ value: 175, unit: 'sqm' });

      const pfListingArea: PropertyFinderListing = {
        id: 'pf-103',
        area: '190',
        bedrooms: 3,
      };
      expect(pfListingArea.area).toBe('190');
    });

    it('computes valid dupeCheckHash with mapped Property Finder specs', () => {
      const pfUnit = {
        location: 'Fifth Square',
        propertyType: 'Apartment',
        offeringType: 'sale',
        bedrooms: 3,
        size: 165,
        price: 8_800_000,
      };

      const hash = fingerprint({
        compound: pfUnit.location,
        propertyType: pfUnit.propertyType,
        offerType: pfUnit.offeringType,
        bedrooms: pfUnit.bedrooms,
        area: pfUnit.size,
        price: pfUnit.price,
      });

      expect(hash).toHaveLength(24);
    });
  });
});
