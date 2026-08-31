import { WealthPortfolioEngine, PortfolioAssetInput } from '../../../packages/agents-core/src/wealth-engine';

describe('WealthPortfolioEngine Simulation & Forecasts', () => {
  it('calculates portfolio yields and 5-year capital growth accurately', () => {
    const assets: PortfolioAssetInput[] = [
      {
        compoundName: 'Mivida',
        unitType: 'standalone_villa',
        purchasePriceEGP: 40000000,
        expectedAnnualGrossRentEGP: 3600000, // 9%
        projectedAnnualAppreciationPercent: 18,
      },
      {
        compoundName: 'Hyde Park',
        unitType: 'twin_house',
        purchasePriceEGP: 20000000,
        expectedAnnualGrossRentEGP: 2000000, // 10%
        projectedAnnualAppreciationPercent: 20,
      },
    ];

    const result = WealthPortfolioEngine.simulatePortfolio(assets);

    expect(result.totalCapitalInvestedEGP).toBe(60000000);
    expect(result.blendedGrossYieldPercent).toBeCloseTo(9.33, 1);
    expect(result.blendedNetYieldPercent).toBeCloseTo(8.4, 1);
    expect(result.fiveYearProjectedValuationEGP).toBeGreaterThan(120000000);
    expect(result.inflationHedgeIndexScore).toBeGreaterThanOrEqual(80);
    expect(result.assetBreakdown.length).toBe(2);
  });

  it('throws error when portfolio is empty', () => {
    expect(() => WealthPortfolioEngine.simulatePortfolio([])).toThrow('Portfolio requires at least one asset.');
  });
});
