import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fmtUSD,
  fmtEGP,
  fmtEGPM,
  fmtArea,
  fmtScore,
  fmtRelative,
  fmtPercent,
  fmtYield,
  fmtPaybackYears
} from '../apps/sierra-estates-realty/lib/format';

describe('Formatting Utilities', () => {
  describe('fmtUSD', () => {
    it('formats a number to USD currency', () => {
      const formatted = fmtUSD(1234567.89).replace(/\s/g, ' ');
      expect(formatted).toMatch(/\$1,234,568/); 
    });
  });

  describe('fmtEGP', () => {
    it('formats a number to EGP currency', () => {
      const formatted = fmtEGP(1234567.89).replace(/\s/g, ' ');
      expect(formatted).toMatch(/EGP\s?1,234,568/i);
    });
  });

  describe('fmtEGPM', () => {
    it('formats EGP per square meter', () => {
      expect(fmtEGPM(15.5)).toBe('15.5K EGP/m²');
    });
  });

  describe('fmtArea', () => {
    it('formats area with thousands separators', () => {
      expect(fmtArea(1234)).toBe('1,234 m²');
    });
  });

  describe('fmtScore', () => {
    it('formats null/undefined to 0.0', () => {
      expect(fmtScore(null)).toBe('0.0');
      expect(fmtScore(undefined)).toBe('0.0');
    });

    it('formats number to 1 decimal place', () => {
      expect(fmtScore(4.56)).toBe('4.6');
      expect(fmtScore(4)).toBe('4.0');
    });
  });

  describe('fmtRelative', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-27T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "just now" for times less than 1 minute ago', () => {
      expect(fmtRelative('2026-08-27T11:59:30Z')).toBe('just now');
    });

    it('returns "Xm ago" for times less than 60 minutes ago', () => {
      expect(fmtRelative('2026-08-27T11:45:00Z')).toBe('15m ago');
    });

    it('returns "Xh ago" for times less than 24 hours ago', () => {
      expect(fmtRelative('2026-08-27T10:00:00Z')).toBe('2h ago');
    });

    it('returns "Xd ago" for times less than 7 days ago', () => {
      expect(fmtRelative('2026-08-24T12:00:00Z')).toBe('3d ago');
    });

    it('returns "Xw ago" for times less than 4 weeks ago', () => {
      expect(fmtRelative('2026-08-10T12:00:00Z')).toBe('2w ago');
    });
  });

  describe('fmtPercent', () => {
    it('handles null and undefined', () => {
      expect(fmtPercent(null)).toBe('0%');
      expect(fmtPercent(undefined)).toBe('0%');
    });

    it('formats number to specified digits', () => {
      expect(fmtPercent(12.345)).toBe('12.3%'); 
      expect(fmtPercent(12.345, 2)).toBe('12.35%');
    });
  });

  describe('fmtYield and fmtPaybackYears', () => {
    it('calculates yield correctly', () => {
      expect(fmtYield(100000, 1000000)).toBe(10);
      expect(fmtYield(100000, 0)).toBe(0);
    });

    it('calculates payback years correctly', () => {
      expect(fmtPaybackYears(100000, 1000000)).toBe(10);
      expect(fmtPaybackYears(0, 1000000)).toBe(0);
    });
  });
});
