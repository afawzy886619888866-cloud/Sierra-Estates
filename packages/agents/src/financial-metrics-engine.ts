/**
 * SIERRA ESTATES — DETERMINISTIC FINANCIAL ENGINE
 * 
 * "AI explains, code decides."
 * All financial metrics are pure, deterministic, verifiable functions.
 * Implements:
 * - Gross and Net Rental Yields
 * - Capital Appreciation and Total ROI over holding periods
 * - Intrinsic Appraised Value calculation via standard multipliers (ABNT NBR 14653)
 * - Payback Period in years
 * - Egyptian Pound (EGP) and Compact formatters
 */

export interface UnitFinancials {
  purchasePrice: number;
  currentMarketValue: number;
  monthlyRent?: number;
  annualServiceCharge?: number;
  closingCostPercent?: number; // default 7%
  holdingPeriodYears?: number;
}

export type UnitFinancial = UnitFinancials;

export interface UnitIntelligenceFactors {
  standard: 'luxury' | 'normal' | 'simple';
  condition: 'new' | 'good' | 'fair' | 'poor';
  localityScore: number; // 0 to 5
}

export interface FinancialMetrics {
  pricePerSqm: number;
  grossYield: number;          // % annual rental yield before costs
  netYield: number;            // % annual rental yield after service charges
  roi: number;                 // % return on investment over holding period
  capitalAppreciation: number; // % gain from purchase to current market value
  monthlyNetIncome: number;
  annualNetIncome: number;
  paybackPeriodYears: number;
  appraisedValue: number;      // Calculated intrinsic value
  valuationStatus: 'undervalued' | 'fair' | 'overvalued';
}

/**
 * Price per square meter — deterministic, no rounding ambiguity
 */
export function calcPricePerSqm(totalPrice: number, areaSqm: number): number {
  if (areaSqm <= 0 || totalPrice <= 0) return 0;
  return Math.round(totalPrice / areaSqm);
}

/**
 * Gross rental yield — (annual rent / purchase price) × 100
 */
export function calcGrossYield(annualRent: number, purchasePrice: number): number {
  if (purchasePrice <= 0 || annualRent <= 0) return 0;
  return parseFloat(((annualRent / purchasePrice) * 100).toFixed(2));
}

/**
 * Net rental yield — (annual rent − service charges) / purchase price × 100
 */
export function calcNetYield(
  annualRent: number,
  annualServiceCharge: number,
  purchasePrice: number
): number {
  if (purchasePrice <= 0) return 0;
  const net = annualRent - annualServiceCharge;
  if (net <= 0) return 0;
  return parseFloat(((net / purchasePrice) * 100).toFixed(2));
}

/**
 * Capital appreciation percentage
 */
export function calcCapitalAppreciation(purchasePrice: number, currentValue: number): number {
  if (purchasePrice <= 0) return 0;
  return parseFloat((((currentValue - purchasePrice) / purchasePrice) * 100).toFixed(2));
}

/**
 * Return on Investment (ROI) over holding period
 * Formula: ((totalRentalIncome + capitalGain - closingCosts) / totalInvestment) × 100
 */
export function calcROI(financials: UnitFinancials): number {
  const {
    purchasePrice,
    currentMarketValue,
    monthlyRent = 0,
    annualServiceCharge = 0,
    closingCostPercent = 7,
    holdingPeriodYears = 1,
  } = financials;

  if (purchasePrice <= 0) return 0;

  const closingCosts = purchasePrice * (closingCostPercent / 100);
  const totalInvestment = purchasePrice + closingCosts;
  const totalRentalIncome = (monthlyRent * 12 - annualServiceCharge) * holdingPeriodYears;
  const capitalGain = currentMarketValue - purchasePrice;
  const totalReturn = totalRentalIncome + capitalGain;

  return parseFloat(((totalReturn / totalInvestment) * 100).toFixed(2));
}

/**
 * Calculates appraised value based on ABNT NBR 14653 multipliers
 */
export function calcAppraisedValue(
  baseMarketValue: number,
  factors: UnitIntelligenceFactors
): number {
  const standardMultipliers: Record<'luxury' | 'normal' | 'simple', number> = {
    luxury: 1.3,
    normal: 1.0,
    simple: 0.8,
  };

  const conditionMultipliers: Record<'new' | 'good' | 'fair' | 'poor', number> = {
    new: 1.0,
    good: 0.9,
    fair: 0.8,
    poor: 0.65,
  };

  const standardMult = standardMultipliers[factors.standard] || 1.0;
  const conditionMult = conditionMultipliers[factors.condition] || 1.0;
  const localityMult = Math.min(Math.max((factors.localityScore / 5) * 0.4 + 0.8, 0.7), 1.3);

  return Math.round(baseMarketValue * standardMult * conditionMult * localityMult);
}

/**
 * Calculates the payback period in years
 */
export function calcPaybackPeriod(purchasePrice: number, annualNetRent: number): number {
  if (annualNetRent <= 0 || purchasePrice <= 0) return 0;
  return parseFloat((purchasePrice / annualNetRent).toFixed(1));
}

/**
 * Master computation function — computes all metrics for a unit
 */
export function computeFullMetrics(
  financials: UnitFinancials,
  areaSqm: number,
  factors?: UnitIntelligenceFactors
): FinancialMetrics {
  const annualRent = (financials.monthlyRent || 0) * 12;
  const annualCharges = financials.annualServiceCharge || 0;
  const annualNetRent = Math.max(0, annualRent - annualCharges);

  const appraisedValue = factors
    ? calcAppraisedValue(financials.currentMarketValue, factors)
    : financials.currentMarketValue;

  const baseComparison = appraisedValue > 0 ? appraisedValue : financials.purchasePrice;
  const valuationDiff = baseComparison > 0
    ? ((financials.purchasePrice - baseComparison) / baseComparison) * 100
    : 0;

  let valuationStatus: 'undervalued' | 'fair' | 'overvalued' = 'fair';
  if (valuationDiff < -10) valuationStatus = 'undervalued';
  if (valuationDiff > 10) valuationStatus = 'overvalued';

  return {
    pricePerSqm: calcPricePerSqm(financials.purchasePrice, areaSqm),
    grossYield: calcGrossYield(annualRent, financials.purchasePrice),
    netYield: calcNetYield(annualRent, annualCharges, financials.purchasePrice),
    roi: calcROI(financials),
    capitalAppreciation: calcCapitalAppreciation(financials.purchasePrice, financials.currentMarketValue),
    monthlyNetIncome: Math.round(annualNetRent / 12),
    annualNetIncome: Math.round(annualNetRent),
    paybackPeriodYears: calcPaybackPeriod(financials.purchasePrice, annualNetRent),
    appraisedValue,
    valuationStatus,
  };
}

/**
 * Egyptian Pound (EGP) formatters
 */
export function formatEGP(amount: number, locale: 'en' | 'ar' = 'en'): string {
  if (!Number.isFinite(amount)) return '0 EGP';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactEGP(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return 'EGP 0';
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return `EGP ${Number.isInteger(val) ? val.toString() : val.toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (amount >= 1_000) {
    const val = amount / 1_000;
    return `EGP ${Number.isInteger(val) ? val.toString() : val.toFixed(0)}K`;
  }
  return `EGP ${Math.round(amount)}`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0.00%';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}
