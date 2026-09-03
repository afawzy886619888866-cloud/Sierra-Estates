 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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



const STATUS_MAP = {
  available: { status: 'available', label: 'Available' },
  rented: { status: 'unavailable', label: 'Rented' },
  sold: { status: 'unavailable', label: 'Sold' },
  'off-market': { status: 'unavailable', label: 'Off-market' },
};

/** Human-friendly price label (mirrors lib/inventory/normalize.js::priceLabel). */
function priceLabel(price) {
  if (!price) return 'Price on request';
  if (price >= 1000000) return `EGP ${(price / 1000000).toFixed(price % 1000000 === 0 ? 0 : 1)}M`;
  return `EGP ${price.toLocaleString('en-US')}`;
}

/** Canonical `units` doc (via InventoryQueryService) → public map unit. Strips PII. */
export function queryUnitToMapUnit(u) {
  const coords = (u ).coordinates;
  const resolved = resolveLocation(u.location || u.compound);
  const { status, label } = _nullishCoalesce(STATUS_MAP[u.status], () => ( { status: 'unavailable' , label: 'Off-market' }));
  return {
    id: u.id,
    code: u.code || null,
    // master-sheet-sync doesn't record rent vs sale explicitly; treat sub-100k
    // monthly-sized prices as rent, larger as sale (mirrors the sheet's own
    // price-magnitude heuristic in lib/inventory/normalize.js).
    mode: u.price > 0 && u.price < 1000000 ? 'rent' : 'sale',
    status,
    statusLabel: label,
    location: u.compound || resolved.label,
    rawLocation: u.location || null,
    zone: resolved.zone,
    lat: _nullishCoalesce(_optionalChain([coords, 'optionalAccess', _ => _.lat]), () => ( resolved.lat)),
    lng: _nullishCoalesce(_optionalChain([coords, 'optionalAccess', _2 => _2.lng]), () => ( resolved.lng)),
    approxLocation: coords ? false : resolved.approx,
    propertyType: u.propertyType || null,
    beds: u.bedrooms || null,
    area: u.area || null,
    garden: null,
    pool: false,
    furnished: null,
    price: u.price || 0,
    priceLabel: priceLabel(u.price || 0),
    comment: _nullishCoalesce(u.description, () => ( null)),
    updatedAt: _nullishCoalesce(u.updatedAt, () => ( null)),
  };
}
