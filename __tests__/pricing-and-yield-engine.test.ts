import { describe, it, expect } from 'vitest';

describe('Pricing, Discount Spread & Yield Calculation Engine Test Suite', () => {
  describe('Compound Benchmark Pricing per SQM', () => {
    const COMPOUND_SQM_BENCHMARKS: Record<string, { baselineSqmEgp: number; luxuryMultiplier: number }> = {
      'Mivida': { baselineSqmEgp: 95000, luxuryMultiplier: 1.15 },
      'Hyde Park': { baselineSqmEgp: 78000, luxuryMultiplier: 1.10 },
      'Palm Hills Katameya': { baselineSqmEgp: 110000, luxuryMultiplier: 1.20 },
      'Mountain View iCity': { baselineSqmEgp: 72000, luxuryMultiplier: 1.05 },
      'Villette Sodic': { baselineSqmEgp: 105000, luxuryMultiplier: 1.18 },
    };

    function calculateEstimatedBenchmarkPrice(compound: string, buaSqm: number, isLuxuryFinish: boolean): number {
      const benchmark = COMPOUND_SQM_BENCHMARKS[compound];
      if (!benchmark) throw new Error(`Unknown compound benchmark: ${compound}`);

      const meterRate = isLuxuryFinish
        ? benchmark.baselineSqmEgp * benchmark.luxuryMultiplier
        : benchmark.baselineSqmEgp;

      return Math.round(meterRate * buaSqm);
    }

    it('should calculate base and luxury finished valuation in Mivida', () => {
      const buaSqm = 350;
      const baseValuation = calculateEstimatedBenchmarkPrice('Mivida', buaSqm, false);
      const luxuryValuation = calculateEstimatedBenchmarkPrice('Mivida', buaSqm, true);

      expect(baseValuation).toBe(33_250_000); // 350m² * 95k = 33.25M EGP
      expect(luxuryValuation).toBe(38_237_500); // 33.25M * 1.15 = ~38.2M EGP
    });
  });

  describe('Cash Discount vs Deferred Payment Valuation', () => {
    /**
     * Cash Discount Formula:
     * When paying 100% upfront in cash vs 7-year installment, Egyptian developers
     * offer 25% - 35% cash discount.
     */
    function calculateCashVsInstallment(installmentPrice: number, cashDiscountPct = 30) {
      const cashDiscountAmount = Math.round((installmentPrice * cashDiscountPct) / 100);
      const cashPrice = installmentPrice - cashDiscountAmount;
      const effectiveAnnualSavingsPct = Number((cashDiscountPct / 7).toFixed(2));

      return {
        installmentPrice,
        cashDiscountAmount,
        cashPrice,
        effectiveAnnualSavingsPct,
      };
    }

    it('should calculate 30% cash discount on 40M EGP developer unit', () => {
      const deal = calculateCashVsInstallment(40_000_000, 30);
      expect(deal.cashDiscountAmount).toBe(12_000_000); // 12M EGP Discount
      expect(deal.cashPrice).toBe(28_000_000); // 28M EGP Cash Price
      expect(deal.effectiveAnnualSavingsPct).toBe(4.29);
    });
  });
});
