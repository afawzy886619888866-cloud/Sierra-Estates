/**
 * Public-safe inventory unit — the shape served by `/api/inventory`, stored in
 * the committed snapshot, and consumed by the inventory map.
 *
 * Deliberately excludes every owner-identifying field from the source data
 * (owner name, mobile/`ownerContact`). See lib/inventory/normalize.js and the
 * stripping in app/api/inventory/route.ts's mapping from InventoryQueryService.
 */

export type InventoryMode = 'rent' | 'sale';
export type InventoryStatus = 'available' | 'follow_up' | 'no_answer' | 'unavailable';

export interface InventoryUnit {
  /** Stable id — the listing code when present, else a row-derived fallback. */
  id: string;
  /** Internal listing code (e.g. "MT-B14-3U-8.34M"), if present. */
  code: string | null;
  mode: InventoryMode;
  status: InventoryStatus;
  statusLabel: string;
  /** Canonical, display-ready location/compound name. */
  location: string;
  /** Original free-text location value from the source, if different. */
  rawLocation: string | null;
  zone: string;
  lat: number;
  lng: number;
  /** true when the location couldn't be resolved and a zone centroid was used. */
  approxLocation: boolean;
  propertyType: string | null;
  beds: number | null;
  /** Built-up area in m². */
  area: number | null;
  /** Garden area in m², when applicable. */
  garden: number | null;
  pool: boolean;
  furnished: string | null;
  /** Numeric price in EGP (total for sale, monthly for rent); 0 = on request. */
  price: number;
  priceLabel: string;
  comment: string | null;
  updatedAt: string | null;
}

export interface InventoryResponse {
  /** ISO timestamp of when this dataset was produced. */
  generatedAt: string;
  /**
   * Where the units came from:
   * - "domain"   = the canonical `units` Firestore collection (populated by
   *                master-sheet-sync.ts — the single source of truth also used
   *                by the AI Closer Agent, semantic search, and admin),
   * - "live"     = the owner sheet read live (units collection empty/down),
   * - "snapshot" = the committed offline fallback.
   */
  source: 'domain' | 'live' | 'snapshot';
  count: number;
  units: InventoryUnit[];
}
