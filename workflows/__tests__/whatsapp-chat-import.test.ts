import { describe, it, expect } from 'vitest';
import { parseWhatsAppExport, extractUnitDetails, parseGroupedListings, normalizePhone } from '../../scripts/import-whatsapp-chat.mjs';

describe('WhatsApp Chat Import & Harvester Engine', () => {
  it('normalizes Egyptian mobile numbers across formats', () => {
    expect(normalizePhone('01012345678')).toBe('201012345678');
    expect(normalizePhone('+201123456789')).toBe('201123456789');
    expect(normalizePhone('201223456780')).toBe('201223456780');
    expect(normalizePhone('01512345678')).toBe('201512345678');
  });

  it('parses multi-line WhatsApp export format', () => {
    const rawChat = `
[10/24/26, 1:45:12 PM] Owner Ahmed: للبيع فيلا مستقلة في كمبوند ميفيدا
مساحة 350 متر
مطلوب 45 مليون كاش
للتواصل 01001234567
[10/24/26, 1:46:00 PM] Member: تمام شكرا
[10/24/26, 2:10:15 PM] Owner Mahmoud: شقة للإيجار في ايست تاون سوديك 180م مطلوب 80 الف 01122334455
`.trim();

    const messages = parseWhatsAppExport(rawChat);
    expect(messages).toHaveLength(3);
    expect(messages[0].sender).toBe('Owner Ahmed');
    expect(messages[0].text).toContain('ميفيدا');

    const unit1 = extractUnitDetails(messages[0], 'Owners Group');
    expect(unit1).not.toBeNull();
    expect(unit1?.compound).toBe('Mivida');
    expect(unit1?.propertyType).toBe('Standalone Villa');
    expect(unit1?.dealType).toBe('Sale');
    expect(unit1?.price).toBe(45000000);
    expect(unit1?.areaSqm).toBe(350);
    expect(unit1?.ownerPhone).toBe('201001234567');

    const nonUnit = extractUnitDetails(messages[1], 'Owners Group');
    expect(nonUnit).toBeNull();

    const unit2 = extractUnitDetails(messages[2], 'Owners Group');
    expect(unit2).not.toBeNull();
    expect(unit2?.compound).toBe('Eastown Sodic');
    expect(unit2?.dealType).toBe('Rent');
    expect(unit2?.price).toBe(80000);
    expect(unit2?.ownerPhone).toBe('201122334455');
  });

  it('groups consecutive media attachments and follow-up specs from same sender', () => {
    const rawChat = `
5/15/25, 6:11 PM - Hagar Mohamed: Furnished Apartment for Rent in Fifth Square Compound by Al Marasem
3 Bedrooms
2 Bathrooms
First-time Use
5/15/25, 6:11 PM - Hagar Mohamed: 55k
5/15/25, 6:11 PM - Hagar Mohamed: IMG-20250512-WA0041.jpg (file attached)
5/15/25, 6:11 PM - Hagar Mohamed: IMG-20250512-WA0042.jpg (file attached)
5/15/25, 6:11 PM - Hagar Mohamed: IMG-20250512-WA0043.jpg (file attached)
5/15/25, 6:12 PM - Other Agent: Available?
`.trim();

    const messages = parseWhatsAppExport(rawChat);
    expect(messages.length).toBeGreaterThanOrEqual(6);

    const units = parseGroupedListings(messages, 'Test Group');
    expect(units).toHaveLength(1);
    expect(units[0].compound).toBe('Fifth Square');
    expect(units[0].price).toBe(55000);
    expect(units[0].bedrooms).toBe(3);
    expect(units[0].bathrooms).toBe(2);
    expect(units[0].dealType).toBe('Rent');
    expect(units[0].attachedPhotos).toEqual([
      'IMG-20250512-WA0041.jpg',
      'IMG-20250512-WA0042.jpg',
      'IMG-20250512-WA0043.jpg'
    ]);
  });
});
