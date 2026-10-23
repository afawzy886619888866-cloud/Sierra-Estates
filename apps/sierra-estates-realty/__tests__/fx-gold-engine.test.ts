import { FxGoldValuationEngine } from '../../../packages/agents-core/src/fx-gold-engine';

describe('FxGoldValuationEngine Currency & Gold Parity', () => {
  it('calculates USD and 21K gold weight equivalent accurately', () => {
    const priceEGP = 48650000; // ~1M USD at 48.65 rate

    const parity = FxGoldValuationEngine.calculateParity(priceEGP);

    expect(parity.usdEquivalent).toBe(1000000);
    expect(parity.aedEquivalent).toBeGreaterThan(3000000);
    expect(parity.gold21kGramsEquivalent).toBeGreaterThan(10000);
    expect(parity.formattedDisplay.usd).toContain('1000k USD');
    expect(parity.formattedDisplay.gold21k).toContain('kg');
  });
});
