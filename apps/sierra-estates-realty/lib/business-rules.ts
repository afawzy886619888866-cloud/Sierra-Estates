/**
 * Sierra Estates — Business Rules Engine
 * Hardcoded rules per architectural spec. TypeScript mirror of integration_config.py.
 */

// ═══════════════════════════════════════════════════════════
//  CURRENCY THRESHOLD (NON-NEGOTIABLE)
//  < 10,000 → USD ($) | >= 10,000 → EGP
// ═══════════════════════════════════════════════════════════

export const CURRENCY_THRESHOLD = 10_000;
export const VALUE_HUNTER_RATIO = 0.70;

export function formatPrice(amount: number): string {
  if (isNaN(amount)) return "N/A";
  if (amount < CURRENCY_THRESHOLD) {
    return `$${amount.toLocaleString("en-US")}`;
  }
  return `${amount.toLocaleString("en-US")} EGP`;
}

// ═══════════════════════════════════════════════════════════
//  SBR CODE GENERATOR
//  Pattern: [CompoundCode]-[Rooms][FurnishingCode]-[PriceCode]
// ═══════════════════════════════════════════════════════════

export const FURNISHING_CODES: Record<string, string> = {
  furnished: "F",
  "semi-furnished": "S",
  unfurnished: "U",
};

export const COMPOUND_CODES: Record<string, { name: string; lat: number; lng: number }> = {
  MIV: { name: "Mivida", lat: 30.0104, lng: 31.5165 },
  EST: { name: "Eastown", lat: 30.0152, lng: 31.4984 },
  MDT: { name: "Madinaty", lat: 30.1071, lng: 31.6404 },
  MNT: { name: "Mountain View", lat: 30.0220, lng: 31.4730 },
  HYD: { name: "Hyde Park", lat: 30.0085, lng: 31.4924 },
  LKV: { name: "Lake View", lat: 30.0198, lng: 31.4886 },
  PAL: { name: "Palm Hills", lat: 30.0312, lng: 31.4601 },
  VGN: { name: "Villette", lat: 30.0076, lng: 31.5089 },
  UPT: { name: "Uptown Cairo", lat: 30.0568, lng: 31.4113 },
  SRK: { name: "El Shorouk", lat: 30.1282, lng: 31.6088 },
};

export function generateSBRCode(
  compound: string,
  rooms: number,
  furnishing: string,
  price: number
): string {
  const furnCode = FURNISHING_CODES[furnishing.toLowerCase()] || "U";
  let priceCode: string;
  if (price < CURRENCY_THRESHOLD) {
    priceCode = `${(price / 1000).toFixed(1)}K`;
  } else {
    priceCode = `${(price / 1_000_000).toFixed(1)}M`;
  }
  return `${compound}-${rooms}${furnCode}-${priceCode}`;
}

// ═══════════════════════════════════════════════════════════
//  VALUE HUNTER ANALYTICS
//  Price <= 70% of compound mean → gold badge
// ═══════════════════════════════════════════════════════════

export function isValueHunterDeal(price: number, compoundMean: number): boolean {
  if (compoundMean <= 0) return false;
  return price <= compoundMean * VALUE_HUNTER_RATIO;
}

// ═══════════════════════════════════════════════════════════
//  CRM PIPELINE (10-Stage)
// ═══════════════════════════════════════════════════════════

export const CRM_STAGES = [
  "S1_Intake",
  "S2_Qualification",
  "S3_Matching",
  "S4_Proposal",
  "S5_Viewing",
  "S6_Negotiation",
  "S7_Offer",
  "S8_Contract",
  "S9_Payment",
  "S10_Closing",
] as const;

export type CRMStage = (typeof CRM_STAGES)[number];

export function getNextStage(current: CRMStage): CRMStage | null {
  const idx = CRM_STAGES.indexOf(current);
  if (idx < 0) return CRM_STAGES[0];
  if (idx >= CRM_STAGES.length - 1) return null;
  return CRM_STAGES[idx + 1];
}

// ═══════════════════════════════════════════════════════════
//  BRAND CONSTANTS
// ═══════════════════════════════════════════════════════════

export const BRAND = {
  name: "Sierra Estates",
  formerName: "Sierra Estates",
  headline: "The First Exclusive Destination for New Cairo Properties. Rent & Resale.",
  tagline: "Best-in-Class Design. AI-Driven Excellence.",
  palette: {
    navy: "#0A1628",
    gold: "#C9A24D",
    ivory: "#F4F0E8",
    navyLight: "#0E1D35",
    goldMuted: "#B8912F",
  },
  fonts: {
    luxury: "'Playfair Display', serif",
    data: "'Inter', sans-serif",
    arabic: "'Cairo', sans-serif",
  },
} as const;
