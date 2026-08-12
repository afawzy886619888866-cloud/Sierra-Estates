/**
 * Sierra Estates — Listing status lifecycle.
 * Pure logic, no I/O. Enforces every legal transition in one place so the
 * "1,900+ verified listings" claim is backed by a real state machine.
 */
import type { ListingStatus } from './types';

const TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  draft: ['pending_verification', 'archived'],
  pending_verification: ['verified', 'draft', 'archived'],
  verified: ['published', 'pending_verification', 'archived'],
  published: ['reserved', 'expired', 'pending_verification', 'archived'],
  reserved: ['sold', 'rented', 'published', 'archived'],
  sold: [],
  rented: ['published'], // rental cycle can relist
  expired: ['pending_verification', 'archived'],
  archived: [],
};

export function canTransition(from: ListingStatus, to: ListingStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: ListingStatus, to: ListingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal listing transition: ${from} → ${to}`);
  }
}

/** States visible on the public site. */
export const PUBLIC_STATUSES: ListingStatus[] = ['published', 'reserved'];

/** States that count toward the "verified listings" figure. */
export const VERIFIED_STATUSES: ListingStatus[] = ['verified', 'published', 'reserved'];

/** Days without re-verification before a published listing is swept to expired. */
export const FRESHNESS_SLA_DAYS = 30;

export function isStale(verifiedAt: string | undefined, now: Date = new Date()): boolean {
  if (!verifiedAt) return true;
  const ageMs = now.getTime() - new Date(verifiedAt).getTime();
  return ageMs > FRESHNESS_SLA_DAYS * 24 * 60 * 60 * 1000;
}
