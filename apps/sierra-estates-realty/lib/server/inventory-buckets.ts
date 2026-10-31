/**
 * Command-center inventory status buckets — the mapping layer between the
 * Unified Admin Command Center's verified / stale / sold vocabulary
 * (spec: /admin/properties) and the production listing model built by
 * migrations 011 (Inventory OS v2), 013 (master inventory activation),
 * 020 (public publish gate) and 035 (self-transition guard):
 *
 *   verified → publish_status = 'PUBLISHABLE', stale = FALSE,
 *              status IN ('active','available')   [the public gate, 020]
 *   stale    → stale = TRUE OR publish_status = 'STALE'
 *   sold     → status = 'sold' (terminal in the transition guard)
 *   pending  → everything else (draft / pending verification / incomplete)
 *
 * Kept in a lib module (not the route file) because Next.js route files may
 * only export handlers + route config.
 */

export type InventoryBucket = 'verified' | 'stale' | 'sold' | 'pending' | 'all';

export const INVENTORY_BUCKETS: readonly InventoryBucket[] = [
  'all',
  'verified',
  'stale',
  'sold',
  'pending',
];

export function isInventoryBucket(value: unknown): value is InventoryBucket {
  return (
    typeof value === 'string' &&
    (INVENTORY_BUCKETS as readonly string[]).includes(value)
  );
}

export function bucketFor(row: Record<string, unknown>): InventoryBucket {
  const status = String(row.status ?? '');
  if (status === 'sold') return 'sold';
  if (row.stale === true || String(row.publishStatus ?? '') === 'STALE') return 'stale';
  const publishable = String(row.publishStatus ?? '') === 'PUBLISHABLE';
  const publiclyLive = status === 'active' || status === 'available';
  if (publishable && publiclyLive && row.stale !== true) return 'verified';
  return 'pending';
}

/** Public verified-collection gate (the /properties showcase rail). */
export function isVerifiedShowcaseRow(row: Record<string, unknown>): boolean {
  return (
    bucketFor(row) === 'verified' &&
    typeof row.freshnessScore === 'number' &&
    row.freshnessScore >= 90
  );
}
