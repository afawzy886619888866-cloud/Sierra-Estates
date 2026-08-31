import { describe, it, expect } from 'vitest';

describe('Real Estate Savings & Financial Valuation Engine Test Suite', () => {
  describe('Arbitrage & Savings Calculation Logic', () => {
    /**
     * Arbitrage Discount Formula:
     * discountAmount = marketBenchmarkPrice - askingPrice
     * savingsPercentage = (discountAmount / marketBenchmarkPrice) * 100
     */
    function calculateArbitrageSavings(askingPrice: number, marketBenchmarkPrice: number) {
      const discountAmount = marketBenchmarkPrice - askingPrice;
      const savingsPercentage = Number(((discountAmount / marketBenchmarkPrice) * 100).toFixed(2));
      const isUnderpriced = discountAmount > 0 && savingsPercentage >= 5.0;
      const isOverpriced = discountAmount < 0;

      return {
        discountAmount,
        savingsPercentage,
        isUnderpriced,
        isOverpriced,
        classification: isUnderpriced
          ? 'STRONG_BUY_UNDERPRICED'
          : isOverpriced
          ? 'OVERPRICED_NEGOTIATE'
          : 'FAIR_MARKET_VALUE',
      };
    }

    it('should calculate underpriced unit savings correctly (e.g. 20% below market in Mivida)', () => {
      const askingPrice = 24_000_000;
      const marketBenchmark = 30_000_000;

      const result = calculateArbitrageSavings(askingPrice, marketBenchmark);
      expect(result.discountAmount).toBe(6_000_000); // 6M EGP discount / savings
      expect(result.savingsPercentage).toBe(20.0);
      expect(result.isUnderpriced).toBe(true);
      expect(result.classification).toBe('STRONG_BUY_UNDERPRICED');
    });

    it('should identify overpriced units and calculate negative savings', () => {
      const askingPrice = 35_000_000;
      const marketBenchmark = 30_000_000;

      const result = calculateArbitrageSavings(askingPrice, marketBenchmark);
      expect(result.discountAmount).toBe(-5_000_000);
      expect(result.savingsPercentage).toBe(-16.67);
      expect(result.isOverpriced).toBe(true);
      expect(result.classification).toBe('OVERPRICED_NEGOTIATE');
    });
  });

  describe('Rental Yield (Cap Rate) & Payback Period Calculations', () => {
    /**
     * Cap Rate Formula:
     * netOperatingIncome = annualRentalIncome - annualOperatingExpenses
     * capRatePercent = (netOperatingIncome / totalAcquisitionPrice) * 100
     * paybackYears = totalAcquisitionPrice / netOperatingIncome
     */
    function calculateRentalYieldMetrics(
      totalAcquisitionPrice: number,
      monthlyRentalIncome: number,
      annualMaintenanceExpense: number = 0
    ) {
      const annualRentalIncome = monthlyRentalIncome * 12;
      const netOperatingIncome = annualRentalIncome - annualMaintenanceExpense;
      const capRatePercent = Number(((netOperatingIncome / totalAcquisitionPrice) * 100).toFixed(2));
      const paybackYears = Number((totalAcquisitionPrice / netOperatingIncome).toFixed(1));

      return {
        annualRentalIncome,
        netOperatingIncome,
        capRatePercent,
        paybackYears,
      };
    }

    it('should calculate luxury rental yields (e.g. 100k/mo on 15M property)', () => {
      const acquisitionPrice = 15_000_000;
      const monthlyRent = 100_000;
      const annualMaintenance = 100_000;

      const metrics = calculateRentalYieldMetrics(acquisitionPrice, monthlyRent, annualMaintenance);
      expect(metrics.annualRentalIncome).toBe(1_200_000);
      expect(metrics.netOperatingIncome).toBe(1_100_000);
      expect(metrics.capRatePercent).toBe(7.33); // 7.33% Net Cap Rate
      expect(metrics.paybackYears).toBe(13.6); // ~13.6 years payback
    });
  });

  describe('Price Per Square Meter (BUA) Calculations', () => {
    function calculatePricePerSqm(totalPrice: number, buaSqm: number) {
      if (buaSqm <= 0) throw new Error('BUA must be positive');
      return Math.round(totalPrice / buaSqm);
    }

    it('should compute exact price per square meter', () => {
      const priceEgp = 36_000_000;
      const buaSqm = 380;
      const pricePerSqm = calculatePricePerSqm(priceEgp, buaSqm);
      expect(pricePerSqm).toBe(94737); // 94,737 EGP / m²
    });
  });

  describe('FX & 21K Gold Parity Equivalencies', () => {
    /**
     * Converts EGP amount into USD, AED, and Grams of 21K Gold
     */
    function calculateParityEquivalents(egpAmount: number, usdRate = 50.0, aedRate = 13.61, gold21kPricePerGram = 3500) {
      const usdEquivalent = Math.round(egpAmount / usdRate);
      const aedEquivalent = Math.round(egpAmount / aedRate);
      const gold21kGrams = Number((egpAmount / gold21kPricePerGram).toFixed(1));
      const goldKilograms = Number((gold21kGrams / 1000).toFixed(2));

      return {
        usdEquivalent,
        aedEquivalent,
        gold21kGrams,
        goldKilograms,
      };
    }

    it('should convert 35M EGP transaction into FX and gold weights', () => {
      const egpAmount = 35_000_000;
      const parity = calculateParityEquivalents(egpAmount, 50.0, 13.61, 3500);

      expect(parity.usdEquivalent).toBe(700_000); // $700,000 USD
      expect(parity.aedEquivalent).toBe(2_571_639); // 2.57M AED
      expect(parity.gold21kGrams).toBe(10000.0); // 10,000 grams
      expect(parity.goldKilograms).toBe(10.0); // 10 kg 21K Gold
    });
  });

  describe('Installment Payment Schedule Calculations', () => {
    function calculateInstallments(totalPrice: number, downPaymentPercent: number, years: number) {
      const downPaymentAmount = (totalPrice * downPaymentPercent) / 100;
      const remainingBalance = totalPrice - downPaymentAmount;
      const totalQuarters = years * 4;
      const quarterlyPayment = Math.round(remainingBalance / totalQuarters);

      return {
        downPaymentAmount,
        remainingBalance,
        totalQuarters,
        quarterlyPayment,
      };
    }

    it('should calculate 8-year payment plan with 10% down payment', () => {
      const totalPrice = 20_000_000;
      const plan = calculateInstallments(totalPrice, 10, 8);

      expect(plan.downPaymentAmount).toBe(2_000_000); // 2M EGP Down Payment
      expect(plan.remainingBalance).toBe(18_000_000); // 18M EGP Remaining
      expect(plan.totalQuarters).toBe(32); // 32 Equal Quarters
      expect(plan.quarterlyPayment).toBe(562500); // 562,500 EGP / Quarter
    });
  });

  describe('Mortgage Affordability & Net Monthly Carry Calculations', () => {
    function calculateMortgageAffordability(
      propertyPriceEgp: number,
      downPaymentPct: number,
      tenureYears: number,
      annualInterestRate: number = 0.12,
      estGrossYieldPct: number = 0.085
    ) {
      const downPayment = (propertyPriceEgp * downPaymentPct) / 100;
      const principalFinanced = propertyPriceEgp - downPayment;
      const totalInterest = principalFinanced * annualInterestRate * tenureYears;
      const totalPayable = principalFinanced + totalInterest;
      const monthlyMortgage = Math.round(totalPayable / (tenureYears * 12));
      const estMonthlyRent = Math.round((propertyPriceEgp * estGrossYieldPct) / 12);
      const netMonthlyCarry = monthlyMortgage - estMonthlyRent;

      return {
        downPayment,
        principalFinanced,
        monthlyMortgage,
        estMonthlyRent,
        netMonthlyCarry,
      };
    }

    it('calculates 30% down payment and 7-year monthly net carry accurately', () => {
      const result = calculateMortgageAffordability(10_000_000, 30, 7, 0.12, 0.085);

      expect(result.downPayment).toBe(3_000_000);
      expect(result.principalFinanced).toBe(7_000_000);
      expect(result.monthlyMortgage).toBe(153333);
      expect(result.estMonthlyRent).toBe(70833);
      expect(result.netMonthlyCarry).toBe(82500);
    });
  });

  describe('Egyptian Gold Sovereign Multi-Asset Parity Engine', () => {
    it('converts property price to exact Egyptian Gold Sovereigns (8g 21K gold)', async () => {
      const { FxGoldValuationEngine, DEFAULT_FX_RATES } = await import('../packages/agents-core/src/fx-gold-engine');
      // At 3,450 EGP/g, 1 Gold Sovereign (8g) = 27,600 EGP
      // 27,600,000 EGP property = 1,000 Gold Sovereigns
      const valuation = FxGoldValuationEngine.calculateParity(27_600_000, DEFAULT_FX_RATES);
      expect(valuation.goldSovereignEquivalent).toBe(1000);
      expect(valuation.formattedDisplay.goldSovereign).toContain('1,000 Sovereigns (جنيه ذهب)');
    });
  });
});
