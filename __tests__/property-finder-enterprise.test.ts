import { createRequire } from 'module';
import { describe, it, expect } from 'vitest';
import {
  computeTokenExpiry,
  isTokenValid,
  formatForPropertyFinder,
  chunkAssets,
  type SierraListingInput,
} from '../packages/property-finder-api/src/index';

const require = createRequire(import.meta.url);
const { classifyOwnerReply, normalizeOwnerPhone } = require('../workflows/lib/inbox.js') as {
  classifyOwnerReply: (rawText: string) => 'opt_out' | 'unavailable' | 'available' | 'negotiation' | 'empty';
  normalizeOwnerPhone: (raw: string) => string | null;
};

/**
 * Property Finder Enterprise Atlas v1 & Closed-Loop Owner Workflow Contract Test Suite
 * Validates real exported helpers from packages/property-finder-api and workflows/lib/inbox.js.
 */
describe('Property Finder Enterprise Integration & Closed-Loop Owner Reply Suite', () => {
  describe('OAuth2 Token Expiry & Refresh Window (packages/property-finder-api)', () => {
    it('accurately detects valid cached token vs expired token with 60s buffer', () => {
      const now = 1700000000000;
      const validExpiry = computeTokenExpiry(1800, now);
      expect(isTokenValid('valid-bearer-token', validExpiry, now)).toBe(true);
      expect(isTokenValid('expired-bearer-token', now - 1000, now)).toBe(false);
      expect(isTokenValid(null, validExpiry, now)).toBe(false);
      expect(isTokenValid('   ', validExpiry, now)).toBe(false);
    });

    it('calculates token refresh timestamp with 60s safety buffer', () => {
      const now = 1700000000000;
      const expiry = computeTokenExpiry(1800, now);
      expect(expiry).toBe(now + 1740000); // (1800 - 60) * 1000
    });
  });

  describe('Enterprise Atlas v1 Listing Syndication Payload Format', () => {
    it('formats a residential sale asset into Property Finder Atlas RS schema', () => {
      const asset: SierraListingInput = {
        id: '12345678-abcd-efgh',
        code: 'SE-UPT-101',
        title: 'Golf Uptown Cairo Penthouse',
        titleAr: 'بنتهاوس أبتاون كايرو المطل على الجولف',
        propertyType: 'penthouse',
        dealType: 'sale',
        price: 45000000,
        compound: 'Uptown Cairo',
        bedrooms: 4,
        bathrooms: 5,
        areaSqm: 350,
        images: ['https://www.propertyfinder.eg/property/uptown-1.jpg'],
      };

      const formatted = formatForPropertyFinder(asset);
      expect(formatted.reference).toBe('SE-UPT-101');
      expect(formatted.category).toBe('residential');
      expect(formatted.offeringType).toBe('RS');
      expect(formatted.price.type).toBe('sale');
      expect(formatted.price.amounts.sale).toBe(45000000);
      expect(formatted.bedrooms).toBe(4);
      expect(formatted.size).toBe(350);
      expect(formatted.title.ar).toBe('بنتهاوس أبتاون كايرو المطل على الجولف');
      expect(formatted.media.images).toHaveLength(1);
    });

    it('maps commercial rental units to CR offeringType and monthly price', () => {
      const commercialRent: SierraListingInput = {
        code: 'SE-COM-202',
        propertyType: 'office',
        dealType: 'rent',
        price: 120000,
        compound: 'Cairo Festival City',
      };

      const formatted = formatForPropertyFinder(commercialRent);
      expect(formatted.category).toBe('commercial');
      expect(formatted.offeringType).toBe('CR');
      expect(formatted.price.type).toBe('monthly');
      expect(formatted.price.amounts.monthly).toBe(120000);
    });

    it('handles sparse or minimal asset data gracefully with safe defaults', () => {
      const sparseAsset: SierraListingInput = { id: 'abcdef12-3456-7890' };
      const formatted = formatForPropertyFinder(sparseAsset);

      expect(formatted.reference).toBe('SE-ABCDEF12');
      expect(formatted.title.en).toContain('Luxury Property');
      expect(formatted.price.amounts.sale).toBe(0);
      expect(formatted.bedrooms).toBe(0);
    });
  });

  describe('Batch Syndication Partitioning', () => {
    it('partitions large inventory batches into safe chunks for Atlas API limits', () => {
      const items = Array.from({ length: 65 }, (_, i) => ({ id: `prop-${i}` }));
      const chunks = chunkAssets(items, 25);

      expect(chunks.length).toBe(3);
      expect(chunks[0].length).toBe(25);
      expect(chunks[1].length).toBe(25);
      expect(chunks[2].length).toBe(15);
    });
  });

  describe('Closed-Loop Direct Owner Reply Classifier (workflows/lib/inbox.js)', () => {
    it('classifies Arabic and English opt-outs, availability, sold/rented, and negotiation replies accurately', () => {
      expect(classifyOwnerReply('إلغاء')).toBe('opt_out');
      expect(classifyOwnerReply('STOP')).toBe('opt_out');
      expect(classifyOwnerReply('الوحدة غير متاحة حالياً')).toBe('unavailable');
      expect(classifyOwnerReply('خلاص اتباعت الحمد لله')).toBe('unavailable');
      expect(classifyOwnerReply('نعم متاحة للتواصل')).toBe('available');
      expect(classifyOwnerReply('Yes still available')).toBe('available');
      expect(classifyOwnerReply('السعر النهائي ١٤ مليون كاش')).toBe('negotiation');
    });

    it('normalizes Egyptian WhatsApp chatIds and Arabic-Indic digits to E.164', () => {
      expect(normalizeOwnerPhone('201092048333@c.us')).toBe('+201092048333');
      expect(normalizeOwnerPhone('٠١٠٣٢٢٠٦٤٤٣')).toBe('+201032206443');
    });
  });
});
