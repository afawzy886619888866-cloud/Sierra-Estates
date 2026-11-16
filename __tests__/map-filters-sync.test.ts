import { describe, it, expect } from 'vitest';
import { NEW_CAIRO_COMPOUNDS } from '../apps/sierra-estates-realty/components/Maps/compounds-data';
import { COMPOUND_DEVELOPERS, NEW_CAIRO_ZONES } from '../apps/sierra-estates-realty/components/site/CompoundsMap';
import { HZDATA } from '../apps/sierra-estates-realty/lib/site/data';

describe('Map & Filter Synchronization Suite', () => {
  it('should include Cairo Plaza (Al-Mataria Metro) in compound GPS catalog', () => {
    const cairoPlaza = NEW_CAIRO_COMPOUNDS.find((c) => c.nameEn === 'Cairo Plaza' || c.code === 'CPZ');
    expect(cairoPlaza).toBeDefined();
    expect(cairoPlaza?.code).toBe('CPZ');
    expect(cairoPlaza?.lat).toBe(30.129);
    expect(cairoPlaza?.lng).toBe(31.312);
    expect(cairoPlaza?.developer).toBe('Commercial Transit');
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
    expect(siteCpd?.c).toEqual([30.129, 31.312]);
    expect(siteCpd?.dev).toBe('Commercial Transit');
    expect(HZDATA.compoundNamesAr['Cairo Plaza']).toBe('كايرو بلازا');
  });

  it('correctly filters HZDATA compounds based on budget ranges', () => {
    // Under 10M
    const under10M = HZDATA.compounds.filter((c) => c.priceM < 10);
    expect(under10M.length).toBeGreaterThan(0);

    // 35M+
    const over35M = HZDATA.compounds.filter((c) => c.priceM >= 35);
    expect(over35M.length).toBeGreaterThan(0);
  });

  it('correctly matches compound by search query against name and developer', () => {
    const query = 'cairo plaza';
    const matches = HZDATA.compounds.filter((c) => {
      const dev = COMPOUND_DEVELOPERS[c.n] || c.dev || '';
      return c.n.toLowerCase().includes(query) || dev.toLowerCase().includes(query);
    });
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches.some((m) => m.n === 'Cairo Plaza')).toBe(true);
  });
});
