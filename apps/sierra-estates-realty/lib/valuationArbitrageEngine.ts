/**
 * valuationArbitrageEngine.ts
 *
 * Real Estate Valuation & Arbitrage Analyzer Engine for Sierra Estates.
 * Implements:
 * 1. Income Capitalization (Cap Rate Valuation)
 * 2. The 10-12 Year Payback Rule (Arbitrage & Deal Checker)
 * 3. Commercial-to-Residential Price Arbitrage Detector
 * 4. Value-Add Amenities & Premium Lift Calculations
 */

export type PropertyCategory = 'residential' | 'administrative' | 'commercial' | 'medical' | 'retail';
export type ValuationVerdict =
  | 'BUY (MASSIVE ARBITRAGE)'
  | 'BUY (FAIR VALUE)'
  | 'FAIR VALUE'
  | 'OVERPRICED (NEGOTIATE OR RENT)'
  | 'OVERPRICED';

export interface ValuationInput {
  property_type: PropertyCategory | string;
  transaction_type?: 'Sale' | 'Rent' | 'sale' | 'rent';
  offered_purchase_price?: number;
  offered_rent?: number;
  size_sqm?: number;
  location?: string;
  amenities?: string[];
  area_residential_avg_sqm_price?: number;
}

export interface ValuationResult {
  property_type: string;
  location: string;
  size_sqm?: number;
  annual_income_generated: number;
  calculated_fair_value_range: {
    conservative_cap_value: number;
    optimistic_cap_value: number;
    premium_adjusted_conservative: number;
    premium_adjusted_optimistic: number;
  };
  offered_price_assessment: {
    offered_price?: number;
    implied_cap_rate_pct?: number;
    price_per_sqm?: number;
    status: string;
  };
  investment_metrics: {
    payback_period_years?: number;
    target_cap_rate_range: string;
    total_premium_lift_pct: number;
    value_add_premiums_detected: Record<string, string>;
    arbitrage_alert?: string;
    is_arbitrage_play: boolean;
  };
  verdict: ValuationVerdict;
  recommendation_summary: string;
}

// Egyptian Market Cap Rate Baselines
const CAP_RATE_BASELINES: Record<string, { min: number; max: number; label: string }> = {
  residential: { min: 0.08, max: 0.1, label: '8% - 10%' },
  administrative: { min: 0.1, max: 0.12, label: '10% - 12%' },
  medical: { min: 0.1, max: 0.12, label: '10% - 12%' },
  commercial: { min: 0.12, max: 0.15, label: '12% - 15%' },
  retail: { min: 0.12, max: 0.15, label: '12% - 15%' },
};

// Premium Multipliers for structural advantages
const AMENITY_MULTIPLIERS: Record<string, { boost: number; label: string }> = {
  'underground parking': { boost: 0.2, label: '+20% underground garage lift' },
  'underground garage': { boost: 0.2, label: '+20% underground garage lift' },
  'bank anchor': { boost: 0.15, label: '+15% institutional prestige neighbor' },
  'institutional neighbor': { boost: 0.15, label: '+15% institutional anchor' },
  'near metro': { boost: 0.1, label: '+10% high transit accessibility' },
  'metro proximity': { boost: 0.1, label: '+10% high transit accessibility' },
  'commercial license': { boost: 0.15, label: '+15% official commercial licensing' },
  'private pool': { boost: 0.1, label: '+10% private pool asset value' },
  'lake view': { boost: 0.1, label: '+10% direct lake/lagoon view' },
};

export class RealEstateValuationAgent {
  public currency: string;

  constructor(currency = 'EGP') {
    this.currency = currency;
  }

  public analyze(input: ValuationInput): ValuationResult {
    const rawType = (input.property_type || 'residential').toLowerCase();
    const typeKey = Object.keys(CAP_RATE_BASELINES).find((k) => rawType.includes(k)) || 'residential';
    const capBaseline = CAP_RATE_BASELINES[typeKey];

    const monthlyRent =
      input.offered_rent || (input.offered_purchase_price ? input.offered_purchase_price / 140 : 0);
    const annualIncome = monthlyRent * 12;
    const purchasePrice = input.offered_purchase_price;

    // 1. Calculate Fair Market Value via Income Capitalization
    const conservativeFairValue = Math.round(annualIncome / capBaseline.max);
    const optimisticFairValue = Math.round(annualIncome / capBaseline.min);

    // 2. Value-Add Multipliers & Premium Adjustments
    const detectedPremiums: Record<string, string> = {};
    let totalBoost = 0;

    if (input.amenities && Array.isArray(input.amenities)) {
      for (const amenity of input.amenities) {
        const lowerAmenity = amenity.toLowerCase();
        for (const [pattern, config] of Object.entries(AMENITY_MULTIPLIERS)) {
          if (lowerAmenity.includes(pattern)) {
            detectedPremiums[pattern] = config.label;
            totalBoost += config.boost;
          }
        }
      }
    }

    const premiumAdjustedConservative = Math.round(conservativeFairValue * (1 + totalBoost));
    const premiumAdjustedOptimistic = Math.round(optimisticFairValue * (1 + totalBoost));

    // 3. Implied Cap Rate & Payback Period
    let impliedCapRatePct: number | undefined;
    let paybackYears: number | undefined;
    let pricePerSqm: number | undefined;

    if (purchasePrice && purchasePrice > 0) {
      if (annualIncome > 0) {
        impliedCapRatePct = Number(((annualIncome / purchasePrice) * 100).toFixed(2));
        paybackYears = Number((purchasePrice / annualIncome).toFixed(1));
      }
      if (input.size_sqm && input.size_sqm > 0) {
        pricePerSqm = Math.round(purchasePrice / input.size_sqm);
      }
    }

    // 4. Commercial-to-Residential Arbitrage Detection
    let isArbitragePlay = false;
    let arbitrageAlert: string | undefined;

    const isCommercialAdmin = ['administrative', 'commercial', 'medical', 'retail'].includes(typeKey);
    if (isCommercialAdmin && pricePerSqm && input.area_residential_avg_sqm_price) {
      if (pricePerSqm <= input.area_residential_avg_sqm_price * 1.05) {
        isArbitragePlay = true;
        const targetValueSqm = input.size_sqm
          ? Math.round(conservativeFairValue / input.size_sqm)
          : pricePerSqm * 2;
        const gap = targetValueSqm - pricePerSqm;
        arbitrageAlert = `CRITICAL ARBITRAGE ALERT: Buying ${typeKey} asset at residential rate (${pricePerSqm.toLocaleString()} ${this.currency}/sqm vs ${input.area_residential_avg_sqm_price.toLocaleString()} ${this.currency}/sqm) with capitalized value of ${targetValueSqm.toLocaleString()} ${this.currency}/sqm (+${gap.toLocaleString()} ${this.currency}/sqm upside).`;
      }
    }

    // 5. Verdict and Status Determination
    let status = 'Fair Value';
    let verdict: ValuationVerdict = 'FAIR VALUE';
    let recommendation = 'Standard viable real estate investment.';

    if (purchasePrice) {
      if (paybackYears !== undefined && paybackYears < 8.0) {
        status = 'Highly Undervalued / Significant Arbitrage';
        verdict = 'BUY (MASSIVE ARBITRAGE)';
        recommendation = `Extremely attractive investment recovering full capital in only ${paybackYears} years (${impliedCapRatePct}% Cap Rate). Recommend immediate acquisition.`;
      } else if (purchasePrice <= premiumAdjustedOptimistic && (!paybackYears || paybackYears <= 12.0)) {
        status = 'Fair Market Value';
        verdict = 'BUY (FAIR VALUE)';
        recommendation = `Priced within fair capitalized range (${conservativeFairValue.toLocaleString()} - ${premiumAdjustedOptimistic.toLocaleString()} ${this.currency}) with healthy ${paybackYears || '10-12'} year payback period.`;
      } else {
        status = 'Overpriced';
        verdict = 'OVERPRICED (NEGOTIATE OR RENT)';
        recommendation = `Asking price exceeds capitalized rental yield valuation (${paybackYears || '>13'} years payback). Recommend negotiating down to ${premiumAdjustedConservative.toLocaleString()} ${this.currency} or renting instead.`;
      }
    } else {
      verdict = 'BUY (FAIR VALUE)';
      recommendation = `Target acquisition price should be between ${conservativeFairValue.toLocaleString()} ${this.currency} (conservative) and ${premiumAdjustedOptimistic.toLocaleString()} ${this.currency} (premium-adjusted).`;
    }

    return {
      property_type: input.property_type,
      location: input.location || 'New Cairo',
      size_sqm: input.size_sqm,
      annual_income_generated: Math.round(annualIncome),
      calculated_fair_value_range: {
        conservative_cap_value: conservativeFairValue,
        optimistic_cap_value: optimisticFairValue,
        premium_adjusted_conservative: premiumAdjustedConservative,
        premium_adjusted_optimistic: premiumAdjustedOptimistic,
      },
      offered_price_assessment: {
        offered_price: purchasePrice,
        implied_cap_rate_pct: impliedCapRatePct,
        price_per_sqm: pricePerSqm,
        status,
      },
      investment_metrics: {
        payback_period_years: paybackYears,
        target_cap_rate_range: capBaseline.label,
        total_premium_lift_pct: Math.round(totalBoost * 100),
        value_add_premiums_detected: detectedPremiums,
        arbitrage_alert: arbitrageAlert,
        is_arbitrage_play: isArbitragePlay,
      },
      verdict,
      recommendation_summary: recommendation,
    };
  }
}

/** Convenience helper function */
export function evaluatePropertyValuation(input: ValuationInput): ValuationResult {
  const agent = new RealEstateValuationAgent();
  return agent.analyze(input);
}
