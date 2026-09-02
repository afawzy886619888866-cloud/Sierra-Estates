import {
  ArbitrageScannerEngine,

} from '../../../packages/agents-core/src/arbitrage-scanner';

describe('ArbitrageScannerEngine Market Pricing Divergence', () => {
  it('detects undervalued opportunities with > 10% discount margin', () => {
    const listings = [
      {
        id: 'list_undervalued_01',
        compoundName: 'Mivida',
        unitType: 'Standalone Villa',
        buaSqm: 400, // Benchmark 110k/sqm = 44M fair value
        askingPriceEGP: 38000000, // ~13.6% discount
        brokerName: 'Karim El-Shazly',
        brokerPhone: '+201012345678',
      },
      {
        id: 'list_fair_value_02',
        compoundName: 'Hyde Park',
        unitType: 'Twin House',
        buaSqm: 250, // Benchmark 85k/sqm = 21.25M fair value
        askingPriceEGP: 22000000, // Over fair value
        brokerName: 'Nadine Mansour',
        brokerPhone: '+201098765432',
      },
    ];

    const opportunities = ArbitrageScannerEngine.scanListings(listings);

    expect(opportunities.length).toBe(1);
    expect(opportunities[0].compoundName).toBe('Mivida');
    expect(opportunities[0].discountPercent).toBeGreaterThanOrEqual(10);
    expect(opportunities[0].isHighConfidenceArbitrage).toBe(true);
    expect(opportunities[0].alertBroadcastPayload.ar).toContain('Arbitrage Alert');
  });
});
