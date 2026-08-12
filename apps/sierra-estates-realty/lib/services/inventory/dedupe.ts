/**
 * Sierra Estates — Inventory dedupe fingerprinting.
 *
 * Idea recovered from the Gravity Memory pipeline (FUTURE_PLAN/01):
 * a listing seen twice from different sources (PF feed, WhatsApp scrape,
 * Sheets) must resolve to ONE record. We fingerprint on the stable business
 * identity of a unit, with price bucketed so minor price edits don't split it.
 */
import { createHash } from 'node:crypto';

/** Normalize free-text: lowercase, trim, collapse spaces, strip Arabic tatweel/diacritics. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ـً-ٟ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Bucket price to ±2.5% bands so small corrections keep the same fingerprint. */
export function priceBand(price: number): number {
  if (price <= 0) return 0;
  const band = Math.round(Math.log(price) / Math.log(1.05));
  return band;
}

/** Bucket area to 5 sqm bands. */
export function areaBand(area: number): number {
  return Math.round(area / 5);
}

export interface FingerprintInput {
  compound: string;
  propertyType: string;
  offerType: string;
  bedrooms: number;
  area: number;
  price: number;
}

export function fingerprint(input: FingerprintInput): string {
  const key = [
    normalizeText(input.compound),
    normalizeText(input.propertyType),
    input.offerType,
    String(input.bedrooms),
    String(areaBand(input.area)),
    String(priceBand(input.price)),
  ].join('|');
  return createHash('sha256').update(key).digest('hex').slice(0, 24);
}
