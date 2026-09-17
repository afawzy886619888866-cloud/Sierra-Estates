import { describe, it, expect } from 'vitest';
import { parseRawWhatsAppChatLog, extractAttachedPhotos } from '../scripts/extract-whatsapp-chat';
import { extractImageUrls, mapRowToUnit } from '../apps/sierra-estates-realty/lib/services/listing-normalize';
import { AirtableIntegrationService } from '../apps/sierra-estates-realty/lib/services/AirtableIntegrationService';

describe('WhatsApp Ingestion, Airtable Photos & Live Map Sync Suite', () => {
  describe('WhatsApp Chat & Media Extraction', () => {
    it('extracts direct image URLs and attachment tags from chat text', () => {
      const sampleText = `
[24/08/2026, 10:15 AM] Ahmed: للبيع في هايد بارك شقة 200م بفيو مميز <attached: hyde-park-01.jpg>
[24/08/2026, 11:30 AM] Karim: فيلا في ميفيدا بسعر مميز https://images.unsplash.com/photo-luxury.jpg
[24/08/2026, 12:45 PM] Sarah: شقة في مدينتي IMG-20260824-WA0099.jpg (file attached)
      `.trim();

      const messages = parseRawWhatsAppChatLog(sampleText, 'Luxury WhatsApp Group');
      expect(messages.length).toBe(3);

      expect(messages[0].attachedPhotos?.length).toBe(1);
      expect(messages[0].attachedPhotos?.[0]).toContain('hyde-park-01.jpg');

      expect(messages[1].attachedPhotos?.length).toBe(1);
      expect(messages[1].attachedPhotos?.[0]).toBe('https://images.unsplash.com/photo-luxury.jpg');

      expect(messages[2].attachedPhotos?.length).toBe(1);
      expect(messages[2].attachedPhotos?.[0]).toContain('IMG-20260824-WA0099.jpg');

      const directExtracted = extractAttachedPhotos(sampleText);
      expect(directExtracted.some((p) => p.includes('hyde-park-01.jpg'))).toBe(true);
    });
  });

  describe('Airtable & Inventory Photo Normalization', () => {
    it('normalizes string URLs, comma-separated URLs, and Airtable attachment arrays', () => {
      // 1. Plain URL
      const single = extractImageUrls('https://images.unsplash.com/photo-1.jpg');
      expect(single).toEqual(['https://images.unsplash.com/photo-1.jpg']);

      // 2. Comma-separated
      const multi = extractImageUrls('https://example.com/1.jpg, https://example.com/2.jpg');
      expect(multi).toEqual(['https://example.com/1.jpg', 'https://example.com/2.jpg']);

      // 3. Airtable Attachment format: array of objects with url
      const airtableAttachments = [
        { id: 'att1', url: 'https://v5.airtableusercontent.com/photo1.jpg', filename: 'exterior.jpg' },
        { id: 'att2', url: 'https://v5.airtableusercontent.com/photo2.jpg', filename: 'interior.jpg' },
      ];
      const parsedAirtable = extractImageUrls(airtableAttachments);
      expect(parsedAirtable).toEqual([
        'https://v5.airtableusercontent.com/photo1.jpg',
        'https://v5.airtableusercontent.com/photo2.jpg',
      ]);
    });

    it('maps Airtable row with Photos into Unit with featuredImage and images', () => {
      const airtableRow = {
        Code: 'MIV-AP-99',
        Name: 'Ahmed Owner',
        Location: 'Mivida',
        'Property Type': 'Apartment',
        'Unit Price': '12,500,000',
        Bedrooms: '3',
        Space: '180',
        Photos: [
          { url: 'https://v5.airtableusercontent.com/unit-main.jpg' },
          { url: 'https://v5.airtableusercontent.com/unit-terrace.jpg' },
        ],
      };

      const unit = mapRowToUnit(airtableRow, { ownerType: 'owner', syncSource: 'airtable' });
      expect(unit).toBeDefined();
      expect(unit?.code).toBe('MIV-AP-99');
      expect(unit?.compound).toBe('Mivida');
      expect(unit?.price).toBe(12500000);
      expect(unit?.featuredImage).toBe('https://v5.airtableusercontent.com/unit-main.jpg');
      expect(unit?.images).toEqual([
        'https://v5.airtableusercontent.com/unit-main.jpg',
        'https://v5.airtableusercontent.com/unit-terrace.jpg',
      ]);
    });

    it('unitToAirtableFields formats Photos attachment array and Image URL for export', () => {
      const unit = {
        code: 'HP-VL-10',
        title: 'Modern Villa',
        compound: 'Hyde Park',
        price: 28000000,
        propertyType: 'villa' as const,
        featuredImage: 'https://images.unsplash.com/photo-hp.jpg',
        images: ['https://images.unsplash.com/photo-hp.jpg', 'https://images.unsplash.com/photo-hp2.jpg'],
      };

      const airtableFields = AirtableIntegrationService.unitToAirtableFields('123', unit);
      expect(airtableFields).toBeDefined();
      expect(airtableFields?.Code).toBe('HP-VL-10');
      expect(airtableFields?.['Image URL']).toBe('https://images.unsplash.com/photo-hp.jpg');
      expect(airtableFields?.Photos).toEqual([
        { url: 'https://images.unsplash.com/photo-hp.jpg' },
        { url: 'https://images.unsplash.com/photo-hp2.jpg' },
      ]);
    });
  });
});
