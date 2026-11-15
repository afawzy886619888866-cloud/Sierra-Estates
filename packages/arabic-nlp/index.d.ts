export interface PreFilterSignals {
  hasRent: boolean;
  hasSale: boolean;
  hasDemand: boolean;
  hasSupply: boolean;
  hasBroker: boolean;
  hasOwner: boolean;
}

export interface ArabicPreFilterResult {
  mode: 'rent' | 'sale' | null;
  modeConflict: boolean;
  intent: 'demand' | 'supply';
  advertiserRole: 'owner' | 'broker' | 'unknown';
  areaSqm: number | null;
  bedrooms: number | null;
  phone: string | null;
  priceEgp: number | null;
  confidence: number;
  needsModeConfirmation: boolean;
  autoPublishEligible: boolean;
  signals: PreFilterSignals;
}

export function normalizeDigits(input: string): string;
export function normalizeArabicText(input: string): string;
export function preFilterArabicListing(rawText: string): ArabicPreFilterResult;
