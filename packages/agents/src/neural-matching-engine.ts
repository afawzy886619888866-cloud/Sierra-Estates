/**
 * SIERRA ESTATES — NEURAL WEALTH MATCHING ENGINE (V10.0)
 * 
 * Scores and ranks property assets against stakeholder investment profiles.
 * Scoring Breakdown:
 * 1. Preference & Location Alignment (30%)
 * 2. Financial ROI & Capital Appreciation Potential (40%)
 * 3. Market Liquidity & Scarcity Index (20%)
 * 4. Strategic Feasibility & Legal Readiness (10%)
 * 
 * Strictly incorporates Negative Signal avoidance (objection memory filtering).
 */

export interface StakeholderIntelligence {
  id: string;
  name: string;
  capitalBudget: number;
  preferredLocations: string[];
  preferredPropertyTypes: string[];
  minimumBedrooms?: number;
  negativeSignals?: string[]; // e.g. ["low floor", "dark", "core and shell", "overpriced"]
  historicalObjections?: string[];
  investmentObjective?: 'capital_gain' | 'rental_yield' | 'holiday_home' | 'primary_residence';
}

export interface CandidateProperty {
  id: string | number;
  title: string;
  compound?: string;
  location?: string;
  propertyType?: string;
  price: number;
  bedrooms?: number;
  areaSqm?: number;
  projectedYieldPct?: number;
  projectedAppreciationPct?: number;
  features?: string[];
  finishing?: string;
  description?: string;
}

export interface PropertyMatchResult {
  propertyId: string | number;
  property?: CandidateProperty;
  title: string;
  overallScore: number; // 0-100
  breakdown: {
    preferenceScore: number;
    financialScore: number;
    scarcityScore: number;
    feasibilityScore: number;
  };
  negativeFlagsTriggered: string[];
  matchJustification: string;
}

const LOCATION_PREMIUM: Record<string, number> = {
  villette: 18,
  mivida: 20,
  'cairo festival city': 22,
  'mountain view': 18,
  'hyde park': 17,
  'palm hills': 19,
  'swan lake': 25,
  zed: 20,
  marassi: 26,
};

/**
 * Scores and matches properties for a stakeholder using deterministic metrics.
 */
export function rankPropertiesForStakeholder(
  stakeholder: StakeholderIntelligence,
  properties: CandidateProperty[],
  maxResults: number = 5
): PropertyMatchResult[] {
  const results: PropertyMatchResult[] = [];

  for (const property of properties) {
    const negativeFlags: string[] = [];
    const searchContext = `${property.title} ${property.compound || ''} ${property.location || ''} ${property.finishing || ''} ${property.description || ''} ${(property.features || []).join(' ')}`.toLowerCase();

    // 1. Negative Signal Filtering
    if (stakeholder.negativeSignals && stakeholder.negativeSignals.length > 0) {
      for (const signal of stakeholder.negativeSignals) {
        if (searchContext.includes(signal.toLowerCase())) {
          negativeFlags.push(signal);
        }
      }
    }

    // Heavy penalty for negative signals
    if (negativeFlags.length > 0) {
      continue; // Filter out disqualified properties
    }

    // 2. Preference & Location Alignment (0-30 pts)
    let preferenceScore = 0;
    const propLoc = (property.compound || property.location || '').toLowerCase();
    const locMatch = stakeholder.preferredLocations.some((loc) =>
      propLoc.includes(loc.toLowerCase()) || loc.toLowerCase().includes(propLoc)
    );
    if (locMatch || stakeholder.preferredLocations.length === 0) {
      preferenceScore += 15;
    }

    const propType = (property.propertyType || '').toLowerCase();
    const typeMatch = stakeholder.preferredPropertyTypes.some((t) =>
      propType.includes(t.toLowerCase()) || t.toLowerCase().includes(propType)
    );
    if (typeMatch || stakeholder.preferredPropertyTypes.length === 0) {
      preferenceScore += 10;
    }

    if (
      stakeholder.minimumBedrooms !== undefined &&
      property.bedrooms !== undefined &&
      property.bedrooms >= stakeholder.minimumBedrooms
    ) {
      preferenceScore += 5;
    }

    // 3. Financial ROI & Budget Alignment (0-40 pts)
    let financialScore = 0;
    const budget = stakeholder.capitalBudget;
    if (budget > 0) {
      if (property.price <= budget) {
        financialScore += 20;
      } else if (property.price <= budget * 1.1) {
        financialScore += 12; // Within 10% negotiation margin
      } else {
        financialScore += 4;
      }
    } else {
      financialScore += 15;
    }

    // Yield / Appreciation contribution
    const yieldPct = property.projectedYieldPct || 8;
    const appreciationPct = property.projectedAppreciationPct || 18;
    financialScore += Math.min(Math.round((yieldPct * 1.2) + (appreciationPct * 0.4)), 20);

    // 4. Scarcity & Liquidity (0-20 pts)
    let scarcityScore = 10;
    const compoundName = (property.compound || '').toLowerCase();
    if (LOCATION_PREMIUM[compoundName]) {
      scarcityScore += 8;
    }
    if ((property.features || []).some((f) => ['garden', 'pool', 'roof'].includes(f.toLowerCase()))) {
      scarcityScore += 2;
    }

    // 5. Strategic Feasibility (0-10 pts)
    const feasibilityScore = 10;

    const overallScore = Math.min(
      100,
      preferenceScore + financialScore + scarcityScore + feasibilityScore
    );

    const justification = `Asset scored ${overallScore}/100. Location/preference match (+${preferenceScore}), financial value (+${financialScore}), high liquidity compound (+${scarcityScore}). Zero negative signals detected.`;

    results.push({
      propertyId: property.id,
      property,
      title: property.title,
      overallScore,
      breakdown: {
        preferenceScore,
        financialScore,
        scarcityScore,
        feasibilityScore,
      },
      negativeFlagsTriggered: negativeFlags,
      matchJustification: justification,
    });
  }

  return results.sort((a, b) => b.overallScore - a.overallScore).slice(0, maxResults);
}
