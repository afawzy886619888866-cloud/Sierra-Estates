/**
 * Sierra Estates — Inventory Domain Service (server-side).
 *
 * ONE entry point for every ingestion path (Property Finder, WhatsApp scrape,
 * Sheets, admin manual, Houyez seed) and one place where lifecycle rules and
 * dedupe are enforced. Replaces the scatter of direct Firestore writes.
 *
 * Firestore is injected (admin SDK instance) so this module has zero coupling
 * to app initialization and is unit-testable with a fake.
 */
import { assertCanonicalBackendForWrites } from '@sierra-estates/db';
import type {
  InventoryListing,
  IngestionSource,
  ListingStatus,
  SearchCriteria,
  UpsertPayload,
  UpsertResult,
import { checkGravityDedupe } from './dedupe';
import { assertTransition, isStale, FRESHNESS_SLA_DAYS, VERIFIED_STATUSES, type VerificationMetadata } from './lifecycle';

/** Minimal query surface this service needs from the data layer. */
export interface FirestoreLike {
  collection(name: string): {
    doc(id?: string): {
      id: string;
      get(): Promise<{ exists: boolean; id: string; data(): unknown }>;
      set(data: unknown, opts?: { merge?: boolean }): Promise<unknown>;
      update(data: unknown): Promise<unknown>;
    };
    where(field: string, op: string, value: unknown): unknown;
  };
}

const COLLECTION = 'listings';

export interface SearchResultPage {
  results: InventoryListing[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  isSemanticFallback?: boolean;
}

export class InventoryDomainService {
  constructor(
    private readonly db: FirestoreLike,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Single ingestion entry point. Dedupes by fingerprint:
   * - unseen fingerprint  → create as `draft` (or `pending_verification` for trusted feeds)
   * - known fingerprint   → merge fields, keep lifecycle state, log source
   * Reuses packages/gravity-memory seen() hook.
   */
  async upsertFromSource(source: IngestionSource, payload: UpsertPayload, actor = 'system'): Promise<UpsertResult> {
    assertCanonicalBackendForWrites('inventory-listing-write');
    const { hash: fp, isDuplicate: _isDuplicate } = checkGravityDedupe({
      compound: payload.compound,
      propertyType: payload.propertyType,
      offerType: payload.offerType,
      bedrooms: payload.bedrooms,
      area: payload.area,
      price: payload.price,
    });

    const nowIso = this.now().toISOString();
    const ref = this.db.collection(COLLECTION).doc(fp);
    const snap = await ref.get();

    if (snap.exists) {
      const existing = snap.data() as InventoryListing;
      const existingSources = existing?.sources ?? {};
      await ref.set(
        {
          ...(existing ?? {}),
          ...payload,
          pricePerSqm: payload.area > 0 ? Math.round(payload.price / payload.area) : 0,
          updatedAt: nowIso,
          sources: {
            ...existingSources,
            [source]: { lastSeenAt: nowIso, ref: payload.sourceRef ?? null },
          },
        },
        { merge: true },
      );
      return { id: fp, action: 'duplicate_merged', fingerprint: fp };
    }

    const trusted: IngestionSource[] = ['property_finder', 'admin_manual'];
    let initialStatus: ListingStatus = trusted.includes(source) ? 'pending_verification' : 'draft';
    
    // Per 2026-08-17 compliance note: document-backed verification flag
    const hasDocRef = Boolean(payload.ownershipDocRef);
    if (hasDocRef) {
      initialStatus = 'verified';
    }

    const listing: InventoryListing = {
      id: fp,
      title: payload.title,
      compound: payload.compound,
      propertyType: payload.propertyType,
      offerType: payload.offerType,
      listingType: payload.listingType ?? null,
      status: initialStatus,
      // §21 no-fabrication: never invent 'New Cairo'/'resale'/'EGP' — a
      // missing city / listing type / currency is stored as null.
      city: payload.city ?? null,
      location: payload.location ?? payload.compound,
      area: payload.area,
      bedrooms: payload.bedrooms,
      price: payload.price,
      pricePerSqm: payload.area > 0 ? Math.round(payload.price / payload.area) : 0,
      currency: payload.currency ?? null,
      coordinates: payload.coordinates,
      finishingType: payload.finishingType,
      description: payload.description,
      fingerprint: fp,
      source,
      sourceRef: payload.sourceRef,
      sources: {
        [source]: { lastSeenAt: nowIso, ref: payload.sourceRef ?? null },
      },
      ownershipDocRef: payload.ownershipDocRef,
      verifiedBy: hasDocRef ? (payload.verifiedBy ?? actor) : undefined,
      verifiedAt: hasDocRef ? nowIso : undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
      statusHistory: [{ from: null, to: initialStatus, at: nowIso, by: actor, note: `ingested via ${source}` }],
    };
    await ref.set(listing);
    return { id: fp, action: 'created', fingerprint: fp };
  }

  /** Guarded lifecycle transition with audit trail & document-backed compliance verification. */
  async transition(
    id: string,
    to: ListingStatus,
    actor: string,
    metadataOrNote?: VerificationMetadata | string,
  ): Promise<void> {
    const meta: VerificationMetadata = typeof metadataOrNote === 'string'
      ? { note: metadataOrNote, verifiedBy: actor }
      : { verifiedBy: actor, ...(metadataOrNote ?? {}) };

    const ref = this.db.collection(COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`Listing ${id} not found`);
    const listing = snap.data() as InventoryListing;
    assertTransition(listing.status, to, meta);

    if (to === 'reserved' && !meta.note && !meta.reservationRef) {
      throw new Error('Reservation requires a reservationRef note (payment intent id)');
    }
    const nowIso = this.now().toISOString();
    const patch: Record<string, unknown> = {
      status: to,
      updatedAt: nowIso,
      statusHistory: [...(listing.statusHistory ?? []), { from: listing.status, to, at: nowIso, by: actor, note: meta.note }],
    };
    if (to === 'verified') {
      patch.verifiedAt = meta.verifiedAt ?? nowIso;
      patch.verifiedBy = meta.verifiedBy ?? actor;
      if (meta.ownershipDocRef) {
        patch.ownershipDocRef = meta.ownershipDocRef;
      }
    }
    if (to === 'reserved') {
      patch.reservationRef = meta.reservationRef ?? meta.note;
    }
    await ref.update(patch);
  }

  /** Document-backed verification: satisfies Egypt 2023 digital platform compliance. */
  async verifyWithDocument(id: string, docRef: string, verifier: string, actor?: string): Promise<void> {
    await this.transition(id, 'verified', actor ?? verifier, {
      ownershipDocRef: docRef,
      verifiedBy: verifier,
      note: `Verified with ownership doc ref: ${docRef}`,
    });
  }

  /** Convenience: verify + publish in audited steps. */
  async verifyAndPublish(id: string, actor: string, docRef?: string): Promise<void> {
    if (docRef) {
      await this.verifyWithDocument(id, docRef, actor);
    } else {
      await this.transition(id, 'verified', actor, { verifiedBy: actor, note: 'Direct feed verification' });
    }
    await this.transition(id, 'published', actor);
  }

  /**
   * Freshness sweep — run from MaintenanceMonitor or /api/cron/maintenance.
   * Published listings past the SLA move to `expired` (off the public site
   * until re-verified). Returns ids swept.
   */
  async sweepStale(listings: InventoryListing[], actor = 'maintenance-cron'): Promise<string[]> {
    const swept: string[] = [];
    for (const l of listings) {
      if (l.status === 'published' && isStale(l.verifiedAt, this.now())) {
        await this.transition(l.id, 'expired', actor, `no re-verification in ${FRESHNESS_SLA_DAYS}d`);
        swept.push(l.id);
      }
    }
    return swept;
  }

  /** True count behind the public "verified listings" figure. */
  isCountedVerified(l: InventoryListing): boolean {
    return VERIFIED_STATUSES.includes(l.status);
  }

  /** Pure filter used by search endpoints; Firestore query building stays in routes. */
  matchesCriteria(l: InventoryListing, c: SearchCriteria): boolean {
    if (c.compound && l.compound.toLowerCase() !== c.compound.toLowerCase()) return false;
    if (c.propertyType && l.propertyType.toLowerCase() !== c.propertyType.toLowerCase()) return false;
    if (c.offerType && l.offerType !== c.offerType) return false;
    if (c.status) {
      const wanted = Array.isArray(c.status) ? c.status : [c.status];
      if (!wanted.includes(l.status)) return false;
    }
    if (c.minPrice != null && l.price < c.minPrice) return false;
    if (c.maxPrice != null && l.price > c.maxPrice) return false;
    if (c.minArea != null && l.area < c.minArea) return false;
    if (c.bedrooms != null && l.bedrooms !== c.bedrooms) return false;
    return true;
  }

  /**
   * search(criteria) with pagination + optional semantic fallback.
   */
  async search(
    criteria: SearchCriteria,
    options?: {
      catalog?: InventoryListing[];
      semanticFallbackFn?: (query: string) => Promise<any[]>;
    },
  ): Promise<SearchResultPage> {
    const catalog = options?.catalog ?? [];
    let matched = catalog.filter((l) => this.matchesCriteria(l, criteria));
    let isSemanticFallback = false;

    // Semantic fallback if no direct matches and query is present
    if (matched.length === 0 && criteria.query && options?.semanticFallbackFn) {
      try {
        const semanticResults = await options.semanticFallbackFn(criteria.query);
        if (Array.isArray(semanticResults) && semanticResults.length > 0) {
          matched = semanticResults as InventoryListing[];
          isSemanticFallback = true;
        }
      } catch (err) {
        console.warn('[InventoryDomainService] Semantic search fallback error:', err);
      }
    }

    const page = Math.max(1, criteria.page ?? 1);
    const pageSize = Math.max(1, criteria.limit ?? 20);
    const start = (page - 1) * pageSize;
    const paginated = matched.slice(start, start + pageSize);

    return {
      results: paginated,
      total: matched.length,
      page,
      pageSize,
      hasMore: start + pageSize < matched.length,
      isSemanticFallback,
    };
  }
}
