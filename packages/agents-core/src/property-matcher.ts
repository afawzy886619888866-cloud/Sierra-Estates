/**
 * Sierra Estates AI Vector & Heuristic Property Matchmaker
 * Performs multi-dimensional similarity ranking over luxury inventory.
 */

export interface PropertyListing {
  id: string;
  sierraCode?: string;
  title: string;
  compound: string;
  type: string;
  price: number;
  area_sqm: number;
  bedrooms: number;
  finishing: string;
  valuationScore?: number;
  urgencyScore?: number;
  features?: string[];
}

export interface ClientProfile {
  targetCompound?: string;
  propertyType?: string;
  budgetMin?: number;
  budgetMax?: number;
  minBedrooms?: number;
  finishing?: string;
  urgency?: 'high' | 'medium' | 'low';
<<<<<<< HEAD
=======
  // Phase 5 profile gap-fill (master-spec qualification set):
  dealType?: 'sale' | 'rent';
  furnishing?: 'furnished' | 'semi_furnished' | 'unfurnished' | 'any';
  moveInDate?: string;
  nationality?: string;
  specialRequirements?: string;
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
}

export interface MatchResult {
  property: PropertyListing;
  matchScore: number; // 0 - 100%
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
<<<<<<< HEAD
}

export class PropertyMatchmaker {
=======
  /** Hard constraints this property violates (empty for normal results). */
  hardConstraintViolations: string[];
  /** True ⇒ surfaced only because compliant results < limit, per the
   *  master spec: violators may appear solely as flagged alternatives. */
  alternative?: boolean;
}

export class PropertyMatchmaker {
  /** Hard-constraint gate: budget ceiling + minimum bedrooms. A violation
   *  makes the property ineligible as a normal result (flagged alternative
   *  only). Master spec: never trade a hard constraint for a soft score. */
  private static hardViolations(property: PropertyListing, client: ClientProfile): string[] {
    const violations: string[] = [];
    if (client.budgetMax && property.price > client.budgetMax) {
      const overPct = Math.round(((property.price - client.budgetMax) / client.budgetMax) * 100);
      violations.push(`Over budget by ${overPct}%`);
    }
    if (client.minBedrooms && property.bedrooms < client.minBedrooms) {
      violations.push(`${property.bedrooms} bedrooms < ${client.minBedrooms} required`);
    }
    return violations;
  }

>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
  /**
   * Calculate cosine-weighted multi-attribute match score for a property against client profile.
   */
  public static calculateMatch(property: PropertyListing, client: ClientProfile): MatchResult {
    let score = 0;
    let maxScore = 0;
    const reasons: string[] = [];

    // 1. Compound Match (Weight: 30)
    maxScore += 30;
    if (client.targetCompound) {
      if (property.compound.toLowerCase().includes(client.targetCompound.toLowerCase())) {
        score += 30;
        reasons.push(`Target compound exact match (${property.compound})`);
      } else {
        score += 5; // Partial zone proximity
      }
    } else {
      score += 25; // Neutral
    }

    // 2. Budget Compatibility (Weight: 25)
    maxScore += 25;
    if (client.budgetMax) {
      if (property.price <= client.budgetMax) {
        if (!client.budgetMin || property.price >= client.budgetMin) {
          score += 25;
          reasons.push(`Price EGP ${(property.price / 1e6).toFixed(1)}M is within client budget`);
        } else {
          score += 18;
          reasons.push(`Price is below target minimum`);
        }
      } else {
        const divergence = (property.price - client.budgetMax) / client.budgetMax;
        if (divergence <= 0.15) {
          score += 10;
          reasons.push(`Price slightly exceeds budget (+${Math.round(divergence * 100)}%)`);
        }
      }
    } else {
      score += 20;
    }

    // 3. Property Type & Bedrooms (Weight: 25)
    maxScore += 25;
    if (client.propertyType && property.type.toLowerCase().includes(client.propertyType.toLowerCase())) {
      score += 15;
      reasons.push(`Desired unit type: ${property.type}`);
    } else {
      score += 5;
    }

    if (client.minBedrooms) {
      if (property.bedrooms >= client.minBedrooms) {
        score += 10;
        reasons.push(`Meets bedroom requirement (${property.bedrooms} beds)`);
      }
    } else {
      score += 8;
    }

    // 4. Quality & Valuation Boost (Weight: 20)
    maxScore += 20;
<<<<<<< HEAD
    const quality = property.valuationScore || 75;
=======
    // §21 no-fabrication: the quality boost is computed only from a real
    // valuation score — an unscored property earns no boost, never an
    // assumed 75/100.
    const quality = property.valuationScore ?? 0;
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    const qualityBoost = Math.round((quality / 100) * 20);
    score += qualityBoost;
    if (quality >= 85) {
      reasons.push(`High AVM valuation score (${quality}/100)`);
    }

    const finalPercent = Math.min(100, Math.round((score / maxScore) * 100));
    const confidence = finalPercent >= 80 ? 'high' : finalPercent >= 60 ? 'medium' : 'low';

    return {
      property,
      matchScore: finalPercent,
      confidence,
      reasons,
<<<<<<< HEAD
=======
      hardConstraintViolations: this.hardViolations(property, client),
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    };
  }

  /**
<<<<<<< HEAD
   * Rank a collection of property listings for a client profile.
   */
  public static rankProperties(listings: PropertyListing[], client: ClientProfile, limit: number = 5): MatchResult[] {
    return listings
      .map((p) => this.calculateMatch(p, client))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
=======
   * Rank a collection of property listings for a client profile. Compliant
   * results come first (by score); hard-constraint violators only ever
   * surface after them, explicitly flagged as alternatives, and only when
   * compliant results cannot fill the limit.
   */
  public static rankProperties(listings: PropertyListing[], client: ClientProfile, limit: number = 5): MatchResult[] {
    const scored = listings
      .map((p) => this.calculateMatch(p, client))
      .sort((a, b) => b.matchScore - a.matchScore);

    const compliant = scored.filter((m) => m.hardConstraintViolations.length === 0);
    if (compliant.length >= limit) {
      return compliant.slice(0, limit).map((m) => ({ ...m, alternative: false }));
    }

    const alternatives = scored
      .filter((m) => m.hardConstraintViolations.length > 0)
      .slice(0, limit - compliant.length)
      .map((m) => ({ ...m, alternative: true }));

    return [...compliant.map((m) => ({ ...m, alternative: false })), ...alternatives];
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
  }
}
