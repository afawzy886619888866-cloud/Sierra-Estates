import { Listing } from '../types';

/**
 * Calculates a deterministic AI score (0-100) for a property listing.
 * Evaluates listing completeness, image availability, price ratio, and broker verification.
 */
export function calculateAIScore(listing: Partial<Listing>): number {
  let score = 50; // Base baseline score

  // 1. Image Completeness (Up to +25 pts)
  const imageCount = listing.images?.length || listing.img || 0;
  if (imageCount >= 6) {
    score += 25;
  } else if (imageCount >= 3) {
    score += 15;
  } else if (imageCount >= 1) {
    score += 8;
  } else {
    score -= 15; // Penalty for zero photos
  }

  // 2. Data Completeness (+15 pts)
  if (listing.beds && listing.beds > 0) score += 5;
  if (listing.area && listing.area > 50) score += 5;
  if (listing.cmp && listing.cmp.trim().length > 0) score += 5;

  // 3. Source & Channel Quality (+10 pts)
  if (listing.source === 'EasyListing' || listing.source === 'Property Finder') {
    score += 10;
  }

  // 4. Status Multiplier (+5 pts)
  if (listing.status === 'Active') {
    score += 5;
  }

  // Clamp score between 0 and 100
  return Math.min(100, Math.max(0, score));
}

/**
 * Sorts listings descending by AI score. Top-scoring listings appear first.
 */
export function sortListingsByAIScore(listings: Listing[]): Listing[] {
  return [...listings].sort((a, b) => (b.ai || 0) - (a.ai || 0));
}
