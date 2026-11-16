import { describe, it, expect } from 'vitest';
import { normalizePhone, normalizeChatId, toWesternDigits } from '../lib/phone-utils';

describe('Phone Normalization & Edge Cases', () => {
  it('converts Arabic-Indic digits to Western numerals', () => {
    expect(toWesternDigits('٠١٠١٢٣٤٥٦٧٨')).toBe('01012345678');
    expect(normalizePhone('٠١٠١٢٣٤٥٦٧٨')).toBe('201012345678');
  });

  it('normalizes standard 11-digit Egyptian local numbers (010, 011, 012, 015)', () => {
    expect(normalizePhone('01012345678')).toBe('201012345678');
    expect(normalizePhone('01123456789')).toBe('201123456789');
    expect(normalizePhone('01234567890')).toBe('201234567890');
    expect(normalizePhone('01512345678')).toBe('201512345678');
  });

  it('handles Excel stripped leading 0 (10-digit numbers: 10, 11, 12, 15)', () => {
    expect(normalizePhone('1012345678')).toBe('201012345678');
    expect(normalizePhone('1123456789')).toBe('201123456789');
    expect(normalizePhone('1234567890')).toBe('201234567890');
    expect(normalizePhone('1512345678')).toBe('201512345678');
  });

  it('preserves valid 12-digit Egyptian numbers already starting with 20', () => {
    expect(normalizePhone('201012345678')).toBe('201012345678');
    expect(normalizePhone('+201012345678')).toBe('201012345678');
    expect(normalizePhone('00201012345678')).toBe('201012345678');
  });

  it('fixes duplicate country code: 202010... (14 digits) -> 2010...', () => {
    expect(normalizePhone('20201012345678')).toBe('201012345678');
    expect(normalizePhone('+20201012345678')).toBe('201012345678');
    expect(normalizePhone('0020201012345678')).toBe('201012345678');
  });

  it('fixes duplicate 2 prefix: 22010... (13 digits) -> 2010...', () => {
    expect(normalizePhone('2201012345678')).toBe('201012345678');
    expect(normalizePhone('+2201012345678')).toBe('201012345678');
  });

  it('fixes 20010... (13 digits: 20 prepended to 010 without stripping 0) -> 2010...', () => {
    expect(normalizePhone('2001012345678')).toBe('201012345678');
    expect(normalizePhone('+2001012345678')).toBe('201012345678');
    expect(normalizePhone('002001012345678')).toBe('201012345678');
  });

  it('formats chatId cleanly with @c.us', () => {
    expect(normalizeChatId('01012345678')).toBe('201012345678@c.us');
    expect(normalizeChatId('1012345678')).toBe('201012345678@c.us');
    expect(normalizeChatId('201012345678')).toBe('201012345678@c.us');
    expect(normalizeChatId('+2001012345678')).toBe('201012345678@c.us');
    expect(normalizeChatId('2201012345678')).toBe('201012345678@c.us');
    expect(normalizeChatId('20201012345678')).toBe('201012345678@c.us');
    expect(normalizeChatId('120363025544883441@g.us')).toBe('120363025544883441@g.us');
  });

  it('preserves valid international numbers (GCC/UAE/KSA)', () => {
    expect(normalizePhone('+971501234567')).toBe('971501234567');
    expect(normalizePhone('00966501234567')).toBe('966501234567');
  });

  it('rejects invalid or blank phones cleanly', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('123')).toBeNull();
    expect(normalizeChatId('')).toBe('');
    expect(normalizeChatId('invalid')).toBe('');
  });
});
