/**
 * Static compound location data — no browser dependencies.
 * Safe to import in Server Components and SSR pages.
 */

export interface CompoundLocation {
  code: string;
  nameEn: string;
  nameAr: string;
  developer: string;
  lat: number;
  lng: number;
  unitsCount: number;
}

export const NEW_CAIRO_COMPOUNDS: CompoundLocation[] = [
  { code: 'HP', nameEn: 'Hyde Park', nameAr: 'هايد بارك', developer: 'Hyde Park Developments', lat: 30.008, lng: 31.645, unitsCount: 28 },
  { code: 'MVI', nameEn: 'Mountain View iCity', nameAr: 'ماونتن فيو أيكتي', developer: 'Mountain View', lat: 30.014, lng: 31.618, unitsCount: 24 },
  { code: 'MIV', nameEn: 'Mivida', nameAr: 'ميفيدا', developer: 'Emaar Misr', lat: 30.007, lng: 31.589, unitsCount: 23 },
  { code: 'CFC', nameEn: 'Cairo Festival City', nameAr: 'كايرو فيستيفال سيتي', developer: 'Al Futtaim', lat: 30.016, lng: 31.469, unitsCount: 18 },
  { code: 'TAJ', nameEn: 'Taj City', nameAr: 'تاج سيتي', developer: 'MNHD', lat: 30.065, lng: 31.531, unitsCount: 25 },
  { code: 'VLT', nameEn: 'Villette', nameAr: 'فيليت', developer: 'SODIC', lat: 30.053, lng: 31.598, unitsCount: 22 },
  { code: 'PH', nameEn: 'Palm Hills NC', nameAr: 'بالم هيلز', developer: 'Palm Hills', lat: 30.002, lng: 31.608, unitsCount: 19 },
  { code: 'EST', nameEn: 'Eastown', nameAr: 'إيستاون', developer: 'SODIC', lat: 30.018, lng: 31.587, unitsCount: 16 },
  { code: 'SL', nameEn: 'Swan Lake Residence', nameAr: 'سوان ليك', developer: 'Hassan Allam', lat: 30.045, lng: 31.635, unitsCount: 15 },
  { code: 'FS', nameEn: 'Fifth Square', nameAr: 'فيفت سكوير', developer: 'Al Marasem', lat: 30.025, lng: 31.578, unitsCount: 14 },
  { code: 'KH', nameEn: 'Katameya Heights', nameAr: 'قطامية هايتس', developer: 'Katameya', lat: 29.99, lng: 31.48, unitsCount: 12 },
  { code: 'MT', nameEn: 'Madinaty', nameAr: 'مدينتي', developer: 'TMG', lat: 30.108, lng: 31.62, unitsCount: 20 },
  { code: 'RH', nameEn: 'Al Rehab', nameAr: 'الرحاب', developer: 'TMG', lat: 30.065, lng: 31.492, unitsCount: 21 },
  { code: 'SR', nameEn: 'Stone Residence', nameAr: 'ستون ريزيدنس', developer: 'Rooya', lat: 30.005, lng: 31.442, unitsCount: 11 },
  { code: 'ZED', nameEn: 'Zed East', nameAr: 'زيد إيست', developer: 'Ora', lat: 30.095, lng: 31.61, unitsCount: 10 }
];
