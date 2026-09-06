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
  compound?: string;
  mode: InventoryMode;
  status: InventoryStatus;
  statusLabel?: string;
  /** Canonical, display-ready location/compound name. */
  location: string;
  /** Original free-text location value from the source, if different. */
  rawLocation?: string | null;
  zone: string;
  lat: number;
  lng: number;
  /** true when the location couldn't be resolved and a zone centroid was used. */
  approxLocation?: boolean;
  propertyType?: string | null;
  type?: string;
  beds: number | null;
  bath?: number | null;
  /** Built-up area in m². */
  area: number | null;
  /** Garden area in m², when applicable. */
  garden?: number | null;
  pool?: boolean;
  furnished?: string | null;
  furnishing?: string | null;
  /** Numeric price in EGP (total for sale, monthly for rent); 0 = on request. */
  price: number;
  priceLabel?: string;
  egpM?: number;
  usd?: number;
  segment?: 'owners_rent' | 'owners_buy' | 'broker_rent' | 'broker_buy' | 'unknown' | string;
  segmentLabel?: string;
  party?: 'Owner' | 'Broker' | 'Unknown';
  aiScore?: number;
  tag?: string | null;
  agent?: string;
  whatsapp?: string;
  img?: string;
  description?: string | null;
  comment?: string | null;
  featured?: boolean;
  updatedAt?: string | null;
}

export interface InventoryResponse {
  /** ISO timestamp of when this dataset was produced. */
  generatedAt: string;
  source: 'supabase' | 'domain' | 'live' | 'snapshot';
  count: number;
  segments?: {
    total: number;
    owners_rent: number;
    owners_buy: number;
    broker_rent: number;
    broker_buy: number;
    unknown: number;
  };
  compoundCounts?: Record<string, number>;
  compoundSegmentCounts?: Record<string, Record<string, number>>;
  units: InventoryUnit[];
}
