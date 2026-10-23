export type UserIntent = 'homebuyer' | 'collector' | 'investor' | null;

export type PropertyCard = {
  id: string;
  title: string;
  price: number;
  beds: number;
  baths: number;
  area: number;
  image: string;
  lat: number;
  lng: number;
  yield?: number;
  capRate?: number;
  schoolDist?: string;
  transit?: string;
};
