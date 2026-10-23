import { PropertyMatchmaker, type PropertyListing, type ClientProfile } from '../../../packages/agents-core/src/property-matcher';

describe('PropertyMatchmaker Vector & Heuristic Engine', () => {
  const listings: PropertyListing[] = [
    {
      id: 'prop-1',
      sierraCode: 'MI-S-4F-38M+G+P',
      title: 'Mivida Villa',
      compound: 'Mivida',
      type: 'Standalone Villa',
      price: 38000000,
      area_sqm: 450,
      bedrooms: 4,
      finishing: 'fully_finished',
      valuationScore: 90,
      urgencyScore: 95,
    },
    {
      id: 'prop-2',
      sierraCode: 'HY-P-3S-16.5M+R+L',
      title: 'Hyde Park Penthouse',
      compound: 'Hyde Park',
      type: 'Penthouse',
      price: 16500000,
      area_sqm: 280,
      bedrooms: 3,
      finishing: 'semi_finished',
      valuationScore: 75,
      urgencyScore: 60,
    },
  ];

  it('ranks exact compound match highest for client targeting Mivida', () => {
    const client: ClientProfile = {
      targetCompound: 'Mivida',
      budgetMax: 40000000,
      minBedrooms: 4,
    };

    const results = PropertyMatchmaker.rankProperties(listings, client);
    expect(results.length).toBe(2);
    expect(results[0].property.compound).toBe('Mivida');
    expect(results[0].matchScore).toBeGreaterThan(results[1].matchScore);
    expect(results[0].confidence).toBe('high');
  });

  it('handles empty criteria gracefully and returns scored results', () => {
    const client: ClientProfile = {};
    const results = PropertyMatchmaker.rankProperties(listings, client);
    expect(results.length).toBe(2);
    expect(results[0].matchScore).toBeGreaterThan(0);
  });
});
