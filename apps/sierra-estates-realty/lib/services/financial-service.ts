/**
 * SIERRA ESTATES — FINANCIAL INTELLIGENCE SERVICE (V12.0)
 * Handles detailed valuation, downpayment calculation, and historical trends.
 */

import { type Unit } from '../models/schema';

export interface ValuationReport {
  appraisedValue: number;
  marketDifference: number; // % difference from listing price
  downpaymentRequired: number;
  installmentMonths: number;
  monthlyInstallment: number;
  valuationStatus: 'underpriced' | 'fair' | 'overpriced';
}

export class FinancialService {
  /**
   * Calculates a clinical appraised value based on compound averages and unit specs.
   * In a real system, this would query a "Market CMA" database.
   *
   * §21 no-fabrication: returns null when the unit lacks a real area or price —
   * a valuation computed on an invented `area || 150` is a fabricated number,
   * and money math must never run on invented inputs.
   */
  static calcAppraisedValue(unit: Unit): ValuationReport | null {
    const listingPrice = unit.price || 0;
    if (!(listingPrice > 0) || !(unit.area > 0)) return null;

    // Heuristic: Base meter price for compound + finishing multiplier
    // This is a placeholder for actual market data lookup — a stated
    // estimation constant, NOT market data. It never fabricates inputs.
    const baseMeterPrice = 45000; // New Cairo average (documented heuristic)
    const area = unit.area;
    
    let finishingMultiplier = 1.0;
    switch (unit.intelligence?.finishingGrade?.toLowerCase()) {
      case 'ultra-lux': finishingMultiplier = 1.4; break;
      case 'lux': finishingMultiplier = 1.25; break;
      case 'semi-finished': finishingMultiplier = 1.1; break;
      case 'core & shell': finishingMultiplier = 1.0; break;
    }

    const appraisedValue = Math.round(baseMeterPrice * area * finishingMultiplier);
    const marketDifference = ((appraisedValue - listingPrice) / listingPrice) * 100;
    
    let valuationStatus: 'underpriced' | 'fair' | 'overpriced' = 'fair';
    if (marketDifference > 5) valuationStatus = 'underpriced';
    if (marketDifference < -5) valuationStatus = 'overpriced';

    // Downpayment Logic (Default 10% if not specified) — an explicitly
    // documented payment-structure assumption, not a property fact.
    const downpaymentRequired = unit.intelligence?.paymentTerms?.downpayment || (listingPrice * 0.1);
    const remaining = listingPrice - downpaymentRequired;
    // 8-year fallback is likewise a stated deal-structure assumption.
    const installmentMonths = unit.intelligence?.paymentTerms?.installmentsYears ? (unit.intelligence.paymentTerms.installmentsYears * 12) : 96;
    const monthlyInstallment = Math.round(remaining / installmentMonths);

    return {
      appraisedValue,
      marketDifference: Math.round(marketDifference * 10) / 10,
      downpaymentRequired,
      installmentMonths,
      monthlyInstallment,
      valuationStatus
    };
  }

  /**
   * Generates a monthly cashflow projection for rental properties.
   */
  static calcRentalYield(unit: Unit, annualYieldPercent: number): number {
    const listingPrice = unit.price || 0;
    const annualRent = listingPrice * (annualYieldPercent / 100);
    return Math.round(annualRent / 12);
  }
}
