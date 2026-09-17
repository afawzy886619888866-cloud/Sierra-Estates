import { describe, it, expect } from 'vitest';
import { NEW_CAIRO_COMPOUNDS, COMPOUND_DEVELOPERS, NEW_CAIRO_ZONES } from '../components/Maps/compounds-data';
import { HZDATA } from '../lib/site/data';

describe('Map & Filter Synchronization Suite', () => {
  it('should include Cairo Plaza (Al-Mataria Metro) in compound catalog', () => {
    const cairoPlaza = NEW_CAIRO_COMPOUNDS.find((c) => c.name === 'Cairo Plaza');
    expect(cairoPlaza).toBeDefined();
    expect(cairoPlaza?.code).toBe('CPZ');
    expect(cairoPlaza?.coords).toEqual([30.129, 31.312]);
    expect(cairoPlaza?.aiScore).toBe(9.9);
  });

  it('should map Cairo Plaza to Commercial Transit in COMPOUND_DEVELOPERS', () => {
    expect(COMPOUND_DEVELOPERS['Cairo Plaza']).toBe('Commercial Transit');
  });

  it('should include Transit zone in NEW_CAIRO_ZONES', () => {
    const transitZone = NEW_CAIRO_ZONES.find((z) => z.key === 'Transit');
    expect(transitZone).toBeDefined();
    expect(transitZone?.label).toContain('Cairo Plaza Metro');
    expect(transitZone?.center).toEqual([30.129, 31.312]);
  });

  it('should include Cairo Plaza in HZDATA.compounds with dual language names', () => {
    const siteCpd = HZDATA.compounds.find((c) => c.n === 'Cairo Plaza');
    expect(siteCpd).toBeDefined();
    expect(siteCpd?.coords).toEqual([30.129, 31.312]);
    expect(siteCpd?.t).toBe('Commercial');
    expect(HZDATA.compoundNamesAr['Cairo Plaza']).toBe('كايرو بلازا (مترو المطرية)');
  });

  it('correctly filters compounds based on budget ranges', () => {
    // Under 10M
    const under10M = NEW_CAIRO_COMPOUNDS.filter((c) => {
      const p = c.priceMin;
      return p ? p < 10000000 : false;
    });
    expect(under10M.length).toBeGreaterThan(0);

    // 35M+
    const over35M = NEW_CAIRO_COMPOUNDS.filter((c) => {
      const p = c.priceMin;
      return p ? p >= 35000000 : false;
    });
    expect(over35M.length).toBeGreaterThan(0);
  });

  it('correctly matches compound by search query', () => {
    const query = 'cairo plaza';
    const matches = NEW_CAIRO_COMPOUNDS.filter((c) => {
      const dev = COMPOUND_DEVELOPERS[c.name] || '';
      return c.name.toLowerCase().includes(query) || dev.toLowerCase().includes(query);
    });
    expect(matches.length).toBe(1);
    expect(matches[0].name).toBe('Cairo Plaza');
  });
});
