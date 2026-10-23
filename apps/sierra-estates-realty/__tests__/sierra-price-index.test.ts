import { PriceIndexService } from '../lib/services/PriceIndexService';

describe('Phase 5: Sierra Price Index (04 §B1)', () => {
  it('computes monthly compound price index with complete market telemetry', async () => {
    const index = await PriceIndexService.getMonthlyPriceIndex('2026-10');

    expect(index).toBeDefined();
    expect(index.period).toBe('2026-10');
    expect(index.publishedAt).toContain('2026-10');

    // Market summary
    const summary = index.marketSummary;
    expect(summary.avgPricePerSqm).toBeGreaterThan(20000);
    expect(summary.momChangePercent).toBeGreaterThan(0);
    expect(summary.yoyChangePercent).toBeGreaterThan(0);
    expect(summary.totalAnalyzedUnits).toBeGreaterThan(50);
    expect(summary.totalTrackedCompounds).toBeGreaterThan(0);
    expect(summary.currency).toBe('EGP');
    expect(summary.topAppreciatingCompound.nameEn).toBeDefined();

    // Compounds list
    expect(index.compounds.length).toBeGreaterThan(0);
    const first = index.compounds[0];
    expect(first.nameEn).toBeDefined();
    expect(first.nameAr).toBeDefined();
    expect(first.zone).toBeDefined();
    expect(first.avgPricePerSqm).toBeGreaterThan(0);
    expect(first.projected3YrROI).toBeGreaterThan(0);
    expect(first.annualRentalYield).toBeGreaterThan(0);
    expect(['Ultra Luxury', 'Prime Luxury', 'Emerging Prime']).toContain(first.tier);

    // Compounds should be sorted descending by avgPricePerSqm
    for (let i = 0; i < index.compounds.length - 1; i++) {
      expect(index.compounds[i].avgPricePerSqm).toBeGreaterThanOrEqual(index.compounds[i + 1].avgPricePerSqm);
    }

    // Historical trend sequence
    expect(index.historicalTrend).toHaveLength(6);
    expect(index.historicalTrend[0].month).toBe('2026-05');
    expect(index.historicalTrend[5].month).toBe('2026-10');
    expect(index.historicalTrend[5].indexBase100).toBeGreaterThan(index.historicalTrend[0].indexBase100);
  });

  it('records monthly snapshot idempotently for cron jobs', async () => {
    const snapshot = await PriceIndexService.recordMonthlySnapshot('2026-11');
    expect(snapshot.period).toBe('2026-11');
    expect(snapshot.compounds.length).toBeGreaterThan(0);
  });

  it('generates compliant Schema.org Dataset JSON-LD metadata', async () => {
    const index = await PriceIndexService.getMonthlyPriceIndex('2026-10');
    const schema = PriceIndexService.generateDatasetSchema(index);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('Dataset');
    expect(schema.name).toContain('Sierra Price Index');
    expect(schema.temporalCoverage).toBe('2026-10-01/2026-10-28');
    expect(schema.spatialCoverage['@type']).toBe('Place');
    expect(schema.spatialCoverage.name).toContain('New Cairo');
    expect(Array.isArray(schema.variableMeasured)).toBe(true);
    expect(schema.variableMeasured.length).toBeGreaterThanOrEqual(2);
  });
});
