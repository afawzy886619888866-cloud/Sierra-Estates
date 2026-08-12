/**
 * Bridge between the canonical `units` collection (read via
 * InventoryQueryService — populated by master-sheet-sync.ts, the single source
 * of truth also consumed by the AI Closer Agent, semantic search, and admin)
 * and the public map shape (`InventoryUnit` in lib/inventory/types.ts).
 *
 * PRIVACY: InventoryQueryService's shape carries `ownerContact` (the owner's
 * raw mobile number) for internal/admin/bot consumers. This mapper NEVER reads
 * or forwards it — the public map must never see it.
 */
import { resolveLocation } from '@/lib/inventory/gazetteer';
import type { InventoryStatus, InventoryUnit } from '@/lib/inventory/types';
import type { InventoryUnit as QueryUnit } from '@/lib/services/inventory-query';

const STATUS_MAP: Record<QueryUnit['status'], { status: InventoryStatus; label: string }> = {
  available: { status: 'available', label: 'Available' },
  rented: { status: 'unavailable', label: 'Rented' },
  sold: { status: 'unavailable', label: 'Sold' },
  'off-market': { status: 'unavailable', label: 'Off-market' },
};

/** Human-friendly price label (mirrors lib/inventory/normalize.js::priceLabel). */
function priceLabel(price: number): string {
  if (!price) return 'Price on request';
  if (price >= 1_000_000) return `EGP ${(price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 1)}M`;
  return `EGP ${price.toLocaleString('en-US')}`;
}

/** Canonical `units` doc (via InventoryQueryService) → public map unit. Strips PII. */
export function queryUnitToMapUnit(u: QueryUnit): InventoryUnit {
  const coords = (u as unknown as { coordinates?: { lat: number; lng: number } }).coordinates;
  const resolved = resolveLocation(u.location || u.compound);
  const { status, label } = STATUS_MAP[u.status] ?? { status: 'unavailable' as const, label: 'Off-market' };
  return {
    id: u.id,
    code: u.code || null,
    // master-sheet-sync doesn't record rent vs sale explicitly; treat sub-100k
    // monthly-sized prices as rent, larger as sale (mirrors the sheet's own
    // price-magnitude heuristic in lib/inventory/normalize.js).
    mode: u.price > 0 && u.price < 1_000_000 ? 'rent' : 'sale',
    status,
    statusLabel: label,
    location: u.compound || resolved.label,
    rawLocation: u.location || null,
    zone: resolved.zone,
    lat: coords?.lat ?? resolved.lat,
    lng: coords?.lng ?? resolved.lng,
    approxLocation: coords ? false : resolved.approx,
    propertyType: u.propertyType || null,
    beds: u.bedrooms || null,
    area: u.area || null,
    garden: null,
    pool: false,
    furnished: null,
    price: u.price || 0,
    priceLabel: priceLabel(u.price || 0),
    comment: u.description ?? null,
    updatedAt: u.updatedAt ?? null,
  };
}
