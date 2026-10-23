import {
  evaluatePropertyValuation,
  RealEstateValuationAgent,
} from '../../../packages/agents/tools/valuationArbitrageEngine';

describe('Real Estate Valuation & Arbitrage Analyzer Engine', () => {
  const agent = new RealEstateValuationAgent('EGP');

  describe('Scenario 1: Shorouk Springs Villa (Standard Investment Play)', () => {
    it('evaluates 75k EGP/month rental income into a fair valuation range of 9M to 11.25M EGP', () => {
      const result = agent.analyze({
        property_type: 'villa',
        size_sqm: 400,
        location: 'Shorouk Springs',
        offered_rent: 75000,
        offered_purchase_price: 10500000,
        amenities: ['private pool', 'underground garage'],
      });

      // Annual income = 75,000 * 12 = 900,000 EGP
      expect(result.annual_income_generated).toBe(900000);

      // Conservative Cap Rate (10%) = 900,000 / 0.10 = 9,000,000 EGP
      expect(result.calculated_fair_value_range.conservative_cap_value).toBe(9000000);

      // Optimistic Cap Rate (8%) = 900,000 / 0.08 = 11,250,000 EGP
      expect(result.calculated_fair_value_range.optimistic_cap_value).toBe(11250000);

      // Payback period = 10,500,000 / 900,000 = 11.7 years
      expect(result.investment_metrics.payback_period_years).toBe(11.7);

      // Verdict: BUY (FAIR VALUE) because price is within capitalized range and payback <= 12 yrs
      expect(result.verdict).toBe('BUY (FAIR VALUE)');
      expect(result.offered_price_assessment.status).toBe('Fair Market Value');
    });

    it('flags overpriced listing if seller asks 18M for the same rental return', () => {
      const result = agent.analyze({
        property_type: 'villa',
        size_sqm: 400,
        location: 'Shorouk Springs',
        offered_rent: 75000,
        offered_purchase_price: 18000000,
      });

      // Payback period = 18,000,000 / 900,000 = 20.0 years
      expect(result.investment_metrics.payback_period_years).toBe(20.0);
      expect(result.verdict).toBe('OVERPRICED (NEGOTIATE OR RENT)');
      expect(result.offered_price_assessment.status).toBe('Overpriced');
    });
  });

  describe('Scenario 2: Cairo Plaza Admin Unit (Critical Arbitrage Play)', () => {
    it('detects massive arbitrage for admin unit priced at residential rates with high commercial yield', () => {
      const result = agent.analyze({
        property_type: 'administrative',
        size_sqm: 100,
        location: 'Cairo Plaza',
        offered_rent: 20000,
        offered_purchase_price: 1350000, // 13,500 EGP/sqm (residential price point)
        area_residential_avg_sqm_price: 14000,
        amenities: ['near metro', 'bank anchor', 'underground parking'],
      });

      // Annual rental income = 20,000 * 12 = 240,000 EGP
      expect(result.annual_income_generated).toBe(240000);

      // Implied Cap Rate = 240,000 / 1,350,000 = 17.78%
      expect(result.offered_price_assessment.implied_cap_rate_pct).toBe(17.78);

      // Payback period = 1,350,000 / 240,000 = 5.6 years (< 8.0 years)
      expect(result.investment_metrics.payback_period_years).toBe(5.6);

      // Arbitrage flag triggered
      expect(result.investment_metrics.is_arbitrage_play).toBe(true);
      expect(result.investment_metrics.arbitrage_alert).toContain('CRITICAL ARBITRAGE ALERT');

      // Verdict: BUY (MASSIVE ARBITRAGE)
      expect(result.verdict).toBe('BUY (MASSIVE ARBITRAGE)');
    });
  });

  describe('Value-Add Amenities & Lifts', () => {
    it('applies +20% underground parking, +15% bank anchor, and +10% metro proximity', () => {
      const result = evaluatePropertyValuation({
        property_type: 'commercial',
        offered_rent: 50000,
        amenities: ['underground parking', 'bank anchor', 'near metro'],
      });

      // Total lift = 20% + 15% + 10% = 45%
      expect(result.investment_metrics.total_premium_lift_pct).toBe(45);
      expect(Object.keys(result.investment_metrics.value_add_premiums_detected).length).toBe(3);
    });
  });
});
