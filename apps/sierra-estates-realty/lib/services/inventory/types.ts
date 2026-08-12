/**
 * Sierra Estates — Inventory Domain Types
 * Single source of truth for listing lifecycle, sources, and search criteria.
 * Backend-only module. No frontend imports.
 */

export type OfferType = 'sale' | 'rent';

export type ListingType =
  | 'primary'
  | 'resale'
  | 'landlord_direct'
  | 'developer_inventory';

/**
 * Lifecycle: draft → pending_verification → verified → published → reserved → sold|rented
 * `archived` is reachable from any non-terminal state. `expired` is set by the
 * freshness sweep and returns to `pending_verification` on re-verification.
 */
export type ListingStatus =
  | 'draft'
  | 'pending_verification'
  | 'verified'
  | 'published'
  | 'reserved'
  | 'sold'
  | 'rented'
  | 'expired'
  | 'archived';

/** Where a record entered the system. One enum for every ingestion path. */
export type IngestionSource =
  | 'property_finder'
  | 'whatsapp_scrape'
  | 'sheets_sync'
  | 'admin_manual'
  | 'houyez_seed'
  | 'api_partner';

export interface InventoryListing {
  id: string;
  title: string;
  compound: string;
  propertyType: string;
  offerType: OfferType;
  listingType: ListingType;
  status: ListingStatus;
  city: string;
  location: string;
  area: number;
  bedrooms: number;
  price: number;
  pricePerSqm: number;
  currency: 'EGP' | 'USD';
  coordinates?: { lat: number; lng: number };
  finishingType?: string;
  description?: string;
  /** Dedupe fingerprint — see dedupe.ts */
  fingerprint: string;
  source: IngestionSource;
  sourceRef?: string;
  createdAt: string;
  updatedAt: string;
  /** Last time a human or trusted feed confirmed the unit is real & available. */
  verifiedAt?: string;
  verifiedBy?: string;
  /** Set when status = reserved; ties the lock to a payment intent. */
  reservationRef?: string;
  statusHistory: Array<{ from: ListingStatus | null; to: ListingStatus; at: string; by: string; note?: string }>;
}

export interface UpsertPayload {
  title: string;
  compound: string;
  propertyType: string;
  offerType: OfferType;
  listingType?: ListingType;
  city?: string;
  location?: string;
  area: number;
  bedrooms: number;
  price: number;
  currency?: 'EGP' | 'USD';
  coordinates?: { lat: number; lng: number };
  finishingType?: string;
  description?: string;
  sourceRef?: string;
}

export interface SearchCriteria {
  compound?: string;
  propertyType?: string;
  offerType?: OfferType;
  status?: ListingStatus | ListingStatus[];
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  bedrooms?: number;
  limit?: number;
  cursor?: string;
}

export interface UpsertResult {
  id: string;
  action: 'created' | 'updated' | 'duplicate_merged';
  fingerprint: string;
}
