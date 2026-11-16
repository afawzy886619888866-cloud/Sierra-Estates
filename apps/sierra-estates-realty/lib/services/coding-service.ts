/**
 * SIERRA ESTATES — TACTICAL CODING SERVICE
 * Implements the Urban Hub OS Smart Coding System (V2.0).
 */

import { FurnishingCode, SierraFeatureCode } from '../models/schema';

export interface CodingParams {
  compound: string;
  building?: string;
  tower?: string;
  type?: string;
  unitNumber?: string;
  floor?: string;
  rooms?: number;
  price?: number;
}

export function generateSmartCode(params: CodingParams, region: 'matareya' | 'nexus' = 'nexus'): string {
  const { compound, building, tower, type, unitNumber, floor: _floor, rooms, price } = params;

  // 1. Matareya / Cairo Plaza Specific Pattern
  // [Compound]-[Building/Tower]-[Type]-[Unit#]
  if (region === 'matareya' || compound.toLowerCase().includes('cairo plaza') || compound === 'CP') {
    const cpCode = 'CP';
    const bldCode = building || tower || 'BX';
    const typeCode = type?.toUpperCase().slice(0, 3) || 'UNT';
    const unitCode = unitNumber || '0000';
    return `${cpCode}-${bldCode}-${typeCode}-${unitCode}`;
  }

  // 2. Tagamoa / Shorouk / Nexus Pattern (Urban Hub OS Global Mandate)
  // [Compound]-[Bedrooms][Furnish]-[PriceShort]
  // Example: VS-3S-45K
  const compCode = getCompoundShortCode(compound);
  const _furnishedCode = params.type === 'commercial' ? 'OFF' : (getFurnishingCode(params.floor || '') || 'U');
  // Wait, user example VS-3S-45K. 3S = 3 Bedrooms, Semi-furnished.
  const bedsCode = rooms ? `${rooms}` : 'X';
  const furnLetter = params.floor?.toUpperCase().includes('F') ? 'F' : (params.floor?.toUpperCase().includes('S') ? 'S' : 'U');
  
  // Refined Logic for the code VS-3S-45K
  const smartBedsFurnish = `${bedsCode}${furnLetter}`;

  let priceShort = '0';
  if (price) {
    if (price >= 1000000) priceShort = (price / 1000000).toFixed(1).replace('.0', '') + 'M';
    else if (price >= 1000) priceShort = (price / 1000).toFixed(0) + 'K';
    else priceShort = price.toString();
  }

  return `${compCode}-${smartBedsFurnish}-${priceShort}`;
}

function getCompoundShortCode(name: string): string {
  const dict: Record<string, string> = {
    'lake view': 'LVR',
    'mivida': 'MIV',
    'mountain view': 'MV',
    'hyde park': 'HP',
    'cairo festival': 'CFC',
    'gardenia': 'GC',
    'rehab': 'RH',
    'shorouk': 'SHK',
    'madinaty': 'MDN'
  };

  const normalized = name.toLowerCase();
  for (const [key, code] of Object.entries(dict)) {
    if (normalized.includes(key)) return code;
  }

  return name.slice(0, 3).toUpperCase();
}

/**
 * Normalizes furnishing codes based on Urban Hub OS standards.
 */
export function getFurnishingCode(status: string): FurnishingCode {
  const normalized = status.toLowerCase();
  if (normalized.includes('full') || normalized.includes('furnished')) return 'F';
  if (normalized.includes('semi')) return 'S';
  if (normalized.includes('kitchen')) return 'K';
  return 'U';
}

/**
 * Detects extra features based on Urban Hub OS standards.
 */
export function getFeatureCodes(text: string): SierraFeatureCode[] {
  const codes: SierraFeatureCode[] = [];
  const normalized = text.toLowerCase();
  
  if (normalized.includes('garden')) codes.push('G');
  if (normalized.includes('pool')) codes.push('P');
  if (normalized.includes('roof')) codes.push('R');
  if (normalized.includes('view')) codes.push('V');
  
  return codes;
}
