// Master Full-Stack Integration Pipeline Engine


















/**
 * Ranks properties dynamically using AI metrics combined with a 10-day linear freshness decay.
 * Formula: Final Score = AI Score + Freshness Boost
 */
export function processAndRankInventory(listings) {
  const now = new Date().getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  return listings
    .filter(property => property.isPublishedToClientPage === true) // Control room filter rule
    .map(property => {
      const ageInDays = (now - new Date(property.createdAt).getTime()) / ONE_DAY_MS;
      
      // Freshness boost: Max +2.0 points for brand new items, decaying 0.2 points per day over 10 days
      const freshnessBoost = Math.max(0, 2.0 - (ageInDays * 0.2));
      const finalScore = property.aiScore + freshnessBoost;
      
      return { ...property, _calculatedScore: finalScore };
    })
    .sort((a, b) => (b )._calculatedScore - (a )._calculatedScore);
}
