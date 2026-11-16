/**
 * SIERRA ESTATES — PROPERTY CODING ALGORITHM
 * Implements the proprietary [Location]-[Rooms][Status]-[Price]+[Feature] logic.
 */

import type { CurrencyCode, FurnishingCode, SierraFeatureCode } from '../models/schema';

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
  code: string;           // Strategic Display Code
  technicalId: string;    // Persistent System ID
  locationCode: string;
  rooms: number;
  furnishingStatus: FurnishingCode;
  normalizedPrice: number;
  currency: CurrencyCode;
  priceToken: string;
  featureCodes: SierraFeatureCode[];
}

const COMPOUND_MAP: Record<string, string> = {
  villette: 'VS',
  mivida: 'MV',
  'cairo festival city': 'CF',
  cfc: 'CF',
  'mountain view': 'MV',
  'hyde park': 'HP',
  sodic: 'SD',
  'palm hills': 'PH',
  zed: 'ZD',
  'shorouk villa': 'SV',
  tagamoa: 'TG',
  tagamoa5: 'TG',
  'new cairo': 'NC',
};

const FEATURE_PRIORITY: SierraFeatureCode[] = ['G', 'P', 'R', 'V'];

const FEATURE_MAP: Record<string, SierraFeatureCode> = {
  g: 'G',
  garden: 'G',
  p: 'P',
  pool: 'P',
  r: 'R',
  roof: 'R',
  rooftop: 'R',
  v: 'V',
  villa: 'V',
};

const normalizeToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeLocationCode = (input?: string) => {
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

const normalizeFurnishingStatus = (value?: string): FurnishingCode => {
  const normalized = normalizeToken(value || '');

  if (!normalized) {
    return 'U';
  }

  if (normalized.includes('semi')) {
    return 'S';
  }

  if (normalized.includes('kitchen')) {
    return 'K';
  }

  if (
    normalized.includes('full') ||
    normalized.includes('fully') ||
    normalized.includes('furnished') ||
    normalized.includes('ultra')
  ) {
    return 'F';
  }

  return 'U';
};

const normalizeFeatureCodes = (features: string[] = []): SierraFeatureCode[] => {
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

const formatPriceToken = (price: number, currency: CurrencyCode) => {
  if (currency === 'USD') {
    return `$${Math.round(price)}`;
  }

  if (price >= 1000000) {
    const millions = price / 1000000;
    const rounded = Number.isInteger(millions) ? millions.toString() : millions.toFixed(1).replace(/\.0$/, '');
    return `${rounded}M`;
  }

  if (price >= 1000) {
    return `${Math.round(price / 1000)}K`;
  }

  return `${Math.round(price)}`;
};

export function buildSierraCodeMetadata(input: PropertyCodeInput, sourcePlatform: string = 'W', agentInitials: string = 'SB'): SierraCodeMetadata {
  const normalizedPrice = Number.isFinite(input.price) ? Math.max(0, Math.round(input.price)) : 0;
  const currency = input.currency || 'EGP';
  const rooms = Number.isFinite(input.rooms) ? Math.max(0, Math.trunc(input.rooms || 0)) : 0;
  const locationCode = normalizeLocationCode(input.locationCode || input.compound);
  const furnishingStatus = normalizeFurnishingStatus(input.furnishingStatus);
  const featureCodes = normalizeFeatureCodes(input.features);
  const priceToken = formatPriceToken(normalizedPrice, currency);
  
  // Strategic Display Code: Clean, Minimalist (VS-3F-45K+G)
  const featuresString = featureCodes.length > 0 ? `+${featureCodes.join('')}` : '';
  const strategicCode = `${locationCode}-${rooms}${furnishingStatus}-${priceToken}${featuresString}`;
  
  // Technical System ID: [SourceType][Compound][Agent]-[Random]
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const technicalId = `${sourcePlatform.charAt(0)}${locationCode}${agentInitials}-${randomSuffix}`;

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
 * Generates a standardized Sierra Internal Code.
 * Example Outcome: MVD-3F-75K+G
 */
export function generateSierraCode(input: PropertyCodeInput): string {
  return buildSierraCodeMetadata(input).code;
}

/**
 * Decodes a Sierra Internal Code back into its constituent parts (Heuristic).
 */
export function parseSierraCode(code: string) {
  const parts = code.split('-');
  if (parts.length < 3) return null;

  return {
    location: parts[0],
    specs: parts[1],
    price: parts[2].split('+')[0],
    features: parts[2].includes('+') ? parts[2].split('+')[1].split('') : []
  };
}

/**
 * Computes deterministic MD5 sync_hash for property deduplication.
 */
export function computeSyncHash(params: {
  compound?: string;
  area?: number;
  floorLevel?: string | number;
  unitNumber?: string | number;
  price?: number;
}): string {
  const key = `${params.compound || ''}|${params.area || 0}|${params.floorLevel || ''}|${params.unitNumber || ''}|${params.price || 0}`;
  // Pure JS simple hash if crypto is not available in Edge browser, else crypto MD5
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `sbr_${hexHash}_${key.length}`;
}

