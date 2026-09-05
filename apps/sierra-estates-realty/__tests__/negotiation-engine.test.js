import { NegotiationEngine } from '../../../packages/agents-core/src/negotiation-engine';

describe('NegotiationEngine Multi-Party Simulation', () => {
  it('reaches compromise when buyer offers realistic discount', () => {
    const askingPrice = 38000000;
    const buyerOffer = 34000000; // ~10.5% discount

    const result = NegotiationEngine.simulateNegotiation(askingPrice, buyerOffer);
    expect(result.status).toBe('agreement_reached');
    expect(result.finalPrice).toBeDefined();
    expect(result.commissionFeeEGP).toBeGreaterThan(0);
    expect(result.rounds.length).toBeGreaterThanOrEqual(2);
  });

  it('calculates 2.5% standard commission on final agreed price', () => {
    const askingPrice = 20000000;
    const buyerOffer = 19000000;

    const result = NegotiationEngine.simulateNegotiation(askingPrice, buyerOffer);
    expect(result.commissionFeeEGP).toBe(Math.round((result.finalPrice || 19000000) * 0.025));
  });
});
