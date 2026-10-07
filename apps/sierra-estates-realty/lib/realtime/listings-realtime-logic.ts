/**
 * listings-realtime-logic — PURE logic for Supabase Realtime patches.
 *
 * Framework-free and Supabase-free on purpose (modular isolation): the hook
 * (`hooks/useListingsRealtime.ts`) only owns the websocket subscription and
 * delegates every row decision to this module, so the full event contract is
 * unit-testable without a client, network, or React.
 *
 * CONTRACT MIRROR — these functions must accept exactly the rows that the
 * initial fetch (`GET /api/inventory`) would have served:
 *
 *   /api/inventory serves rows WHERE status = 'active'
 *                              AND publish_status = 'PUBLISHABLE'
 *   and the properties page additionally drops owner-direct rows
 *   (party/sourceType/segment/tag filters on the API-mapped units).
 *
 * The realtime payloads are RAW `public.listings` rows, so the owner test is
 * expressed on raw columns: `source_channel` containing 'owner' (the same
 * evidence `deriveSegment` in the inventory route uses to bucket owners_*)
 * or `raw_data.tag = 'Direct Owner'`.
 *
 * Anti-fabrication (§21): the sanitizer only mirrors real row data — missing
 * values surface as honest zeros / 'Unspecified' / 'Price on request',
 * exactly like the page-level `sanitizeUnit`.
 */

import type { RealListing } from '@/app/(site)/properties/PropertiesPage';

/** A raw `public.listings` row as delivered in a postgres_changes payload. */
export type RawListingRow = Record<string, unknown>;

/* ── Visibility (must mirror GET /api/inventory) ──────────────────────── */

/** True when the row is owner-direct inventory (excluded from the public map). */
export function isOwnerSourced(row: RawListingRow): boolean {
  const channel = String(row.source_channel ?? '').toLowerCase();
  const raw = row.raw_data as Record<string, unknown> | null | undefined;
  const rawObj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const tag = String(rawObj.tag ?? '').toLowerCase();
  return channel.includes('owner') || tag === 'direct owner';
}

/**
 * True when the raw row belongs on the public map: status 'active'
 * AND publish_status 'PUBLISHABLE' AND not owner-sourced. This single
 * predicate drives INSERT (admit), UPDATE (keep/refresh/add/remove) — the
 * DELETE path removes unconditionally because the row is gone.
 */
export function isPubliclyVisible(row: RawListingRow): boolean {
  if (String(row.status ?? '').toLowerCase() !== 'active') return false;
  if (String(row.publish_status ?? '').toLowerCase() !== 'publishable') return false;
  return !isOwnerSourced(row);
}

/* ── Row → RealListing (raw DB column names!) ─────────────────────────── */

function rawObj(row: RawListingRow): Record<string, unknown> {
  const raw = row.raw_data;
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

/**
 * Map a raw `public.listings` row to the page's RealListing shape.
 * Column names are the DATABASE ones — deal_type (not mode), bedrooms,
 * bathrooms, area_sqm, location_area, property_type, raw_data JSONB.
 */
export function sanitizeRealtimeListing(
  row: RawListingRow,
  index: number
): RealListing {
  const raw = rawObj(row);

  // ANTI-FABRICATION: no invented defaults — the label is whatever the row
  // carries ('Unspecified' only when truly empty), price 0 → 'on request'.
  const compound = String(row.compound || row.location_area || 'Unspecified');
  const price = Number(row.price) > 0 ? Number(row.price) : 0;
  // DB column is deal_type; the API-mapped units used 'mode' — accept both.
  const isRent =
    String(row.deal_type ?? row.mode ?? '').toLowerCase() === 'rent';
  const egpM = price > 0 ? Number((price / 1_000_000).toFixed(1)) : 0;
  const usd = price > 0 ? (isRent ? Math.round(price / 50) : Math.round(price / 5000)) : 0;
  const priceLabel =
    price > 0
      ? isRent
        ? `${price.toLocaleString('en-US')} EGP/mo`
        : `${price.toLocaleString('en-US')} EGP`
      : 'Price on request';

  const aiScore = typeof raw.aiScore === 'number' ? raw.aiScore : 0;

  return {
    id: String(row.id ?? `rt-${index}`),
    code: String(row.code || row.id || `REF-RT-${String(index + 1).padStart(4, '0')}`),
    cmp: compound,
    compound,
    location: String(row.location_area || compound),
    zone: String(row.location_area || compound),
    type: String(row.property_type || raw.type || 'Unspecified'),
    beds: Number(row.bedrooms ?? raw.beds ?? 0) || 0,
    bath: Number(row.bathrooms ?? raw.bath ?? 0) || 0,
    area: Number(row.area_sqm ?? raw.area ?? 0) || 0,
    price,
    priceLabel,
    egpM,
    usd,
    ai: aiScore > 0 ? aiScore : 0,
    tag: raw.tag ? String(raw.tag) : '',
    mode: isRent ? 'rent' : 'sale',
    agent: 'Sierra Advisor Desk',
    ago: 'Live update',
    img: String(raw.img ?? ''),
    whatsapp: 'https://wa.me/201092048333',
    lat: Number(row.latitude ?? row.lat ?? 0) || 0,
    lng: Number(row.longitude ?? row.lng ?? 0) || 0,
    description: row.description ? String(row.description) : undefined,
  };
}

/* ── Reducers (pure) ───────────────────────────────────────────────────── */

/** INSERT event → add the row only when it passes the public visibility gate. */
export function applyRealtimeInsert(
  prev: RealListing[],
  row: RawListingRow
): RealListing[] {
  if (!isPubliclyVisible(row)) return prev;
  const id = String(row.id);
  if (prev.some((l) => l.id === id)) return prev; // duplicate event — idempotent
  return [sanitizeRealtimeListing(row, prev.length), ...prev];
}

/**
 * UPDATE event → ONE rule, no status/availability guessing:
 *   row passes the public gate → present in the list (refreshed, or added
 *     if it was not there before — the promote-to-PUBLISHABLE case appears
 *     on the map the instant an admin verifies the listing);
 *   row fails the gate (demoted / unpublished / off-market) → removed.
 *
 * This fixes the old behavior where any `status !== 'available'` removed the
 * row: live rows carry status 'active', so EVERY admin edit made the pin
 * vanish until reload.
 */
export function applyRealtimeUpdate(
  prev: RealListing[],
  row: RawListingRow
): RealListing[] {
  const id = String(row.id);
  const exists = prev.some((l) => l.id === id);
  if (!isPubliclyVisible(row)) {
    return exists ? prev.filter((l) => l.id !== id) : prev;
  }
  const next = sanitizeRealtimeListing(row, 0);
  if (!exists) return [next, ...prev];
  return prev.map((l) => (l.id === id ? { ...l, ...next, id } : l));
}

/** DELETE event → remove by primary key (postgres_changes old record). */
export function applyRealtimeDelete(
  prev: RealListing[],
  oldRow: RawListingRow
): RealListing[] {
  const id = String(oldRow.id ?? '');
  if (!id) return prev;
  return prev.filter((l) => l.id !== id);
}
