import 'server-only';
import { getRecord, listRecords } from '@sierra-estates/db';
import {
  InventoryDomainService,
  type InventoryListing,
  type IngestionSource,
  type ListingStatus,
  type SearchCriteria,
  type UpsertPayload,
  type UpsertResult,
  type SearchResultPage,
  type VerificationMetadata,
  type FingerprintInput,
  checkGravityDedupe,
  fingerprint,
} from './inventory';
import { createSupabaseDbAdapter } from './inventory/db-adapter';
import { MaintenanceMonitor } from './MaintenanceMonitor';
import { SemanticSearchService } from '@/lib/server/search-service';

export * from './inventory';

/**
 * Consolidated Inventory Domain Service for Sierra Estates.
 * Unites scattered listing-normalize, sync-engine, PFIntegrationService,
 * and /api/listings logic under a single domain authority.
 *
 * Capabilities:
 * 1. search(criteria): pagination + semantic fallback (SemanticSearchService)
 * 2. upsertFromSource(source, payload): single entry point for all ingest paths
 * 3. Lifecycle state machine: draft → pending_verification → verified → published → reserved → sold/rented
 * 4. Document-backed verified flag: ownership doc ref + verifier + date (per Egypt 2023 compliance note)
 * 5. Deduplication: hash(compound+type+area+price-band) reusing Gravity Memory .seen()
 * 6. Freshness SLA hook: MaintenanceMonitor auto-flagging stale unverified listings
 */

export type OfferType = 'sale' | 'rent';
export type ListingType = 'primary' | 'resale' | 'landlord_direct' | 'developer_inventory';

export interface Property {
  id: string;
  title: string;
  propertyType: string;
  status: string;
  compound: string;
  location: string;
  city: string;
  area: number;
  bedrooms: number;
  price: number;
  pricePerSqm: number;
  coordinates?: { lat: number; lng: number };
  finishingType?: string;
  description?: string;
  offerType?: OfferType;
  listingType?: ListingType;
  ownershipDocRef?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  fingerprint?: string;
  isStale?: boolean;
}

const dbAdapter = createSupabaseDbAdapter();
const domainService = new InventoryDomainService(dbAdapter);

export const InventoryService = {
  /**
   * Domain service engine instance for direct lifecycle & transition actions.
   */
  domain: domainService,

  /**
   * Server-only lookup by ID from Supabase.
   */
  async getProperty(id: string): Promise<Property | null> {
    return await getRecord<Property>('listings', id);
  },

  /**
   * Fetch featured listings with limit.
   */
  async getFeaturedListings(count: number = 3): Promise<Property[]> {
    return await listRecords<Property>('listings', { limit: count });
  },

  /**
   * Unified search with pagination and semantic fallback.
   */
  async search(criteria: SearchCriteria): Promise<SearchResultPage> {
    // 1. Fetch available listings from Supabase
    let records: InventoryListing[] = [];
    try {
      const dbListings = await listRecords<any>('listings', {
        limit: 1000,
        order: { column: 'updatedAt', ascending: false },
      });
      if (Array.isArray(dbListings)) {
        records = dbListings.map((r) => ({
          ...r,
          id: String(r.id),
          title: r.title || r.code || 'Luxury Property',
          compound: r.compound || r.locationArea || 'New Cairo',
          propertyType: r.propertyType || 'Apartment',
          offerType: (r.offerType || r.dealType || 'sale') as OfferType,
          listingType: r.listingType ?? null,
          status: (r.status || 'published') as ListingStatus,
          city: r.city ?? 'Cairo',
          location: r.location || r.compound || 'New Cairo',
          area: Number(r.area || r.areaSqm || 0),
          bedrooms: Number(r.bedrooms || 0),
          price: Number(r.price || 0),
          pricePerSqm: Number(r.pricePerSqm || 0),
          currency: (r.currency || 'EGP') as 'EGP' | 'USD',
          fingerprint: r.fingerprint || r.dupeCheckHash || r.id,
          source: (r.syncSource || r.source || 'admin_manual') as IngestionSource,
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
          ownershipDocRef: r.ownershipDocRef,
          verifiedBy: r.verifiedBy,
          verifiedAt: r.verifiedAt,
          statusHistory: r.statusHistory || [],
        }));
      }
    } catch (err) {
      console.warn('[InventoryService.search] Falling back to memory domain search:', err);
    }

    // 2. Delegate to domain engine with SemanticSearchService fallback
    return await domainService.search(criteria, {
      catalog: records,
      semanticFallbackFn: async (query: string) => {
        const fallback = await SemanticSearchService.search(query, {
          locale: 'en',
          limit: criteria.limit ?? 20,
        });
        return (fallback.results || []).map((sr) => ({
          id: sr.id,
          title: sr.title,
          compound: sr.compound,
          propertyType: sr.propertyType,
          offerType: sr.isRental ? 'rent' : 'sale',
          listingType: null,
          status: 'published' as ListingStatus,
          city: sr.city ?? null,
          location: sr.compound,
          area: sr.area,
          bedrooms: sr.beds,
          price: sr.price,
          pricePerSqm: sr.area > 0 ? Math.round(sr.price / sr.area) : 0,
          currency: (sr.currency || 'EGP') as 'EGP' | 'USD',
          fingerprint: sr.id,
          source: 'api_partner' as IngestionSource,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          statusHistory: [],
        }));
      },
    });
  },

  /**
   * Single entry point for ingestion across PF sync, Sheets sync, WhatsApp, and Admin.
   * Performs deduplication via hash(compound+type+area+price-band) and Gravity Memory seen().
   */
  async upsertFromSource(source: IngestionSource, payload: UpsertPayload, actor = 'system'): Promise<UpsertResult> {
    return await domainService.upsertFromSource(source, payload, actor);
  },

  /**
   * Guarded lifecycle transition with audit history.
   */
  async transition(
    id: string,
    to: ListingStatus,
    actor: string,
    metadataOrNote?: VerificationMetadata | string,
  ): Promise<void> {
    return await domainService.transition(id, to, actor, metadataOrNote);
  },

  /**
   * Verified status with document backing (ownership doc ref + verifier + date).
   * Satisfies Egyptian 2023 digital platform compliance regulation.
   */
  async verifyWithDocument(id: string, docRef: string, verifier: string, actor?: string): Promise<void> {
    return await domainService.verifyWithDocument(id, docRef, verifier, actor);
  },

  /**
   * Lock unit with reservation reference tied to payment intent.
   */
  async reserveListing(id: string, reservationRef: string, actor: string): Promise<void> {
    return await domainService.transition(id, 'reserved', actor, {
      reservationRef,
      note: `Reserved with payment ref ${reservationRef}`,
    });
  },

  /**
   * Freshness SLA hook: Auto-flag listings unverified > N days.
   * Hosted in MaintenanceMonitor.
   */
  async sweepStale(daysThreshold = 30): Promise<{ flaggedCount: number; timestamp: string }> {
    return await MaintenanceMonitor.checkFreshnessSLA(daysThreshold);
  },

  /**
   * Deduplication check using business identity hash + GravityMemory seen().
   */
  checkDedupe(input: FingerprintInput): { hash: string; isDuplicate: boolean } {
    return checkGravityDedupe(input);
  },
};
