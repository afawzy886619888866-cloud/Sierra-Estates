import { CommissionEngine, } from '../lib/services/commission-engine';

describe('CommissionEngine — 2026 Financial Policy', () => {
  describe('calcBaseSalary', () => {
    it('should disburse 100% salary for onsite (6000 EGP) when 2 or more deals are closed', () => {
      const res = CommissionEngine.calcBaseSalary('onsite', 2);
      expect(res.baseSalaryRate).toBe(6000);
      expect(res.disbursedBaseSalary).toBe(6000);
      expect(res.disbursementPercentage).toBe(100);
    });

    it('should disburse 50% salary for onsite (3000 EGP) when 1 deal is closed', () => {
      const res = CommissionEngine.calcBaseSalary('onsite', 1);
      expect(res.baseSalaryRate).toBe(6000);
      expect(res.disbursedBaseSalary).toBe(3000);
      expect(res.disbursementPercentage).toBe(50);
    });

    it('should disburse 0 salary for remote (4000 EGP base) when 0 deals are closed', () => {
      const res = CommissionEngine.calcBaseSalary('remote', 0);
      expect(res.baseSalaryRate).toBe(4000);
      expect(res.disbursedBaseSalary).toBe(0);
      expect(res.disbursementPercentage).toBe(0);
    });

    it('should disburse 100% salary for remote (4000 EGP) when 2 deals are closed', () => {
      const res = CommissionEngine.calcBaseSalary('remote', 2);
      expect(res.baseSalaryRate).toBe(4000);
      expect(res.disbursedBaseSalary).toBe(4000);
      expect(res.disbursementPercentage).toBe(100);
    });
  });

  describe('calcTieredCommission', () => {
    it('should calculate 10% in-stock match commission', () => {
      const res = CommissionEngine.calcTieredCommission(100000, 'in_stock_match');
      expect(res.baseRatePercentage).toBe(10);
      expect(res.adBonusPercentage).toBe(0);
      expect(res.commissionAmount).toBe(10000);
    });

    it('should calculate 40% full cycle commission', () => {
      const res = CommissionEngine.calcTieredCommission(100000, 'full_cycle');
      expect(res.baseRatePercentage).toBe(40);
      expect(res.commissionAmount).toBe(40000);
    });

    it('should add +5% Property Finder ad bonus for off-stock source (15% + 5% = 20%)', () => {
      const res = CommissionEngine.calcTieredCommission(100000, 'off_stock_source', 'property_finder');
      expect(res.baseRatePercentage).toBe(15);
      expect(res.adBonusPercentage).toBe(5);
      expect(res.totalCommissionPercentage).toBe(20);
      expect(res.commissionAmount).toBe(20000);
    });

    it('should add +15% organic social ad bonus for direct owner source (25% + 15% = 40%)', () => {
      const res = CommissionEngine.calcTieredCommission(100000, 'direct_owner', 'organic_social');
      expect(res.baseRatePercentage).toBe(25);
      expect(res.adBonusPercentage).toBe(15);
      expect(res.totalCommissionPercentage).toBe(40);
      expect(res.commissionAmount).toBe(40000);
    });
  });

  describe('calcClientBrokerageFee', () => {
    it('should apply 25% discount for direct web inquiries', () => {
      const res = CommissionEngine.calcClientBrokerageFee(100000, true);
      expect(res.fee).toBe(75000);
      expect(res.discountApplied).toBe(true);
    });

    it('should keep standard fee without discount for non-direct-web inquiries', () => {
      const res = CommissionEngine.calcClientBrokerageFee(100000, false);
      expect(res.fee).toBe(100000);
      expect(res.discountApplied).toBe(false);
    });
  });

  describe('calcInsideSalesCommission & calcCloserCommission', () => {
    it('should calculate rental commission properly when handled by self and sourced from owner', () => {
      const deal = {
        type: 'rent',
        amount: 20000,
        source: 'owner',
        broughtBy: 'self',
        handledBy: 'self',
      };
      const commission = CommissionEngine.calcInsideSalesCommission(deal);
      expect(commission).toBe(5000);
    });

    it('should calculate 20% closer commission for 2 viewings', () => {
      const deal = {
        type: 'sale',
        amount: 100000,
      };
      expect(CommissionEngine.calcCloserCommission(deal, 2)).toBe(20000);
    });
  });
});
