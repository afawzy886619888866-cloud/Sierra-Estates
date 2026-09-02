 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }















export class FinancialService {
  /**
   * Calculates a clinical appraised value based on compound averages and unit specs.
   * In a real system, this would query a "Market CMA" database.
   */
  static calcAppraisedValue(unit) {
    const listingPrice = unit.price || 0;
    
    // Heuristic: Base meter price for compound + finishing multiplier
    // This is a placeholder for actual market data lookup
    const baseMeterPrice = 45000; // New Cairo average
    const area = unit.area || 150;
    
    let finishingMultiplier = 1.0;
    switch (_optionalChain([unit, 'access', _ => _.intelligence, 'optionalAccess', _2 => _2.finishingGrade, 'optionalAccess', _3 => _3.toLowerCase, 'call', _4 => _4()])) {
      case 'ultra-lux': finishingMultiplier = 1.4; break;
      case 'lux': finishingMultiplier = 1.25; break;
      case 'semi-finished': finishingMultiplier = 1.1; break;
      case 'core & shell': finishingMultiplier = 1.0; break;
    }

    const appraisedValue = Math.round(baseMeterPrice * area * finishingMultiplier);
    const marketDifference = ((appraisedValue - listingPrice) / listingPrice) * 100;
    
    let valuationStatus = 'fair';
    if (marketDifference > 5) valuationStatus = 'underpriced';
    if (marketDifference < -5) valuationStatus = 'overpriced';

    // Downpayment Logic (Default 10% if not specified)
    const downpaymentRequired = _optionalChain([unit, 'access', _5 => _5.intelligence, 'optionalAccess', _6 => _6.paymentTerms, 'optionalAccess', _7 => _7.downpayment]) || (listingPrice * 0.1);
    const remaining = listingPrice - downpaymentRequired;
    const installmentMonths = _optionalChain([unit, 'access', _8 => _8.intelligence, 'optionalAccess', _9 => _9.paymentTerms, 'optionalAccess', _10 => _10.installmentsYears]) ? (unit.intelligence.paymentTerms.installmentsYears * 12) : 96; // 8 years default
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
  static calcRentalYield(unit, annualYieldPercent) {
    const listingPrice = unit.price || 0;
    const annualRent = listingPrice * (annualYieldPercent / 100);
    return Math.round(annualRent / 12);
  }
}
