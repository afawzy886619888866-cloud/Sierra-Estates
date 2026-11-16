/**
 * SIERRA ESTATES — PROPRIETARY PROPERTY CODING & DECODING ENGINE
 * 
 * Logic Structure: [Location Code]-[Rooms][Status]-[Price][Suffix]+[Feature]
 * Example: MVD-3F-75K+G (Mivida, 3BR Fully Furnished, 75,000 EGP, with Garden)
 * Technical ID Example: WMVD-SB-A8K2 (WhatsApp, Mivida, Sierra Blu, Unique Salt)
 */

export type CurrencyCode = 'EGP' | 'USD' | 'EUR' | 'GBP';
export type FurnishingCode = 'F' | 'U' | 'K' | 'S';
export type SierraFeatureCode = 'G' | 'P' | 'R' | 'V';

export interface PropertyCodeInput {
  locationCode?: string;
  compound?: string;
  rooms?: number;
  furnishingStatus?: FurnishingCode | string;
  price: number;
  currency?: CurrencyCode;
  features?: string[];
}

export interface SierraCodeMetadata {
  code: string;           // Strategic Display Code, e.g. MVD-3F-75K+G
  technicalId: string;    // Persistent System ID, e.g. WMVD-SB-A8K2
  locationCode: string;
  rooms: number;
  furnishingStatus: FurnishingCode;
  normalizedPrice: number;
  currency: CurrencyCode;
  priceToken: string;
  featureCodes: SierraFeatureCode[];
}

export interface ParsedSierraCode {
  location: string;
  rooms: number;
  furnishingStatus: FurnishingCode;
  priceToken: string;
  features: SierraFeatureCode[];
}

const COMPOUND_MAP: Record<string, string> = {
  villette: 'VLT',
  'villette sodic': 'VLT',
  mivida: 'MVD',
  'cairo festival city': 'CFC',
  cfc: 'CFC',
  'mountain view': 'MVW',
  'mountain view icity': 'MVI',
  'hyde park': 'HPK',
  sodic: 'SDC',
  'sodic east': 'SDE',
  'sodic west': 'SDW',
  'palm hills': 'PHL',
  'palm hills new cairo': 'PHN',
  zed: 'ZED',
  'zed east': 'ZDE',
  'shorouk villa': 'SHV',
  tagamoa: 'TGM',
  'fifth settlement': 'TGM',
  'new cairo': 'NCA',
  'al rehab': 'RHB',
  rehab: 'RHB',
  madinaty: 'MDN',
  marassi: 'MRS',
  hacienda: 'HCD',
  swanlake: 'SWL',
  'swan lake': 'SWL',
  katameya: 'KTM',
  'katameya dunes': 'KTD',
  'katameya heights': 'KTH',
  'lake view': 'LKV',
  badya: 'BDY',
};

const FEATURE_PRIORITY: SierraFeatureCode[] = ['G', 'P', 'R', 'V'];

const FEATURE_MAP: Record<string, SierraFeatureCode> = {
  g: 'G',
  garden: 'G',
  p: 'P',
  pool: 'P',
  swimming: 'P',
  r: 'R',
  roof: 'R',
  rooftop: 'R',
  v: 'V',
  villa: 'V',
};

const normalizeToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeLocationCode = (input?: string): string => {
  if (!input) {
    return 'UNK';
  }

  const normalized = normalizeToken(input);
  const mapped = COMPOUND_MAP[normalized];
  if (mapped) {
    return mapped;
  }

  const compact = input.replace(/[^a-z]/gi, '').toUpperCase();
  return (compact || 'UNK').slice(0, 3).padEnd(3, 'X');
};

export const normalizeFurnishingStatus = (value?: string): FurnishingCode => {
  const normalized = normalizeToken(value || '');

  if (!normalized) {
    return 'U';
  }

  if (normalized.includes('semi') || normalized === 's') {
    return 'S';
  }

  if (normalized.includes('kitchen') || normalized === 'k') {
    return 'K';
  }

  if (
    normalized.includes('full') ||
    normalized.includes('fully') ||
    normalized.includes('furnished') ||
    normalized.includes('ultra') ||
    normalized === 'f'
  ) {
    return 'F';
  }

  return 'U';
};

export const normalizeFeatureCodes = (features: string[] = []): SierraFeatureCode[] => {
  const codes = new Set<SierraFeatureCode>();

  for (const feature of features) {
    const normalized = normalizeToken(feature);
    const code = FEATURE_MAP[normalized];

    if (code) {
      codes.add(code);
    }
  }

  return FEATURE_PRIORITY.filter((code) => codes.has(code));
};

export const formatPriceToken = (price: number, currency: CurrencyCode = 'EGP'): string => {
  if (currency === 'USD') {
    return `$${Math.round(price)}`;
  }

  if (price >= 1_000_000) {
    const millions = price / 1_000_000;
    const rounded = Number.isInteger(millions) ? millions.toString() : millions.toFixed(1).replace(/\.0$/, '');
    return `${rounded}M`;
  }

  if (price >= 1_000) {
    const thousands = price / 1_000;
    const rounded = Number.isInteger(thousands) ? thousands.toString() : thousands.toFixed(1).replace(/\.0$/, '');
    return `${rounded}K`;
  }

  return `${Math.round(price)}`;
};

/**
 * Builds full metadata and standardized Sierra Internal Code.
 */
export function buildSierraCodeMetadata(
  input: PropertyCodeInput,
  sourcePlatform: string = 'W',
  agentInitials: string = 'SB'
): SierraCodeMetadata {
  const normalizedPrice = Number.isFinite(input.price) ? Math.max(0, Math.round(input.price)) : 0;
  const currency: CurrencyCode = input.currency || 'EGP';
  const rooms = Number.isFinite(input.rooms) ? Math.max(0, Math.trunc(input.rooms || 0)) : 0;
  const locationCode = normalizeLocationCode(input.locationCode || input.compound);
  const furnishingStatus = normalizeFurnishingStatus(input.furnishingStatus);
  const featureCodes = normalizeFeatureCodes(input.features);
  const priceToken = formatPriceToken(normalizedPrice, currency);

  const featureSuffix = featureCodes.length > 0 ? `+${featureCodes.join('')}` : '';
  const strategicCode = `${locationCode}-${rooms}${furnishingStatus}-${priceToken}${featureSuffix}`;

  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const technicalId = `${sourcePlatform.charAt(0).toUpperCase()}${locationCode}-${agentInitials}-${randomSuffix}`;

  return {
    code: strategicCode,
    technicalId,
    locationCode,
    rooms,
    furnishingStatus,
    normalizedPrice,
    currency,
    priceToken,
    featureCodes,
  };
}

/**
 * Generates a standardized Sierra Internal Code string (e.g. MVD-3F-75K+G).
 */
export function generateSierraCode(input: PropertyCodeInput): string {
  return buildSierraCodeMetadata(input).code;
}

/**
 * Heuristically parses a Sierra Internal Code back into its components.
 */
export function parseSierraCode(code: string): ParsedSierraCode | null {
  if (!code || typeof code !== 'string') return null;

  const parts = code.trim().split('-');
  if (parts.length < 3) return null;

  const location = parts[0];
  const specs = parts[1];
  const pricePart = parts[2];

  const roomsMatch = specs.match(/^(\d+)/);
  const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : 0;

  const statusChar = specs.replace(/^\d+/, '').toUpperCase();
  const furnishingStatus: FurnishingCode =
    statusChar === 'F' || statusChar === 'K' || statusChar === 'S' ? (statusChar as FurnishingCode) : 'U';

  const [priceToken, rawFeatures] = pricePart.split('+');
  const features: SierraFeatureCode[] = [];
  if (rawFeatures) {
    for (const char of rawFeatures) {
      if (char === 'G' || char === 'P' || char === 'R' || char === 'V') {
        features.push(char as SierraFeatureCode);
      }
    }
  }

  return {
    location,
    rooms,
    furnishingStatus,
    priceToken: priceToken || '0',
    features,
  };
}
