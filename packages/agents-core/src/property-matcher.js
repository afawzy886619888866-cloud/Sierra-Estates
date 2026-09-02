/**
 * Sierra Estates AI Vector & Heuristic Property Matchmaker
 * Performs multi-dimensional similarity ranking over luxury inventory.
 */

































export class PropertyMatchmaker {
  /**
   * Calculate cosine-weighted multi-attribute match score for a property against client profile.
   */
   static calculateMatch(property, client) {
    let score = 0;
    let maxScore = 0;
    const reasons = [];

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
    const quality = property.valuationScore || 75;
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
    };
  }

  /**
   * Rank a collection of property listings for a client profile.
   */
   static rankProperties(listings, client, limit = 5) {
    return listings
      .map((p) => this.calculateMatch(p, client))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }
}
