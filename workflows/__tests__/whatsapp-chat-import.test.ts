import { describe, it, expect } from 'vitest';
import { parseWhatsAppExport, extractUnitDetails, normalizePhone } from '../../scripts/import-whatsapp-chat.mjs';

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
});
