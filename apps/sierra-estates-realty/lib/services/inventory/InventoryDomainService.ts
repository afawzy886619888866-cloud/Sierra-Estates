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
import type {
  InventoryListing,
  IngestionSource,
  ListingStatus,
  SearchCriteria,
  UpsertPayload,
  UpsertResult,
} from './types';
import { fingerprint } from './dedupe';
import { assertTransition, isStale, FRESHNESS_SLA_DAYS, VERIFIED_STATUSES } from './lifecycle';

/** Minimal Firestore surface we use — matches firebase-admin's Firestore. */
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

export class InventoryDomainService {
  constructor(
    private readonly db: FirestoreLike,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Single ingestion entry point. Dedupes by fingerprint:
   * - unseen fingerprint  → create as `draft` (or `pending_verification` for trusted feeds)
   * - known fingerprint   → merge fields, keep lifecycle state, log source
   */
  async upsertFromSource(source: IngestionSource, payload: UpsertPayload, actor = 'system'): Promise<UpsertResult> {
    const fp = fingerprint({
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
      await ref.set(
        {
          ...payload,
          pricePerSqm: payload.area > 0 ? Math.round(payload.price / payload.area) : 0,
          updatedAt: nowIso,
          [`sources.${source}`]: { lastSeenAt: nowIso, ref: payload.sourceRef ?? null },
        },
        { merge: true },
      );
      return { id: fp, action: 'duplicate_merged', fingerprint: fp };
    }

    const trusted: IngestionSource[] = ['property_finder', 'admin_manual'];
    const initialStatus: ListingStatus = trusted.includes(source) ? 'pending_verification' : 'draft';
    const listing: InventoryListing = {
      id: fp,
      title: payload.title,
      compound: payload.compound,
      propertyType: payload.propertyType,
      offerType: payload.offerType,
      listingType: payload.listingType ?? 'resale',
      status: initialStatus,
      city: payload.city ?? 'New Cairo',
      location: payload.location ?? payload.compound,
      area: payload.area,
      bedrooms: payload.bedrooms,
      price: payload.price,
      pricePerSqm: payload.area > 0 ? Math.round(payload.price / payload.area) : 0,
      currency: payload.currency ?? 'EGP',
      coordinates: payload.coordinates,
      finishingType: payload.finishingType,
      description: payload.description,
      fingerprint: fp,
      source,
      sourceRef: payload.sourceRef,
      createdAt: nowIso,
      updatedAt: nowIso,
      statusHistory: [{ from: null, to: initialStatus, at: nowIso, by: actor, note: `ingested via ${source}` }],
    };
    await ref.set(listing);
    return { id: fp, action: 'created', fingerprint: fp };
  }

  /** Guarded lifecycle transition with audit trail. */
  async transition(id: string, to: ListingStatus, actor: string, note?: string): Promise<void> {
    const ref = this.db.collection(COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`Listing ${id} not found`);
    const listing = snap.data() as InventoryListing;
    assertTransition(listing.status, to);

    if (to === 'reserved' && !note) {
      throw new Error('Reservation requires a reservationRef note (payment intent id)');
    }
    const nowIso = this.now().toISOString();
    const patch: Record<string, unknown> = {
      status: to,
      updatedAt: nowIso,
      statusHistory: [...(listing.statusHistory ?? []), { from: listing.status, to, at: nowIso, by: actor, note }],
    };
    if (to === 'verified') {
      patch.verifiedAt = nowIso;
      patch.verifiedBy = actor;
    }
    if (to === 'reserved') patch.reservationRef = note;
    await ref.update(patch);
  }

  /** Convenience: verify + publish in one audited step. */
  async verifyAndPublish(id: string, actor: string): Promise<void> {
    await this.transition(id, 'verified', actor);
    await this.transition(id, 'published', actor);
  }

  /**
   * Freshness sweep — run from /api/cron/maintenance.
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
    if (c.compound && l.compound !== c.compound) return false;
    if (c.propertyType && l.propertyType !== c.propertyType) return false;
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
}
