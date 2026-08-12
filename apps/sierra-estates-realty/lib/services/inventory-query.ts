/**
 * Sierra Estates — InventoryQueryService (server-side, admin SDK)
 *
 * Central read-layer over the `units` Firestore collection, which is
 * populated by the Master Owner Sheet sync engine. This is the SINGLE
 * SOURCE OF TRUTH consumed by:
 *   - AI Closer Agent (matching proposals to live listings)
 *   - Semantic search endpoint
 *   - Admin dashboard
 *   - Bots & WhatsApp concierge
 *
 * All methods are read-only. Write path lives in master-sheet-sync.ts.
 */
import 'server-only';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────

export type OfferType = 'sale' | 'rent' | 'any';
export type PropertyStatus = 'available' | 'rented' | 'sold' | 'off-market';

export interface InventoryUnit {
  id: string;
  code: string;
  title: string;
  compound: string;
  location: string;
  city: string;
  propertyType: string;
  category: string;
  status: PropertyStatus;
  price: number;
  area: number;
  bedrooms: number;
  ownerType: 'owner' | 'broker';
  ownerContact: string;
  description?: string;
  syncSource?: string;
  updatedAt?: string;
}

export interface InventoryQuery {
  status?: PropertyStatus | PropertyStatus[];
  propertyType?: string;
  compound?: string;
  bedrooms?: number;
  bedsMin?: number;
  bedsMax?: number;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  ownerType?: 'owner' | 'broker';
  limit?: number;
  /** Search text matched against title, compound, description */
  keyword?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────

export const InventoryQueryService = {
  /**
   * Get a single unit by Firestore document ID or unit code.
   */
  async getById(id: string): Promise<InventoryUnit | null> {
    try {
      const doc = await adminDb.collection(COLLECTIONS.units).doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...(doc.data() as object) } as InventoryUnit;
    } catch (err: any) {
      logger.error('[InventoryQueryService] getById failed:', err.message);
      return null;
    }
  },

  /**
   * Find matching units from the master sheet for a given query.
   * Fetches up to 300 docs from Firestore, applies in-memory filters.
   */
  async query(criteria: InventoryQuery): Promise<InventoryUnit[]> {
    try {
      const statuses: PropertyStatus[] = criteria.status
        ? Array.isArray(criteria.status) ? criteria.status : [criteria.status]
        : ['available'];

      const snapshot = await adminDb
        .collection(COLLECTIONS.units)
        .where('status', 'in', statuses)
        .limit(300)
        .get();

      let units: InventoryUnit[] = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
        id: doc.id,
        ...(doc.data() as object),
      })) as InventoryUnit[];

      // In-memory filters for fields not supported in composite Firestore queries
      if (criteria.propertyType) {
        const t = criteria.propertyType.toLowerCase();
        units = units.filter((u) => u.propertyType?.toLowerCase() === t);
      }
      if (criteria.compound) {
        const c = criteria.compound.toLowerCase();
        units = units.filter((u) =>
          u.compound?.toLowerCase().includes(c) ||
          u.location?.toLowerCase().includes(c)
        );
      }
      if (criteria.keyword) {
        const kw = criteria.keyword.toLowerCase();
        units = units.filter((u) =>
          [u.title, u.compound, u.location, u.description].some((f) =>
            f?.toLowerCase().includes(kw)
          )
        );
      }
      if (criteria.bedrooms != null) {
        units = units.filter((u) => u.bedrooms === criteria.bedrooms);
      } else {
        if (criteria.bedsMin != null) units = units.filter((u) => u.bedrooms >= criteria.bedsMin!);
        if (criteria.bedsMax != null) units = units.filter((u) => u.bedrooms <= criteria.bedsMax!);
      }
      if (criteria.priceMin != null) units = units.filter((u) => u.price >= criteria.priceMin!);
      if (criteria.priceMax != null) units = units.filter((u) => u.price <= criteria.priceMax!);
      if (criteria.areaMin != null) units = units.filter((u) => u.area >= criteria.areaMin!);
      if (criteria.areaMax != null) units = units.filter((u) => u.area <= criteria.areaMax!);
      if (criteria.ownerType) {
        units = units.filter((u) => u.ownerType === criteria.ownerType);
      }

      const limit = criteria.limit ?? 20;
      return units.slice(0, limit);
    } catch (err: any) {
      logger.error('[InventoryQueryService] query failed:', err.message);
      return [];
    }
  },

  /**
   * Get all available units for agent context injection.
   * Returns a compact summary to keep token count low.
   */
  async getAvailableSummary(limit = 50): Promise<string> {
    const units = await this.query({ status: 'available', limit });
    if (units.length === 0) return 'No available units found in Master Sheet.';

    const lines = units.map((u) => {
      const beds = u.bedrooms ? `${u.bedrooms}BR` : '';
      const price = u.price ? `${(u.price / 1_000_000).toFixed(1)}M EGP` : 'price N/A';
      const area = u.area ? `${u.area}sqm` : '';
      const type = u.ownerType === 'owner' ? '🏠 Owner' : '🤝 Broker';
      return `• [${u.code}] ${u.propertyType} ${beds} in ${u.compound} | ${price} ${area} | ${type} | ${u.ownerContact}`;
    });

    return `LIVE INVENTORY (${units.length} available units from Master Sheet):\n${lines.join('\n')}`;
  },

  /**
   * Match inventory to a client's requirements. Returns top N ranked matches.
   */
  async matchForClient(params: {
    propertyType?: string;
    bedrooms?: number;
    compound?: string;
    priceMax?: number;
    offerType?: OfferType;
    limit?: number;
  }): Promise<InventoryUnit[]> {
    const criteria: InventoryQuery = {
      status: 'available',
      propertyType: params.propertyType,
      compound: params.compound,
      bedrooms: params.bedrooms,
      priceMax: params.priceMax,
      limit: params.limit ?? 10,
    };
    const units = await this.query(criteria);

    // Rank: owner-direct first, then by price ascending
    return units.sort((a, b) => {
      if (a.ownerType === 'owner' && b.ownerType !== 'owner') return -1;
      if (b.ownerType === 'owner' && a.ownerType !== 'owner') return 1;
      return (a.price || 0) - (b.price || 0);
    });
  },

  /**
   * Statistics summary for admin dashboard and agents.
   */
  async getStats(): Promise<{
    total: number;
    available: number;
    rented: number;
    sold: number;
    offMarket: number;
    ownerDirect: number;
    broker: number;
  }> {
    try {
      const snapshot = await adminDb.collection(COLLECTIONS.units).limit(500).get();
      const units: InventoryUnit[] = snapshot.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data() as InventoryUnit);
      return {
        total: units.length,
        available: units.filter((u) => u.status === 'available').length,
        rented: units.filter((u) => u.status === 'rented').length,
        sold: units.filter((u) => u.status === 'sold').length,
        offMarket: units.filter((u) => u.status === 'off-market').length,
        ownerDirect: units.filter((u) => u.ownerType === 'owner').length,
        broker: units.filter((u) => u.ownerType === 'broker').length,
      };
    } catch (err: any) {
      logger.error('[InventoryQueryService] getStats failed:', err.message);
      return { total: 0, available: 0, rented: 0, sold: 0, offMarket: 0, ownerDirect: 0, broker: 0 };
    }
  },
};
