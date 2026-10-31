jest.mock('leaflet', () => ({}));

import {
  NEW_CAIRO_MASTERPLANS,
  DEFAULT_UNITS,
  SUBFEATURE_STYLES,
  MasterplanCompound,
  PropertyUnit,
} from '../components/Maps/SpatialMasterplanMap';

describe('SpatialMasterplanMap Specifications & Data', () => {
  it('defines all core New Cairo masterplan compounds with GPS polygons', () => {
    expect(NEW_CAIRO_MASTERPLANS.length).toBeGreaterThanOrEqual(3);

    const mivida = NEW_CAIRO_MASTERPLANS.find((c) => c.id === 'mivida');
    expect(mivida).toBeDefined();
    expect(mivida?.polygon.length).toBeGreaterThanOrEqual(4);
    expect(mivida?.subfeatures.length).toBeGreaterThanOrEqual(1);

    const hydepark = NEW_CAIRO_MASTERPLANS.find((c) => c.id === 'hydepark');
    expect(hydepark).toBeDefined();
    expect(hydepark?.polygon.length).toBeGreaterThanOrEqual(4);

    const icity = NEW_CAIRO_MASTERPLANS.find((c) => c.id === 'icity');
    expect(icity).toBeDefined();
    expect(icity?.polygon.length).toBeGreaterThanOrEqual(4);
  });

  it('validates subfeature styling and category definitions', () => {
    expect(SUBFEATURE_STYLES.lagoon).toBeDefined();
    expect(SUBFEATURE_STYLES.lagoon.fillColor).toBe('#06b6d4');
    expect(SUBFEATURE_STYLES.greenspine.fillColor).toBe('#10b981');
    expect(SUBFEATURE_STYLES.golf.fillColor).toBe('#84cc16');
    expect(SUBFEATURE_STYLES.clubhouse.fillColor).toBe('#f59e0b');
  });

  it('validates default property units have valid coordinates and prices', () => {
    expect(DEFAULT_UNITS.length).toBeGreaterThanOrEqual(3);
    DEFAULT_UNITS.forEach((unit: PropertyUnit) => {
      expect(typeof unit.id).toBe('string');
      expect(typeof unit.priceFormatted).toBe('string');
      expect(unit.lat).toBeGreaterThan(29.9);
      expect(unit.lat).toBeLessThan(30.2);
      expect(unit.lng).toBeGreaterThan(31.3);
      expect(unit.lng).toBeLessThan(31.8);
      expect(unit.roiEstimate).toBeDefined();
    });
  });

  it('ensures all compound polygons have valid GPS bounding boxes', () => {
    NEW_CAIRO_MASTERPLANS.forEach((compound: MasterplanCompound) => {
      expect(compound.center[0]).toBeGreaterThan(29.9);
      expect(compound.center[1]).toBeGreaterThan(31.3);
      expect(compound.installmentYears).toBeGreaterThan(0);
      expect(compound.downPayment).toBeDefined();
      expect(compound.roiAnnual).toBeDefined();

      compound.polygon.forEach(([lat, lng]) => {
        expect(lat).toBeGreaterThan(29.9);
        expect(lat).toBeLessThan(30.2);
        expect(lng).toBeGreaterThan(31.3);
        expect(lng).toBeLessThan(31.8);
      });
    });
  });
});
