import { describe, it, expect } from 'vitest';
import { RealEstateValuationAgent } from '../apps/sierra-estates-realty/lib/valuationArbitrageEngine';

describe('Core Valuation, Arbitrage & Financial Engines Test Suite', () => {
  const agent = new RealEstateValuationAgent('EGP');

  describe('Income Capitalization & Fair Value Bounds', () => {
    it('should calculate fair market value range for residential property based on rental income', () => {
      const result = agent.analyze({
        property_type: 'residential',
        offered_purchase_price: 30_000_000,
        offered_rent: 200_000, // 2.4M EGP annual income
        size_sqm: 350,
        location: 'Mivida, New Cairo',
      });

      expect(result.annual_income_generated).toBe(2_400_000);
      // Residential Cap Baseline is 8% - 10%
      // 2.4M / 0.10 = 24,000,000 conservative
      // 2.4M / 0.08 = 30,000,000 optimistic
      expect(result.calculated_fair_value_range.conservative_cap_value).toBe(24_000_000);
      expect(result.calculated_fair_value_range.optimistic_cap_value).toBe(30_000_000);
      expect(result.offered_price_assessment.implied_cap_rate_pct).toBe(8.0);
      expect(result.investment_metrics.payback_period_years).toBe(12.5);
    });

    it('should adjust fair value for structural value-add amenities (e.g. underground garage & lake view)', () => {
      const result = agent.analyze({
        property_type: 'residential',
        offered_purchase_price: 30_000_000,
        offered_rent: 200_000,
        size_sqm: 350,
        amenities: ['underground garage', 'lake view'],
      });

      // Boost: +20% for underground garage, +10% for lake view = +30% boost
      expect(result.investment_metrics.total_premium_lift_pct).toBe(30);
      expect(result.calculated_fair_value_range.premium_adjusted_conservative).toBe(Math.round(24_000_000 * 1.3));
      expect(result.calculated_fair_value_range.premium_adjusted_optimistic).toBe(Math.round(30_000_000 * 1.3));
    });
  });

  describe('Commercial & Administrative Cap Rate Calculations', () => {
    it('should apply higher cap rates (12% - 15%) for retail/commercial spaces', () => {
      const result = agent.analyze({
        property_type: 'commercial',
        offered_purchase_price: 50_000_000,
        offered_rent: 600_000, // 7.2M EGP annual income
        size_sqm: 200,
        location: 'Golden Square Mall, New Cairo',
      });

      expect(result.annual_income_generated).toBe(7_200_000);
      // Commercial cap rate baseline: 12% - 15%
      expect(result.investment_metrics.target_cap_rate_range).toBe('12% - 15%');
      expect(result.offered_price_assessment.implied_cap_rate_pct).toBe(14.4);
      expect(result.investment_metrics.payback_period_years).toBe(6.9);
      expect(result.verdict).toContain('BUY');
    });

    it('should apply specific cap rates (10% - 13%) for administrative/office spaces', () => {
      const result = agent.analyze({
        property_type: 'administrative',
        offered_purchase_price: 20_000_000,
        offered_rent: 200_000, // 2.4M EGP annual
        size_sqm: 100,
        location: 'Business Park, New Cairo',
      });

      expect(result.investment_metrics.target_cap_rate_range).toBe('10% - 13%');
      expect(result.offered_price_assessment.implied_cap_rate_pct).toBe(12.0);
      expect(result.investment_metrics.payback_period_years).toBeCloseTo(8.33, 2);
    });
  });

  describe('Commercial-to-Residential Arbitrage Detection', () => {
    it('should trigger arbitrage alert when commercial space is priced near residential baseline', () => {
      const result = agent.analyze({
        property_type: 'commercial',
        offered_purchase_price: 15_000_000,
        offered_rent: 200_000, // 2.4M EGP annual rental yield on 15M purchase (6.25 years payback)
        size_sqm: 200, // 75,000 EGP/m²
        area_residential_avg_sqm_price: 80_000, // Residential avg is 80k/m²
        location: 'North 90th, New Cairo',
      });

      expect(result.investment_metrics.is_arbitrage_play).toBe(true);
      expect(result.verdict).toBe('BUY (MASSIVE ARBITRAGE)');
      expect(result.investment_metrics.arbitrage_alert).toBeDefined();
    });
  });

  describe('Overpriced & Underperforming Asset Detection', () => {
    it('should return an AVOID verdict for extremely overpriced properties (cap < 4%)', () => {
      const result = agent.analyze({
        property_type: 'residential',
        offered_purchase_price: 50_000_000,
        offered_rent: 100_000, // 1.2M EGP annual
        size_sqm: 250,
        location: 'New Cairo',
      });

      expect(result.offered_price_assessment.implied_cap_rate_pct).toBe(2.4); // 1.2M / 50M = 2.4%
      expect(result.verdict).toBe('OVERPRICED (NEGOTIATE OR RENT)');
    });
  });

  describe('Edge Cases and Graceful Degradation', () => {
    it('should handle zero rent gracefully', () => {
      const result = agent.analyze({
        property_type: 'residential',
        offered_purchase_price: 10_000_000,
        offered_rent: 0,
        size_sqm: 150,
      });

      expect(result.annual_income_generated).toBe(0);
      expect(result.offered_price_assessment.implied_cap_rate_pct).toBe(0);
      expect(result.investment_metrics.payback_period_years).toBe(0);
      expect(result.verdict).toBe('INSUFFICIENT DATA');
    });

    it('should handle zero purchase price gracefully', () => {
      const result = agent.analyze({
        property_type: 'residential',
        offered_purchase_price: 0,
        offered_rent: 100_000,
        size_sqm: 150,
      });

      expect(result.offered_price_assessment.implied_cap_rate_pct).toBe(0);
      expect(result.investment_metrics.payback_period_years).toBe(0);
      expect(result.verdict).toBe('INSUFFICIENT DATA');
    });
  });

});
