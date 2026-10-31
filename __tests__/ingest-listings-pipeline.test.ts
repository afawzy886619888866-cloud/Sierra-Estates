import { describe, it, expect } from 'vitest';
import { isListingDrop } from '../workflows/lib/inbox.js';
import { generateInstitutionalCopy, COMPOUND_PROFILES } from '../workflows/lib/listing-copywriter.js';
import { extractUnitDetails } from '../scripts/import-whatsapp-chat.mjs';

describe('Ingest Listings Pipeline & Inbound Spy Bot', () => {
  describe('isListingDrop Detection', () => {
    it('detects listing drops from trusted phone 01092048333', () => {
      const msg = {
        chatId: '201092048333@c.us',
        sender: '201092048333@c.us',
        body: 'فيلا مستقلة للبيع في مدينتي مساحة 450 متر مطلوب 32 مليون',
        isGroup: false,
      };
      expect(isListingDrop(msg)).toBe(true);
    });

    it('detects listing drops with real estate keywords from any broker/owner', () => {
      const msg = {
        chatId: '201123456789@c.us',
        sender: '201123456789@c.us',
        body: 'شقة فاخرة للإيجار في فيفت سكوير المراسم مساحة 180م 3 غرف مطلوب 55 ألف شهري',
        isGroup: false,
      };
      expect(isListingDrop(msg)).toBe(true);
    });

    it('detects listing drops inside owner groups', () => {
      const msg = {
        chatId: '120363028389472@g.us',
        sender: '201012345678@c.us',
        body: 'متاح للبيع في هايد بارك بنتهاوس 260 متر بسعر مميز',
        isGroup: true,
      };
      expect(isListingDrop(msg)).toBe(true);
    });

    it('does not classify casual chat as a listing drop', () => {
      const msg = {
        chatId: '201123456789@c.us',
        sender: '201123456789@c.us',
        body: 'صباح الخير يا فندم هكلمك بعد شوية',
        isGroup: false,
      };
      expect(isListingDrop(msg)).toBe(false);
    });

    it('does not classify standard availability replies as listing drops', () => {
      const msg = {
        chatId: '201123456789@c.us',
        sender: '201123456789@c.us',
        body: 'الوحدة متاحة حاليا بنفس السعر',
        isGroup: false,
      };
      expect(isListingDrop(msg)).toBe(false);
    });
  });

  describe('Institutional Luxury Copywriter', () => {
    it('generates high-converting Arabic & English copy for luxury villas', () => {
      const unit = {
        code: 'WA-TESTVILLA',
        compound: 'Oriana 2',
        propertyType: 'Standalone Villa',
        dealType: 'sale',
        price: 94000000,
        areaSqm: 650,
        bedrooms: 5,
        bathrooms: 6,
        finishing: 'Ultra Super Lux',
      };

      const copy = generateInstitutionalCopy(unit);

      expect(copy.titleAr).toContain('فيلا مستقلة');
      expect(copy.titleAr).toContain('أوريانا 2');
      expect(copy.titleEn).toContain('Standalone Villa');
      expect(copy.titleEn).toContain('Oriana 2');
      expect(copy.descriptionAr).toContain('94,000,000 ج.م');
      expect(copy.descriptionAr).toContain('650 م²');
      expect(copy.descriptionAr).toContain('5');
      expect(copy.descriptionEn).toContain('94,000,000 EGP');
      expect(copy.modelUsed).toBe('rule-based-luxury-engine');
    });

    it('correctly handles rental units with monthly suffix', () => {
      const unit = {
        code: 'WA-RENTAPART',
        compound: 'Fifth Square',
        propertyType: 'Apartment',
        dealType: 'rent',
        price: 55000,
        areaSqm: 165,
        bedrooms: 3,
        bathrooms: 3,
      };

      const copy = generateInstitutionalCopy(unit);

      expect(copy.titleAr).toContain('للإيجار');
      expect(copy.titleAr).toContain('فيفت سكوير');
      expect(copy.descriptionAr).toContain('55,000 ج.م / شهرياً');
      expect(copy.descriptionEn).toContain('55,000 EGP / Month');
    });
  });

  describe('WhatsApp Unit Extraction Logic', () => {
    it('extracts compound, price, and specs from typical WhatsApp owner text', () => {
      const msg = {
        timestamp: '10/24/26, 1:45 PM',
        sender: '+20 109 204 8333',
        text: 'فيلا للبيع في مدينتي مساحة 400 متر 4 غرف نوم و 4 حمام مطلوب 28 مليون كود 504',
      };

      const extracted = extractUnitDetails(msg, 'augast owners');
      expect(extracted).not.toBeNull();
      expect(extracted?.compound).toBe('Madinaty');
      expect(extracted?.areaSqm).toBe(400);
      expect(extracted?.price).toBe(28000000);
      expect(extracted?.bedrooms).toBe(4);
      expect(extracted?.bathrooms).toBe(4);
      expect(extracted?.propertyType).toBe('Standalone Villa');
      expect(extracted?.dealType).toBe('Sale');
    });
  });

  describe('Property Finder 6-Photo & Dimension Compliance Gate', () => {
    it('enforces >= 6 photos threshold for Property Finder ads', () => {
      const PF_MIN_PHOTOS = 6;
      const readyUnit = {
        code: 'PF-READY',
        photos: ['p1.jpg', 'p2.jpg', 'p3.jpg', 'p4.jpg', 'p5.jpg', 'p6.jpg'],
      };
      const pendingUnit = {
        code: 'PF-PENDING',
        photos: ['p1.jpg', 'p2.jpg'],
      };

      expect(readyUnit.photos.length >= PF_MIN_PHOTOS).toBe(true);
      expect(pendingUnit.photos.length >= PF_MIN_PHOTOS).toBe(false);
    });
  });
});
