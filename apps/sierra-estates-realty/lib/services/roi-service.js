 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }





import { GoogleAIService } from '../server/google-ai';
import { FinancialService } from './financial-service';








// Market Growth coefficients (% per year)
const LOCATION_GROWTH = {
  'New Cairo': 18,
  'Fifth Settlement': 20,
  'North Coast': 25,
  'New Alamein': 28,
  'Sheikh Zayed': 15,
  'October': 12,
  'Mostakbal City': 22,
};

/**
 * Calculates the financial profile for a specific asset.
 * Strategic Axes (Merged from V11.5): Core Metrics, Yield Logic, Premium Add-ons, Market CMA.
 */
export async function analyzeAssetFinancials(unit) {
  const baseGrowth = LOCATION_GROWTH[unit.location || ''] || 10;
  
  // 1. Core Metrics & Urgency
  const urgencyFactor = (_optionalChain([unit, 'access', _ => _.intelligence, 'optionalAccess', _2 => _2.urgencyScore]) || 0) / 10; 
  const valScore = (_optionalChain([unit, 'access', _3 => _3.intelligence, 'optionalAccess', _4 => _4.valuationScore]) || 50) / 100;

  // --- SIERRA ESTATES UPGRADE: Use FinancialService for Valuation Context ---
  const valuation = FinancialService.calcAppraisedValue(unit);
  const marketEdge = valuation.marketDifference > 0 ? valuation.marketDifference : 0;

  // 2. Premium Add-ons (Multipliers from Drive F)
  let featureMultiplier = 0;
  const featureCodes = _optionalChain([unit, 'access', _5 => _5.intelligence, 'optionalAccess', _6 => _6.featureCodes]) || [];
  
  if (featureCodes.includes('G')) featureMultiplier += 3; // Garden: High rental demand
  if (featureCodes.includes('P')) featureMultiplier += 5; // Pool: Premium resale value
  if (featureCodes.includes('R')) featureMultiplier += 4; // Roof: Scarcity multiplier
  if (featureCodes.includes('V')) featureMultiplier += 10; // Villa: Higher capital ceiling

  // 3. Formula: (Base Location Growth * 3 Years) + Deal Multiplier + Premium Add-ons + Market Edge
  const projectedROI = Math.round((baseGrowth * 3) + (urgencyFactor * 5) + (valScore * 10) + featureMultiplier + marketEdge);
  
  // 4. Yield Logic (Rental Returns)
  // Logic: Apartments 8-10%, Villas 5-7%, Garden Units +2%
  let baseYield = unit.propertyType === 'apartment' ? 8 : 6;
  if (_optionalChain([unit, 'access', _7 => _7.location, 'optionalAccess', _8 => _8.includes, 'call', _9 => _9('Coast')])) baseYield += 4; 
  if (featureCodes.includes('G')) baseYield += 2; 
  
  const annualYield = Math.min(Math.round(baseYield + (valScore * 2)), 18);

  // AI Justification (Market CMA Context)
  const valuationAnalysis = await generateValuationReasoning(unit, projectedROI, annualYield);

  return {
    projectedROI,
    annualYield,
    valuationAnalysis
  };
}

/**
 * Uses Gemini to generate a clinical wealth-focused reasoning.
 */
async function generateValuationReasoning(unit, roi, yieldPercent) {
  const systemPrompt = `You are the Sierra Estates Wealth Analytics Bot (Neural ROI Core V10.0).
Task: Provide a clinical, premium financial justification for a property investment.

Tone: Focus on wealth preservation, capital appreciation, and institutional-grade logic.
Terminology: Budget -> Capital Allocation, Listing -> Asset, Deal -> Acquisition.

ASSET: ${unit.title} in ${unit.location}
PRICE: ${unit.price} EGP
CALCULATED ROI (3Y): ${roi}%
CALCULATED YIELD: ${yieldPercent}%

Output: 2-3 sentences explaining why this asset is a strategic acquisition for a wealth-conscious stakeholder.`;

  try {
    const data = await GoogleAIService.chatCompletions(
      'wealth-intelligence', 'valuation-reasoning',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the financial justification.' }
      ],
      { model: 'gemini-1.5-flash', temperature: 0.3 }
    );

    return data.choices[0].message.content || "Asset selected for high capital ceiling and robust liquidity profile.";
  } catch (_err) {
    return "Asset selected for high capital ceiling and robust liquidity profile.";
  }
}
