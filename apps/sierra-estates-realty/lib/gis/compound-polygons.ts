/**
 * Sierra Estates — 4K GIS Engine & Canonical Compound Polygons
 *
 * Defines the GPS bounding polygons, centroids, benchmark pricing, and rental yields
 * for the 14 target compounds in Greater New Cairo.
 * Calibrated against New Cairo masterplans and arterial road networks.
 *
 * Requirements: R1 (4K Ultra-HD Glowing GIS Map & Proximity Discovery Engine)
 */

export interface CompoundGisData {
  code: string;
  nameEn: string;
  nameAr: string;
  developer: string;
  centroid: [number, number];
  polygon: [number, number][];
  borderColor: string; // Metallic Gold (#C9A84C), Electric Cyan (#00F0FF), or Emerald (#10B981)
  fillColor: string;
  avgPriceSqmEgp: number;
  rentalYieldRange: string;
  aliases?: string[];
}

export interface Landmark {
  id: string;
  nameEn: string;
  nameAr: string;
  coords: [number, number];
  icon: string;
}

/**
 * Key New Cairo landmarks for proximity discovery & drive time calculations.
 */
export const NEW_CAIRO_LANDMARKS: Landmark[] = [
  {
    id: 'auc',
    nameEn: 'AUC Campus',
    nameAr: 'الجامعة الأمريكية',
    coords: [30.0194, 31.5003],
    icon: '🏛️',
  },
  {
    id: 'golden-square',
    nameEn: 'Golden Square',
    nameAr: 'المربع الذهبي',
    coords: [30.015, 31.605],
    icon: '🏢',
  },
  {
    id: '90th-street',
    nameEn: '90th Street',
    nameAr: 'شارع التسعين',
    coords: [30.028, 31.485],
    icon: '🛣️',
  },
  {
    id: 'nac',
    nameEn: 'New Capital Gate',
    nameAr: 'بوابة العاصمة الإدارية',
    coords: [30.0142, 31.7354],
    icon: '🏛️',
  },
];

export const EXTENDED_LANDMARKS: Landmark[] = [
  ...NEW_CAIRO_LANDMARKS,
  {
    id: 'airport',
    nameEn: 'Cairo International Airport',
    nameAr: 'مطار القاهرة الدولي',
    coords: [30.1219, 31.4056],
    icon: '✈️',
  },
];

/**
 * Full GPS bounding polygons and benchmarks for all 14 target compounds.
 */
export const TARGET_14_COMPOUND_POLYGONS: Record<string, CompoundGisData> = {
  'Hyde Park': {
    code: 'HP',
    nameEn: 'Hyde Park',
    nameAr: 'هايد بارك',
    developer: 'Hyde Park Developments',
    centroid: [30.008, 31.645],
    polygon: [
      [30.021, 31.562],
      [30.018, 31.588],
      [29.997, 31.586],
      [30.000, 31.560],
    ],
    borderColor: '#C9A84C', // Glowing Metallic Gold
    fillColor: 'rgba(201, 168, 76, 0.14)',
    avgPriceSqmEgp: 78000,
    rentalYieldRange: '8.5% - 9.8%',
    aliases: ['Hyde Park New Cairo', 'Hyde Park Developments', 'HP'],
  },
  'Mountain View Hyde Park': {
    code: 'MVHP',
    nameEn: 'Mountain View Hyde Park',
    nameAr: 'ماونتن فيو هايد بارك',
    developer: 'DMG / Mountain View',
    centroid: [30.011, 31.572],
    polygon: [
      [30.017, 31.565],
      [30.015, 31.580],
      [30.005, 31.578],
      [30.007, 31.563],
    ],
    borderColor: '#00F0FF', // Electric Cyan
    fillColor: 'rgba(0, 240, 255, 0.12)',
    avgPriceSqmEgp: 74000,
    rentalYieldRange: '8.8% - 10.1%',
    aliases: ['MV Hyde Park', 'Mountain View HP', 'MVHP'],
  },
  'Mountain View iCity': {
    code: 'MVI',
    nameEn: 'Mountain View iCity',
    nameAr: 'ماونتن فيو آي سيتي',
    developer: 'DMG / Mountain View',
    centroid: [30.055, 31.558],
    polygon: [
      [30.064, 31.550],
      [30.062, 31.572],
      [30.047, 31.569],
      [30.049, 31.547],
    ],
    borderColor: '#00F0FF', // Electric Cyan
    fillColor: 'rgba(0, 240, 255, 0.12)',
    avgPriceSqmEgp: 72000,
    rentalYieldRange: '9.0% - 10.5%',
    aliases: ['MV iCity', 'iCity New Cairo', 'Mountain View iCity New Cairo'],
  },
  'Mivida': {
    code: 'MIV',
    nameEn: 'Mivida',
    nameAr: 'ميفيدا',
    developer: 'Emaar Misr',
    centroid: [30.018, 31.535],
    polygon: [
      [30.028, 31.525],
      [30.025, 31.547],
      [30.008, 31.544],
      [30.011, 31.522],
    ],
    borderColor: '#C9A84C', // Metallic Gold
    fillColor: 'rgba(201, 168, 76, 0.15)',
    avgPriceSqmEgp: 92000,
    rentalYieldRange: '8.8% - 10.2%',
    aliases: ['Mivida Emaar', 'Mivida Compound', 'MIV'],
  },
  'CFC': {
    code: 'CFC',
    nameEn: 'Cairo Festival City',
    nameAr: 'كايرو فيستيفال سيتي',
    developer: 'Al Futtaim',
    centroid: [30.031, 31.408],
    polygon: [
      [30.041, 31.398],
      [30.039, 31.420],
      [30.021, 31.418],
      [30.023, 31.396],
    ],
    borderColor: '#10B981', // Emerald Green
    fillColor: 'rgba(16, 185, 129, 0.14)',
    avgPriceSqmEgp: 85000,
    rentalYieldRange: '8.2% - 9.4%',
    aliases: ['Cairo Festival City', 'Festival City', 'CFC Residence'],
  },
  'Palm Hills New Cairo': {
    code: 'PH',
    nameEn: 'Palm Hills New Cairo',
    nameAr: 'بالم هيلز القاهرة الجديدة',
    developer: 'Palm Hills Developments',
    centroid: [30.022, 31.580],
    polygon: [
      [30.031, 31.571],
      [30.029, 31.591],
      [30.013, 31.589],
      [30.015, 31.569],
    ],
    borderColor: '#C9A84C', // Metallic Gold
    fillColor: 'rgba(201, 168, 76, 0.14)',
    avgPriceSqmEgp: 88000,
    rentalYieldRange: '8.6% - 9.9%',
    aliases: ['Palm Hills Katameya', 'PK2', 'Palm Hills PK', 'PH New Cairo'],
  },
  'Katameya Heights': {
    code: 'KH',
    nameEn: 'Katameya Heights',
    nameAr: 'قطامية هايتس',
    developer: 'Katameya Group',
    centroid: [29.988, 31.424],
    polygon: [
      [29.999, 31.413],
      [29.996, 31.438],
      [29.977, 31.435],
      [29.980, 31.410],
    ],
    borderColor: '#C9A84C', // Ultra Luxury Gold
    fillColor: 'rgba(201, 168, 76, 0.18)',
    avgPriceSqmEgp: 125000,
    rentalYieldRange: '7.8% - 9.0%',
    aliases: ['Katameya Heights Golf', 'KH Golf'],
  },
  'Katameya Dunes': {
    code: 'KD',
    nameEn: 'Katameya Dunes',
    nameAr: 'قطامية ديونز',
    developer: 'Katameya Group',
    centroid: [29.985, 31.492],
    polygon: [
      [29.995, 31.480],
      [29.992, 31.505],
      [29.975, 31.502],
      [29.978, 31.478],
    ],
    borderColor: '#10B981', // Golf Emerald
    fillColor: 'rgba(16, 185, 129, 0.15)',
    avgPriceSqmEgp: 110000,
    rentalYieldRange: '8.0% - 9.2%',
    aliases: ['Katameya Dunes Golf', 'KD Golf'],
  },
  'Eastown': {
    code: 'EST',
    nameEn: 'Eastown',
    nameAr: 'إيستاون',
    developer: 'SODIC',
    centroid: [30.014, 31.505],
    polygon: [
      [30.022, 31.497],
      [30.020, 31.514],
      [30.006, 31.512],
      [30.008, 31.495],
    ],
    borderColor: '#00F0FF', // Cyan / Sodic
    fillColor: 'rgba(0, 240, 255, 0.12)',
    avgPriceSqmEgp: 76000,
    rentalYieldRange: '9.2% - 10.6%',
    aliases: ['Eastown SODIC', 'Eastown Residences'],
  },
  'Villette': {
    code: 'VLT',
    nameEn: 'Villette',
    nameAr: 'فيليت',
    developer: 'SODIC',
    centroid: [30.025, 31.548],
    polygon: [
      [30.033, 31.539],
      [30.031, 31.558],
      [30.017, 31.556],
      [30.019, 31.537],
    ],
    borderColor: '#00F0FF', // Cyan / Sodic
    fillColor: 'rgba(0, 240, 255, 0.12)',
    avgPriceSqmEgp: 84000,
    rentalYieldRange: '8.7% - 10.0%',
    aliases: ['Villette SODIC', 'Villette New Cairo'],
  },
  'Swan Lake': {
    code: 'SL',
    nameEn: 'Swan Lake Residence',
    nameAr: 'سوان ليك ريزيدنس',
    developer: 'Hassan Allam',
    centroid: [30.042, 31.515],
    polygon: [
      [30.050, 31.507],
      [30.048, 31.525],
      [30.034, 31.523],
      [30.036, 31.505],
    ],
    borderColor: '#C9A84C', // Hassan Allam Gold
    fillColor: 'rgba(201, 168, 76, 0.16)',
    avgPriceSqmEgp: 115000,
    rentalYieldRange: '8.4% - 9.6%',
    aliases: ['Swan Lake', 'SwanLake', 'Swan Lake New Cairo', 'Hassan Allam Swan Lake'],
  },
  'Taj City': {
    code: 'TAJ',
    nameEn: 'Taj City',
    nameAr: 'تاج سيتي',
    developer: 'Madinet Masr (MNHD)',
    centroid: [30.074, 31.400],
    polygon: [
      [30.082, 31.390],
      [30.080, 31.412],
      [30.065, 31.410],
      [30.067, 31.388],
    ],
    borderColor: '#10B981', // Emerald
    fillColor: 'rgba(16, 185, 129, 0.12)',
    avgPriceSqmEgp: 68000,
    rentalYieldRange: '9.4% - 10.8%',
    aliases: ['Taj City MNHD', 'Taj City New Cairo'],
  },
  'The Square': {
    code: 'SQR',
    nameEn: 'The Square',
    nameAr: 'ذا سكوير',
    developer: 'Al Ahly Sabbour',
    centroid: [30.033, 31.542],
    polygon: [
      [30.040, 31.535],
      [30.038, 31.550],
      [30.026, 31.548],
      [30.028, 31.533],
    ],
    borderColor: '#00F0FF', // Cyan
    fillColor: 'rgba(0, 240, 255, 0.12)',
    avgPriceSqmEgp: 64000,
    rentalYieldRange: '9.1% - 10.4%',
    aliases: ['The Square Sabbour', 'Al Ahly Sabbour The Square'],
  },
  'Lake View': {
    code: 'LV',
    nameEn: 'Lake View Residence',
    nameAr: 'ليك فيو ريزيدنس',
    developer: 'El Hazek Developments',
    centroid: [30.0225, 31.4812],
    polygon: [
      [30.030, 31.472],
      [30.028, 31.490],
      [30.015, 31.488],
      [30.017, 31.470],
    ],
    borderColor: '#C9A84C', // Gold
    fillColor: 'rgba(201, 168, 76, 0.14)',
    avgPriceSqmEgp: 82000,
    rentalYieldRange: '8.6% - 9.8%',
    aliases: ['Lake View', 'Lake View Residence', 'El Hazek Lake View'],
  },
};

export const EXTENDED_COMPOUND_POLYGONS: Record<string, CompoundGisData> = {
  ...TARGET_14_COMPOUND_POLYGONS,
  'Uptown Cairo': {
    code: 'UPC',
    nameEn: 'Uptown Cairo',
    nameAr: 'أب تاون كايرو',
    developer: 'Emaar Misr',
    centroid: [30.011, 31.297],
    polygon: [
      [30.022, 31.285],
      [30.020, 31.310],
      [30.002, 31.308],
      [30.005, 31.283],
    ],
    borderColor: '#C9A84C', // Emaar Gold
    fillColor: 'rgba(201, 168, 76, 0.16)',
    avgPriceSqmEgp: 95000,
    rentalYieldRange: '8.5% - 9.9%',
    aliases: ['Uptown Cairo', 'Aurora', 'Celesta Hills', 'Uptown', 'اب تاون كايرو', 'أبتاون كايرو', 'UPC'],
  },
};

/**
 * Great-circle distance using Haversine formula in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Calibrated driving time in minutes for New Cairo arterial expressways.
 * Formula: timeMin = Math.max(2, Math.round(distKm * 1.35 + 2))
 */
export function calculateDriveTimeMin(distKm: number): number {
  return Math.max(2, Math.round(distKm * 1.35 + 2));
}

/**
 * Calculates travel times in minutes from a given point to all standard landmarks.
 */
export function calculateLandmarkDriveTimes(
  coords: [number, number]
): Record<string, number> {
  const [lat, lng] = coords;
  const driveTimes: Record<string, number> = {};
  for (const landmark of NEW_CAIRO_LANDMARKS) {
    const distKm = calculateHaversineDistanceKm(
      lat,
      lng,
      landmark.coords[0],
      landmark.coords[1]
    );
    driveTimes[landmark.id] = calculateDriveTimeMin(distKm);
  }
  return driveTimes;
}

/**
 * Resolves a compound GIS definition by compound name or alias.
 */
export function getCompoundGisData(name: string): CompoundGisData | undefined {
  if (!name) return undefined;
  const catalog = typeof EXTENDED_COMPOUND_POLYGONS !== 'undefined' ? EXTENDED_COMPOUND_POLYGONS : TARGET_14_COMPOUND_POLYGONS;
  const direct = catalog[name];
  if (direct) return direct;

  const normalized = name.trim().toLowerCase();
  for (const [key, data] of Object.entries(catalog)) {
    if (key.toLowerCase() === normalized) return data;
    if (data.nameEn.toLowerCase() === normalized) return data;
    if (data.nameAr.toLowerCase() === normalized) return data;
    if (data.code.toLowerCase() === normalized) return data;
    if (data.aliases && data.aliases.some((a) => a.toLowerCase() === normalized)) {
      return data;
    }
  }

  // Partial containment fallback
  for (const [key, data] of Object.entries(catalog)) {
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return data;
    }
  }

  return undefined;
}
