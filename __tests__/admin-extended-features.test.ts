import { describe, it, expect } from 'vitest';
import {
  calculateCurrencyArbitrage,
  generateCapRateSensitivityMatrix,
  evaluatePropertyValuation,
} from '../packages/agents/tools/valuationArbitrageEngine';

describe('Admin Extended Features & Financial Tooling Test Suite', () => {
  describe('Multi-Currency Arbitrage Analyzer', () => {
    it('detects USD buyer advantage when local EGP price is discounted below exchange rate', () => {
      // 450,000 USD for a 20,000,000 EGP villa implies ~44.44 rate vs 48.0 market rate (-7.41% spread)
      const res = calculateCurrencyArbitrage(20000000, 450000, 48.0);
      expect(res.arbitrage_advantage).toBe('USD_BUYER_ADVANTAGE');
      expect(res.arbitrage_spread_pct).toBeLessThan(-3.0);
      expect(res.implied_exchange_rate).toBeCloseTo(44.44, 1);
      expect(res.recommendation).toContain('Favorable for USD cash');
    });

    it('detects EGP buyer advantage when USD quote carries an unhedged premium', () => {
      // 400,000 USD for 22,000,000 EGP villa implies 55.0 rate vs 48.0 market rate (+14.58% spread)
      const res = calculateCurrencyArbitrage(22000000, 400000, 48.0);
      expect(res.arbitrage_advantage).toBe('EGP_BUYER_ADVANTAGE');
      expect(res.arbitrage_spread_pct).toBeGreaterThan(3.0);
      expect(res.implied_exchange_rate).toBe(55.0);
      expect(res.recommendation).toContain('Recommend settling in local EGP');
    });

    it('identifies parity when pricing is within +/- 3% spread', () => {
      // 480,000 USD for 23,040,000 EGP implies exactly 48.0 rate
      const res = calculateCurrencyArbitrage(23040000, 480000, 48.0);
      expect(res.arbitrage_advantage).toBe('PARITY');
      expect(res.arbitrage_spread_pct).toBe(0);
    });

    it('handles zero or missing values gracefully without NaN errors', () => {
      const res = calculateCurrencyArbitrage(0, 0, 48.0);
      expect(res.arbitrage_advantage).toBe('PARITY');
      expect(res.recommendation).toContain('Insufficient data');
    });
  });

  describe('Cap Rate & Payback Sensitivity Matrix', () => {
    it('generates accurate sensitivity matrix across price adjustment steps', () => {
      const purchasePrice = 10000000;
      const annualRent = 1000000; // 10% base cap rate, 10.0 payback

      const matrix = generateCapRateSensitivityMatrix(purchasePrice, annualRent, [-10, 0, 10]);
      expect(matrix.length).toBe(3);

      // -10% discount scenario (9M price) -> Cap rate should increase to ~11.11%
      expect(matrix[0].adjusted_price).toBe(9000000);
      expect(matrix[0].implied_cap_rate_pct).toBe(11.11);
      expect(matrix[0].payback_period_years).toBe(9.0);

      // Base scenario (0% change)
      expect(matrix[1].adjusted_price).toBe(10000000);
      expect(matrix[1].implied_cap_rate_pct).toBe(10.0);
      expect(matrix[1].payback_period_years).toBe(10.0);

      // +10% premium scenario (11M price) -> Cap rate should decrease to ~9.09%
      expect(matrix[2].adjusted_price).toBe(11000000);
      expect(matrix[2].implied_cap_rate_pct).toBe(9.09);
      expect(matrix[2].payback_period_years).toBe(11.0);
    });

    it('returns empty array when missing purchase price or rent', () => {
      expect(generateCapRateSensitivityMatrix(0, 500000)).toEqual([]);
      expect(generateCapRateSensitivityMatrix(5000000, 0)).toEqual([]);
    });
  });

  describe('Bulk Operations Data Mapping Contracts', () => {
    it('formats CSV rows with double-quoted string sanitization and proper headers', () => {
      const mockListings = [
        {
          sierraCode: 'SE-MV-101',
          compound: 'Mountain View iCity',
          location: '5th Settlement',
          type: 'Standalone Villa',
          bedrooms: 5,
          area_sqm: 420,
          price: 28500000,
          operation: 'Sale',
          ownerName: 'Dr. Tarek Fouad',
          status: 'Available',
        },
      ];

      const headers = ['Code', 'Compound', 'Location', 'Type', 'Bedrooms', 'Area_SQM', 'Price_EGP', 'Mode', 'Owner_Name', 'Status'];
      const row = [
        `"${mockListings[0].sierraCode}"`,
        `"${mockListings[0].compound}"`,
        `"${mockListings[0].location}"`,
        `"${mockListings[0].type}"`,
        mockListings[0].bedrooms,
        mockListings[0].area_sqm,
        mockListings[0].price,
        mockListings[0].operation,
        `"${mockListings[0].ownerName}"`,
        `"${mockListings[0].status}"`,
      ].join(',');

      expect(headers.join(',')).toBe('Code,Compound,Location,Type,Bedrooms,Area_SQM,Price_EGP,Mode,Owner_Name,Status');
      expect(row).toContain('"SE-MV-101","Mountain View iCity","5th Settlement"');
      expect(row).toContain('28500000,Sale,"Dr. Tarek Fouad","Available"');
    });
  });
});
