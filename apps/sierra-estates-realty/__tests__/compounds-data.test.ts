/**
 * Compound Location Data — Unit Tests
 */

import { NEW_CAIRO_COMPOUNDS, CompoundLocation } from '../components/Maps/compounds-data';

describe('New Cairo Compounds Data', () => {
  it('contains expected compound entries', () => {
    expect(NEW_CAIRO_COMPOUNDS.length).toBeGreaterThanOrEqual(15);
  });

  it('all compounds have valid codes, names, developers, coordinates, and unit counts', () => {
    NEW_CAIRO_COMPOUNDS.forEach((c: CompoundLocation) => {
      expect(typeof c.code).toBe('string');
      expect(c.code.length).toBeGreaterThan(0);
      expect(typeof c.nameEn).toBe('string');
      expect(typeof c.nameAr).toBe('string');
      expect(typeof c.developer).toBe('string');
      expect(typeof c.lat).toBe('number');
      expect(c.lat).toBeGreaterThan(29);
      expect(c.lat).toBeLessThan(31);
      expect(typeof c.lng).toBe('number');
      expect(c.lng).toBeGreaterThan(30.5);
      expect(c.lng).toBeLessThan(32);
      expect(typeof c.unitsCount).toBe('number');
      expect(c.unitsCount).toBeGreaterThan(0);
    });
  });

  it('includes core compounds: Hyde Park, Mivida, Mountain View iCity', () => {
    const codes = NEW_CAIRO_COMPOUNDS.map((c) => c.code);
    expect(codes).toContain('HP');
    expect(codes).toContain('MIV');
    expect(codes).toContain('MVI');
  });
});
