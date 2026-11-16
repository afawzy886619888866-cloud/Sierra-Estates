/**
 * SIERRA ESTATES — FINANCIAL & COMMISSION ENGINE (2026 UPDATED POLICY)
 * 
 * Strict Financial Policy Rules (2026):
 * 1. Points system: Completely abolished.
 * 2. Fixed Base Salary:
 *    - On-site HQ: 6,000 EGP.
 *    - Remote WFH: 4,000 EGP.
 *    - Full Salary Condition: Requires a minimum of 2 closed bookings/deals per month.
 *      Achieving 1 booking disburses 50% base salary only. 0 deals = 0%.
 * 3. Tiered Commissions (Net Company Share):
 *    - 10%: In-stock match
 *    - 15%: Off-stock source
 *    - 20%: Dual role
 *    - 25%: 2nd deal onwards tier / Direct owner source
 *    - 40%: Full cycle (sourced + created ad + FB lead + closed)
 * 4. Ad Creator Bonus:
 *    - +5%: Paid ads (Property Finder)
 *    - +15%: Organic social ads
 * 5. Direct Web Incentive:
 *    - 25% discount on brokerage fees for clients inquiring via sierra-estates.net
 */

export type WorkType = 'onsite' | 'remote';
export type CommissionTierType = 
  | 'in_stock_match'     // 10%
  | 'off_stock_source'   // 15%
  | 'dual_role'          // 20%
  | 'direct_owner'       // 25%
  | 'second_deal_plus'   // 25%
  | 'full_cycle';        // 40%

export type AdType = 'none' | 'property_finder' | 'organic_social';

export interface DealDetails {
  type: 'rent' | 'sale';
  amount: number; // Net Company Share or deal value
  netCompanyShare?: number;
  source?: 'owner' | 'broker' | 'direct_web';
  tierType?: CommissionTierType;
  adType?: AdType;
  broughtBy?: 'self' | 'other';
  handledBy?: 'self' | 'other';
  isInquiringViaDirectWeb?: boolean;
}

export interface EmployeeKPI {
  role: 'inside_sales' | 'closer' | 'team_leader' | 'sales_consultant';
  totalOwnersManaged: number;
  newUnitsThisMonth: number;
  dealsClosed: number;
  viewingsToday: number;
  workType?: WorkType;
}

export interface SalaryCalculationResult {
  baseSalaryRate: number; // 6000 or 4000
  disbursedBaseSalary: number; // 0, 3000, 6000, 2000, 4000
  disbursementPercentage: number; // 0%, 50%, 100%
  dealsClosed: number;
}

export interface CommissionResult {
  baseRatePercentage: number;
  adBonusPercentage: number;
  totalCommissionPercentage: number;
  commissionAmount: number;
}

export class CommissionEngine {
  /**
   * Calculates base salary disbursement according to 2026 rules.
   */
  static calcBaseSalary(workType: WorkType, dealsClosedThisMonth: number): SalaryCalculationResult {
    const baseSalaryRate = workType === 'onsite' ? 6000 : 4000;
    let disbursementPercentage = 0;

    if (dealsClosedThisMonth >= 2) {
      disbursementPercentage = 1.0;
    } else if (dealsClosedThisMonth === 1) {
      disbursementPercentage = 0.5;
    } else {
      disbursementPercentage = 0;
    }

    const disbursedBaseSalary = baseSalaryRate * disbursementPercentage;

    return {
      baseSalaryRate,
      disbursedBaseSalary,
      disbursementPercentage: Math.round(disbursementPercentage * 100),
      dealsClosed: dealsClosedThisMonth,
    };
  }

  /**
   * Calculates commission percentage and total payout on Net Company Share.
   */
  static calcTieredCommission(
    netCompanyShare: number,
    tierType: CommissionTierType,
    adType: AdType = 'none'
  ): CommissionResult {
    let baseRate = 0.10;
    switch (tierType) {
      case 'in_stock_match': baseRate = 0.10; break;
      case 'off_stock_source': baseRate = 0.15; break;
      case 'dual_role': baseRate = 0.20; break;
      case 'direct_owner':
      case 'second_deal_plus': baseRate = 0.25; break;
      case 'full_cycle': baseRate = 0.40; break;
    }

    let adBonus = 0;
    if (adType === 'property_finder') adBonus = 0.05;
    if (adType === 'organic_social') adBonus = 0.15;

    const totalPercentage = baseRate + adBonus;
    const commissionAmount = Math.round(netCompanyShare * totalPercentage);

    return {
      baseRatePercentage: Math.round(baseRate * 100),
      adBonusPercentage: Math.round(adBonus * 100),
      totalCommissionPercentage: Math.round(totalPercentage * 100),
      commissionAmount,
    };
  }

  /**
   * Direct Web Incentive: 25% discount on brokerage fees for clients inquiring via sierra-estates.net.
   */
  static calcClientBrokerageFee(standardFee: number, isDirectWeb: boolean): { fee: number; discountApplied: boolean } {
    if (isDirectWeb) {
      const discountedFee = Math.round(standardFee * 0.75); // 25% discount
      return { fee: discountedFee, discountApplied: true };
    }
    return { fee: Math.round(standardFee), discountApplied: false };
  }

  /** Legacy helper for Inside Sales */
  static calcInsideSalesCommission(deal: DealDetails): number {
    const amount = deal.netCompanyShare || deal.amount || 0;
    if (deal.tierType) {
      return this.calcTieredCommission(amount, deal.tierType, deal.adType).commissionAmount;
    }
    let commission = 0;
    if (deal.type === 'rent') {
      if (deal.handledBy === 'self') commission += amount * 0.10;
      if (deal.source === 'owner') commission += amount * 0.15;
      else if (deal.source === 'broker') commission += amount * 0.05;
      if (deal.broughtBy === 'self' && deal.handledBy === 'other') commission += amount * 0.10;
      else if (deal.broughtBy === 'other' && deal.handledBy === 'self') commission += amount * 0.125;
    }
    return Math.round(commission);
  }

  /** Legacy helper for Closers */
  static calcCloserCommission(deal: DealDetails, dailyViewings: number): number {
    const amount = deal.netCompanyShare || deal.amount || 0;
    let percentage = 0.15;
    if (dailyViewings === 2) percentage = 0.20;
    else if (dailyViewings > 2) percentage = 0.25;
    return Math.round(amount * percentage);
  }

  /** Validates monthly KPIs */
  static evaluateInsideSalesKPI(kpi: EmployeeKPI): { meetsQuota: boolean; status: string } {
    const isDealTargetMet = kpi.dealsClosed >= 2;
    const meetsQuota = isDealTargetMet && kpi.newUnitsThisMonth >= 20;
    return {
      meetsQuota,
      status: meetsQuota ? 'On Track' : 'Needs Improvement',
    };
  }
}
