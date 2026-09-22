import { PropertyCard } from '../types/sierra-estates';

export const MOCK_PROPERTIES: PropertyCard[] = [
  {
    id: '1',
    title: 'Downtown Penthouse',
    price: 2_800_000,
    beds: 3,
    baths: 2,
    area: 2400,
    image: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/6e1de887-e761-41ec-97a0-6ff5fdac01dd.jpg',
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
    image: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5VA6FB3R0WKZSSX512CWN/134819e2-a145-4ac2-8cc6-1fe89981c86a.png',
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
    image: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHJWNY2C8HBCSBTEGVDF/f7752243-f23b-4036-8845-ab88cff3455b.png',
    lat: 25.165,
    lng: 55.258,
    yield: 6.1,
    capRate: 7.4,
    schoolDist: '1.5 km to Emirates International',
    transit: '8 min to Metro'
  }
];
