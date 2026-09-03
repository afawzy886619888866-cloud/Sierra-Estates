 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }

















import { fingerprint } from './dedupe';
import { assertTransition, isStale, FRESHNESS_SLA_DAYS, VERIFIED_STATUSES } from './lifecycle';

/** Minimal query surface this service needs from the data layer. */












const COLLECTION = 'listings';

export class InventoryDomainService {
  constructor(
      db,
      now = () => new Date(),
  ) {;this.db = db;this.now = now;}

  /**
   * Single ingestion entry point. Dedupes by fingerprint:
   * - unseen fingerprint  → create as `draft` (or `pending_verification` for trusted feeds)
   * - known fingerprint   → merge fields, keep lifecycle state, log source
   */
  async upsertFromSource(source, payload, actor = 'system') {
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
          [`sources.${source}`]: { lastSeenAt: nowIso, ref: _nullishCoalesce(payload.sourceRef, () => ( null)) },
        },
        { merge: true },
      );
      return { id: fp, action: 'duplicate_merged', fingerprint: fp };
    }

    const trusted = ['property_finder', 'admin_manual'];
    const initialStatus = trusted.includes(source) ? 'pending_verification' : 'draft';
    const listing = {
      id: fp,
      title: payload.title,
      compound: payload.compound,
      propertyType: payload.propertyType,
      offerType: payload.offerType,
      listingType: _nullishCoalesce(payload.listingType, () => ( 'resale')),
      status: initialStatus,
      city: _nullishCoalesce(payload.city, () => ( 'New Cairo')),
      location: _nullishCoalesce(payload.location, () => ( payload.compound)),
      area: payload.area,
      bedrooms: payload.bedrooms,
      price: payload.price,
      pricePerSqm: payload.area > 0 ? Math.round(payload.price / payload.area) : 0,
      currency: _nullishCoalesce(payload.currency, () => ( 'EGP')),
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
  async transition(id, to, actor, note) {
    const ref = this.db.collection(COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`Listing ${id} not found`);
    const listing = snap.data() ;
    assertTransition(listing.status, to);

    if (to === 'reserved' && !note) {
      throw new Error('Reservation requires a reservationRef note (payment intent id)');
    }
    const nowIso = this.now().toISOString();
    const patch = {
      status: to,
      updatedAt: nowIso,
      statusHistory: [...(_nullishCoalesce(listing.statusHistory, () => ( []))), { from: listing.status, to, at: nowIso, by: actor, note }],
    };
    if (to === 'verified') {
      patch.verifiedAt = nowIso;
      patch.verifiedBy = actor;
    }
    if (to === 'reserved') patch.reservationRef = note;
    await ref.update(patch);
  }

  /** Convenience: verify + publish in one audited step. */
  async verifyAndPublish(id, actor) {
    await this.transition(id, 'verified', actor);
    await this.transition(id, 'published', actor);
  }

  /**
   * Freshness sweep — run from /api/cron/maintenance.
   * Published listings past the SLA move to `expired` (off the public site
   * until re-verified). Returns ids swept.
   */
  async sweepStale(listings, actor = 'maintenance-cron') {
    const swept = [];
    for (const l of listings) {
      if (l.status === 'published' && isStale(l.verifiedAt, this.now())) {
        await this.transition(l.id, 'expired', actor, `no re-verification in ${FRESHNESS_SLA_DAYS}d`);
        swept.push(l.id);
      }
    }
    return swept;
  }

  /** True count behind the public "verified listings" figure. */
  isCountedVerified(l) {
    return VERIFIED_STATUSES.includes(l.status);
  }

  /** Pure filter used by search endpoints; Firestore query building stays in routes. */
  matchesCriteria(l, c) {
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
