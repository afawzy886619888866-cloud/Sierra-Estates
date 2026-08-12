import { PropertyCard } from '../types/sierra-estates';

export const MOCK_PROPERTIES: PropertyCard[] = [
  {
    id: '1',
    title: 'Downtown Penthouse',
    price: 2_800_000,
    beds: 3,
    baths: 2,
    area: 2400,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    lat: 25.195,
    lng: 55.278,
    yield: 5.2,
    capRate: 6.8,
    schoolDist: '0.8 km to Al Khaleej School',
    transit: '5 min to Metro'
  },
  {
    id: '2',
    title: 'Marina Waterfront Villa',
    price: 4_200_000,
    beds: 5,
    baths: 4,
    area: 4100,
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    lat: 25.182,
    lng: 55.271,
    yield: 4.8,
    capRate: 5.9,
    schoolDist: '1.2 km to Dubai Modern School',
    transit: '12 min to Metro'
  },
  {
    id: '3',
    title: 'Historic District Townhouse',
    price: 1_500_000,
    beds: 2,
    baths: 2,
    area: 1400,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    lat: 25.165,
    lng: 55.258,
    yield: 6.1,
    capRate: 7.4,
    schoolDist: '1.5 km to Emirates International',
    transit: '8 min to Metro'
  }
];
