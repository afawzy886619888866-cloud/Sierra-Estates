import { describe, it, expect } from 'vitest';

describe('Matching & Property Recommendation Engine Test Suite', () => {
  interface PropertyListing {
    id: string;
    title: string;
    compound: string;
    priceEgp: number;
    bedrooms: number;
    buaSqm: number;
    propertyType: string;
  }

  interface BuyerProfile {
    targetCompounds: string[];
    minBudgetEgp: number;
    maxBudgetEgp: number;
    minBedrooms: number;
    propertyType: string;
  }

  function calculateMatchScore(buyer: BuyerProfile, property: PropertyListing): number {
    let score = 0;

    // 1. Compound Match (Weight: 40 points)
    const compoundMatch = buyer.targetCompounds.some(
      (c) => c.toLowerCase() === property.compound.toLowerCase()
    );
    if (compoundMatch) score += 40;

    // 2. Budget Fit (Weight: 30 points)
    if (property.priceEgp >= buyer.minBudgetEgp && property.priceEgp <= buyer.maxBudgetEgp) {
      score += 30;
    } else if (property.priceEgp <= buyer.maxBudgetEgp * 1.1) {
      score += 15; // Within 10% stretch budget
    }

    // 3. Bedroom Fit (Weight: 20 points)
    if (property.bedrooms >= buyer.minBedrooms) {
      score += 20;
    }

    // 4. Type Match (Weight: 10 points)
    if (property.propertyType.toLowerCase() === buyer.propertyType.toLowerCase()) {
      score += 10;
    }

    return score; // Max 100
  }

  function rankListingsForBuyer(buyer: BuyerProfile, inventory: PropertyListing[], topK = 3): { property: PropertyListing; score: number }[] {
    return inventory
      .map((property) => ({
        property,
        score: calculateMatchScore(buyer, property),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  const SAMPLE_INVENTORY: PropertyListing[] = [
    {
      id: 'p-1',
      title: 'Mivida Standalone Villa',
      compound: 'Mivida',
      priceEgp: 36_000_000,
      bedrooms: 5,
      buaSqm: 380,
      propertyType: 'Standalone Villa',
    },
    {
      id: 'p-2',
      title: 'Hyde Park Townhouse',
      compound: 'Hyde Park',
      priceEgp: 22_000_000,
      bedrooms: 3,
      buaSqm: 240,
      propertyType: 'Townhouse',
    },
    {
      id: 'p-3',
      title: 'Palm Hills Katameya Villa',
      compound: 'Palm Hills Katameya',
      priceEgp: 55_000_000,
      bedrooms: 6,
      buaSqm: 500,
      propertyType: 'Standalone Villa',
    },
  ];

  it('should rank perfect match with 100/100 match score', () => {
    const buyer: BuyerProfile = {
      targetCompounds: ['Mivida'],
      minBudgetEgp: 30_000_000,
      maxBudgetEgp: 40_000_000,
      minBedrooms: 4,
      propertyType: 'Standalone Villa',
    };

    const recommendations = rankListingsForBuyer(buyer, SAMPLE_INVENTORY, 1);
    expect(recommendations.length).toBe(1);
    expect(recommendations[0].property.id).toBe('p-1');
    expect(recommendations[0].score).toBe(100);
  });

  it('should rank properties by score descending', () => {
    const buyer: BuyerProfile = {
      targetCompounds: ['Hyde Park', 'Mivida'],
      minBudgetEgp: 20_000_000,
      maxBudgetEgp: 25_000_000,
      minBedrooms: 3,
      propertyType: 'Townhouse',
    };

    const ranked = rankListingsForBuyer(buyer, SAMPLE_INVENTORY);
    expect(ranked[0].property.id).toBe('p-2'); // Hyde Park Townhouse
    expect(ranked[0].score).toBe(100);
  });
});
