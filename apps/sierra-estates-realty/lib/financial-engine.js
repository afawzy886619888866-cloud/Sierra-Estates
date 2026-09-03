/**
 * SIERRA ESTATES — DETERMINISTIC FINANCIAL ENGINE
 * "AI explains, code decides."
 * All financial metrics are pure, testable functions — never AI-guessed.
 */

// ─── Types ───────────────────────────────────────────────────────────




























// ─── Pure Calculation Functions ──────────────────────────────────────

/**
 * Price per square meter — deterministic, no rounding ambiguity
 */
export function calcPricePerSqm(totalPrice, areaSqm) {
  if (areaSqm <= 0) return 0;
  return Math.round(totalPrice / areaSqm);
}

/**
 * Gross rental yield — annual rent / purchase price × 100
 */
export function calcGrossYield(annualRent, purchasePrice) {
  if (purchasePrice <= 0) return 0;
  return parseFloat(((annualRent / purchasePrice) * 100).toFixed(2));
}

/**
 * Net rental yield — (annual rent − service charges) / purchase price × 100
 */
export function calcNetYield(annualRent, annualServiceCharge, purchasePrice) {
  if (purchasePrice <= 0) return 0;
  const net = annualRent - annualServiceCharge;
  return parseFloat(((net / purchasePrice) * 100).toFixed(2));
}

/**
 * Capital appreciation percentage
 */
export function calcCapitalAppreciation(purchasePrice, currentValue) {
  if (purchasePrice <= 0) return 0;
  return parseFloat((((currentValue - purchasePrice) / purchasePrice) * 100).toFixed(2));
}

/**
 * ROI — total return including rental income and appreciation over holding period
 * Formula: ((totalRentalIncome + capitalGain - closingCosts) / totalInvestment) × 100
 */
export function calcROI(financials) {
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
 * Master function — compute all metrics for a unit
 */
export function computeFullMetrics(
  financials,
  areaSqm,
  factors
) {
  const annualRent = (financials.monthlyRent || 0) * 12;
  const annualCharges = financials.annualServiceCharge || 0;
  const annualNetRent = annualRent - annualCharges;

  // Intelligence Layer logic
  const appraisedValue = factors 
    ? calcAppraisedValue(financials.currentMarketValue, factors)
    : financials.currentMarketValue;

  const valuationDiff = ((financials.purchasePrice - appraisedValue) / appraisedValue) * 100;
  let valuationStatus = 'fair';
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

// ─── Intelligence Calculations ───────────────────────────────────────

/**
 * Calculates appraised value based on ABNT NBR 14653 multipliers
 */
export function calcAppraisedValue(baseMarketValue, factors) {
  const multipliers = {
    standard: { luxury: 1.3, normal: 1.0, simple: 0.8 },
    condition: { new: 1.0, good: 0.9, fair: 0.8, poor: 0.65 }
  };

  const standardMult = multipliers.standard[factors.standard] || 1.0;
  const conditionMult = multipliers.condition[factors.condition] || 1.0;
  const localityMult = (factors.localityScore / 5) * 0.4 + 0.8; // Maps 0-5 to 0.8x-1.2x

  return Math.round(baseMarketValue * standardMult * conditionMult * localityMult);
}

/**
 * Calculates the payback period in years
 */
export function calcPaybackPeriod(purchasePrice, annualNetRent) {
  if (annualNetRent <= 0) return 0;
  return parseFloat((purchasePrice / annualNetRent).toFixed(1));
}

// ─── Currency Formatting ─────────────────────────────────────────────

export function formatEGP(amount, locale = 'en') {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: locale === 'ar' ? 'EGP' : 'EGP', // Intl handles currency display based on locale
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactEGP(amount) {
  if (amount >= 1000000) {
    return `EGP ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `EGP ${(amount / 1000).toFixed(0)}K`;
  }
  return `EGP ${amount}`;
}

export function formatPercent(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}
