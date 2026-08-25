import { describe, it, expect } from 'vitest';

describe('Duplicates & Inventory Deduplication Engine Test Suite', () => {
  describe('Compound Name Normalization Engine', () => {
    const COMPOUND_SYNONYMS: Record<string, string> = {
      'mivida': 'Mivida',
      'mivida compound': 'Mivida',
      'ميفيدا': 'Mivida',
      'كمبوند ميفيدا': 'Mivida',
      'hyde park': 'Hyde Park',
      'هايد بارك': 'Hyde Park',
      'كمبوند هايد بارك': 'Hyde Park',
      'mountain view icity': 'Mountain View iCity',
      'ماونتن فيو اي سيتي': 'Mountain View iCity',
      'palm hills katameya': 'Palm Hills Katameya',
      'بالم هيلز قطامية': 'Palm Hills Katameya',
      'el patio oro': 'El Patio Oro',
      'الباتيو اورو': 'El Patio Oro',
      'villette sodic': 'Villette Sodic',
      'فيليت سوديك': 'Villette Sodic',
    };

    function normalizeCompoundName(rawName: string): string {
      if (!rawName) return 'Unknown Compound';
      const clean = rawName.trim().toLowerCase().replace(/\s+/g, ' ');
      return COMPOUND_SYNONYMS[clean] || rawName.trim();
    }

    it('should normalize English variations to canonical compound names', () => {
      expect(normalizeCompoundName('mivida compound')).toBe('Mivida');
      expect(normalizeCompoundName('Hyde Park')).toBe('Hyde Park');
      expect(normalizeCompoundName('mountain view icity')).toBe('Mountain View iCity');
    });

    it('should normalize Arabic variations to canonical compound names', () => {
      expect(normalizeCompoundName('ميفيدا')).toBe('Mivida');
      expect(normalizeCompoundName('كمبوند هايد بارك')).toBe('Hyde Park');
      expect(normalizeCompoundName('بالم هيلز قطامية')).toBe('Palm Hills Katameya');
      expect(normalizeCompoundName('الباتيو اورو')).toBe('El Patio Oro');
      expect(normalizeCompoundName('فيليت سوديك')).toBe('Villette Sodic');
    });
  });

  describe('Phone Number Normalization (E.164 Egypt)', () => {
    function normalizeEgyptianPhone(rawPhone: string): string | null {
      if (!rawPhone) return null;
      // Strip all non-digits
      const digits = rawPhone.replace(/\D/g, '');
      
      // Handle local 01xxxxxxxxx
      if (digits.startsWith('01') && digits.length === 11) {
        return `+20${digits.substring(1)}`;
      }
      // Handle 201xxxxxxxxx
      if (digits.startsWith('201') && digits.length === 12) {
        return `+${digits}`;
      }
      // Handle 00201xxxxxxxxx
      if (digits.startsWith('00201') && digits.length === 14) {
        return `+${digits.substring(2)}`;
      }
      return null;
    }

    it('should normalize various Egyptian phone formats to E.164 standard', () => {
      expect(normalizeEgyptianPhone('0100 123 4567')).toBe('+201001234567');
      expect(normalizeEgyptianPhone('201112345678')).toBe('+201112345678');
      expect(normalizeEgyptianPhone('+20 (12) 2345-6789')).toBe('+201223456789');
      expect(normalizeEgyptianPhone('00201555555555')).toBe('+201555555555');
    });

    it('should return null for invalid phone numbers', () => {
      expect(normalizeEgyptianPhone('12345')).toBeNull();
      expect(normalizeEgyptianPhone('')).toBeNull();
    });
  });

  describe('Multi-Channel Inventory Deduplication & Fuzzy Matching', () => {
    interface PropertyUnit {
      id: string;
      compound: string;
      unitType: string;
      buaSqm: number;
      priceEgp: number;
      bedrooms: number;
      source: 'whatsapp_group' | 'property_finder' | 'direct_owner' | 'broker_sheet';
    }

    function isDuplicateListing(unitA: PropertyUnit, unitB: PropertyUnit): boolean {
      if (unitA.id === unitB.id) return true;
      if (unitA.compound.toLowerCase() !== unitB.compound.toLowerCase()) return false;
      if (unitA.unitType.toLowerCase() !== unitB.unitType.toLowerCase()) return false;
      if (unitA.bedrooms !== unitB.bedrooms) return false;

      // Check BUA within 5% tolerance
      const buaDiff = Math.abs(unitA.buaSqm - unitB.buaSqm) / Math.max(unitA.buaSqm, unitB.buaSqm);
      if (buaDiff > 0.05) return false;

      // Check Price within 8% tolerance (to account for broker markups/negotiations)
      const priceDiff = Math.abs(unitA.priceEgp - unitB.priceEgp) / Math.max(unitA.priceEgp, unitB.priceEgp);
      if (priceDiff > 0.08) return false;

      return true;
    }

    it('should detect duplicate listing scraped from WhatsApp group and Property Finder', () => {
      const waListing: PropertyUnit = {
        id: 'wa-msg-88912',
        compound: 'Mivida',
        unitType: 'Standalone Villa',
        buaSqm: 380,
        priceEgp: 36_000_000,
        bedrooms: 5,
        source: 'whatsapp_group',
      };

      const pfListing: PropertyUnit = {
        id: 'pf-item-99120',
        compound: 'Mivida',
        unitType: 'Standalone Villa',
        buaSqm: 385, // Within 1.3% variance
        priceEgp: 37_000_000, // Within 2.7% variance
        bedrooms: 5,
        source: 'property_finder',
      };

      expect(isDuplicateListing(waListing, pfListing)).toBe(true);
    });

    it('should NOT treat distinct units in the same compound as duplicates', () => {
      const unit1: PropertyUnit = {
        id: 'unit-1',
        compound: 'Mivida',
        unitType: 'Standalone Villa',
        buaSqm: 380,
        priceEgp: 36_000_000,
        bedrooms: 5,
        source: 'direct_owner',
      };

      const unit2: PropertyUnit = {
        id: 'unit-2',
        compound: 'Mivida',
        unitType: 'Townhouse', // Different type
        buaSqm: 240,
        priceEgp: 22_000_000,
        bedrooms: 3,
        source: 'broker_sheet',
      };

      expect(isDuplicateListing(unit1, unit2)).toBe(false);
    });
  });
});
