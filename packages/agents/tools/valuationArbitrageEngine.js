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

 










































// Egyptian Market Cap Rate Baselines
// Mirrors RealEstateValuationAgent.CAP_RATE_BASELINES / AMENITY_MULTIPLIERS
// in apps/api/valuation_agent_skill.py. The two are not wired together
// (TS monorepo package vs. Python microservice), so these must be changed
// in both places if cap-rate or premium policy changes.
const CAP_RATE_BASELINES = {
  residential: { min: 0.08, max: 0.10, label: '8% - 10%' },
  administrative: { min: 0.10, max: 0.12, label: '10% - 12%' },
  medical: { min: 0.10, max: 0.12, label: '10% - 12%' },
  commercial: { min: 0.12, max: 0.15, label: '12% - 15%' },
  retail: { min: 0.12, max: 0.15, label: '12% - 15%' },
};

// Premium Multipliers for structural advantages
const AMENITY_MULTIPLIERS = {
  'underground parking': { boost: 0.20, label: '+20% underground garage lift' },
  'underground garage': { boost: 0.20, label: '+20% underground garage lift' },
  'bank anchor': { boost: 0.15, label: '+15% institutional prestige neighbor' },
  'institutional neighbor': { boost: 0.15, label: '+15% institutional anchor' },
  'near metro': { boost: 0.10, label: '+10% high transit accessibility' },
  'metro proximity': { boost: 0.10, label: '+10% high transit accessibility' },
  'commercial license': { boost: 0.15, label: '+15% official commercial licensing' },
  'private pool': { boost: 0.10, label: '+10% private pool asset value' },
  'lake view': { boost: 0.10, label: '+10% direct lake/lagoon view' },
};

export class RealEstateValuationAgent {
  

  constructor(currency = 'EGP') {
    this.currency = currency;
  }

   analyze(input) {
    const rawType = (input.property_type || 'residential').toLowerCase();
    const typeKey = Object.keys(CAP_RATE_BASELINES).find((k) => rawType.includes(k)) || 'residential';
    const capBaseline = CAP_RATE_BASELINES[typeKey];

    const monthlyRent = input.offered_rent || (input.offered_purchase_price ? input.offered_purchase_price / 140 : 0);
    const annualIncome = monthlyRent * 12;
    const purchasePrice = input.offered_purchase_price;

    // 1. Calculate Fair Market Value via Income Capitalization
    const conservativeFairValue = Math.round(annualIncome / capBaseline.max);
    const optimisticFairValue = Math.round(annualIncome / capBaseline.min);

    // 2. Value-Add Multipliers & Premium Adjustments
    const detectedPremiums = {};
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
    let impliedCapRatePct;
    let paybackYears;
    let pricePerSqm;

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
    let arbitrageAlert;

    const isCommercialAdmin = ['administrative', 'commercial', 'medical', 'retail'].includes(typeKey);
    if (isCommercialAdmin && pricePerSqm && input.area_residential_avg_sqm_price) {
      if (pricePerSqm <= input.area_residential_avg_sqm_price * 1.05) {
        isArbitragePlay = true;
        const targetValueSqm = input.size_sqm ? Math.round(conservativeFairValue / input.size_sqm) : pricePerSqm * 2;
        const gap = targetValueSqm - pricePerSqm;
        arbitrageAlert = `CRITICAL ARBITRAGE ALERT: Buying ${typeKey} asset at residential rate (${pricePerSqm.toLocaleString()} ${this.currency}/sqm vs ${input.area_residential_avg_sqm_price.toLocaleString()} ${this.currency}/sqm) with capitalized value of ${targetValueSqm.toLocaleString()} ${this.currency}/sqm (+${gap.toLocaleString()} ${this.currency}/sqm upside).`;
      }
    }

    // 5. Verdict and Status Determination
    let status = 'Fair Value';
    let verdict = 'FAIR VALUE';
    let recommendation = 'Standard viable real estate investment.';

    if (!purchasePrice || !annualIncome) {
      status = 'Insufficient Data';
      verdict = 'INSUFFICIENT DATA' ;
      recommendation = `Missing purchase price or rental income. Cannot calculate accurate valuation metrics.`;
    } else {
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
export function evaluatePropertyValuation(input) {
  const agent = new RealEstateValuationAgent();
  return agent.analyze(input);
}











/**
 * Calculates currency arbitrage between local EGP listing price and USD developer/resale quotes.
 */
export function calculateCurrencyArbitrage(
  egpPrice,
  usdPrice,
  marketExchangeRate = 48.0
) {
  if (!egpPrice || !usdPrice || marketExchangeRate <= 0) {
    return {
      egp_price: egpPrice || 0,
      usd_price: usdPrice || 0,
      market_exchange_rate: marketExchangeRate,
      implied_exchange_rate: 0,
      arbitrage_spread_pct: 0,
      arbitrage_advantage: 'PARITY',
      recommendation: 'Insufficient data for currency arbitrage calculation.',
    };
  }

  const impliedRate = egpPrice / usdPrice;
  const spreadPct = Number((((impliedRate - marketExchangeRate) / marketExchangeRate) * 100).toFixed(2));

  let advantage = 'PARITY';
  let recommendation = 'Pricing is aligned with official bank exchange parity.';

  if (spreadPct <= -3.0) {
    advantage = 'USD_BUYER_ADVANTAGE';
    recommendation = `EGP listing is discounted by ${Math.abs(spreadPct)}% relative to USD benchmark (Implied rate: ${impliedRate.toFixed(2)} vs Market: ${marketExchangeRate}). Favorable for USD cash foreign investors.`;
  } else if (spreadPct >= 3.0) {
    advantage = 'EGP_BUYER_ADVANTAGE';
    recommendation = `USD quote carries a ${spreadPct}% premium over local EGP price (Implied rate: ${impliedRate.toFixed(2)} vs Market: ${marketExchangeRate}). Recommend settling in local EGP.`;
  }

  return {
    egp_price: egpPrice,
    usd_price: usdPrice,
    market_exchange_rate: marketExchangeRate,
    implied_exchange_rate: Number(impliedRate.toFixed(2)),
    arbitrage_spread_pct: spreadPct,
    arbitrage_advantage: advantage,
    recommendation,
  };
}









/**
 * Generates a Cap Rate & Payback sensitivity matrix across price variations (e.g. -10%, -5%, 0%, +5%, +10%).
 */
export function generateCapRateSensitivityMatrix(
  purchasePrice,
  annualRent,
  priceSteps = [-15, -10, -5, 0, 5, 10, 15]
) {
  if (!purchasePrice || !annualRent) return [];

  return priceSteps.map((pct) => {
    const adjustedPrice = Math.round(purchasePrice * (1 + pct / 100));
    const capRate = Number(((annualRent / adjustedPrice) * 100).toFixed(2));
    const payback = Number((adjustedPrice / annualRent).toFixed(1));
    return {
      price_adjustment_pct: pct,
      adjusted_price: adjustedPrice,
      annual_income: annualRent,
      implied_cap_rate_pct: capRate,
      payback_period_years: payback,
    };
  });
}
