import { describe, it, expect } from 'vitest';
import { extractAttachedPhotos } from '../apps/sierra-estates-realty/lib/services/listing-normalize';

describe('WhatsApp Mobile Sync & Media Ingestion Suite', () => {
  it('extracts media from iOS tags, Android attachments, and direct image links', () => {
    const rawChat = `
[12/08/2026, 10:15 AM] Eng. Sherif: For sale in Mivida villa 450m pool view cash 42M <attached: mivida-front.jpg>
[12/08/2026, 11:45 AM] Dr. Mona: For rent in Villette sodic 380m https://images.unsplash.com/photo-luxury-pool.jpg
[12/08/2026, 01:20 PM] Sarah Owner: Apartment in Hyde Park 200m 3BR IMG-20260812-WA0088.jpg (file attached)
    `.trim();

    const photos = extractAttachedPhotos(rawChat);
    expect(photos.length).toBe(3);
    expect(photos).toContain('/media/whatsapp/mivida-front.jpg');
    expect(photos).toContain('https://images.unsplash.com/photo-luxury-pool.jpg');
    expect(photos).toContain('/media/whatsapp/IMG-20260812-WA0088.jpg');
  });

  it('handles empty or text-only messages without failing', () => {
    const textOnly = '[12/08/2026, 02:00 PM] John: Just checking availability.';
    const photos = extractAttachedPhotos(textOnly);
    expect(photos).toEqual([]);
  });
});
