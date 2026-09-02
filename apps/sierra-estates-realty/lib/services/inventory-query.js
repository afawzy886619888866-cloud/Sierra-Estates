 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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

 







































// ─── Service ──────────────────────────────────────────────────────────────

export const InventoryQueryService = {
  /**
   * Get a single unit by Firestore document ID or unit code.
   */
  async getById(id) {
    try {
      const doc = await adminDb.collection(COLLECTIONS.units).doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...(doc.data() ) } ;
    } catch (err) {
      logger.error('[InventoryQueryService] getById failed:', err.message);
      return null;
    }
  },

  /**
   * Find matching units from the master sheet for a given query.
   * Fetches up to 300 docs from Firestore, applies in-memory filters.
   */
  async query(criteria) {
    try {
      const statuses = criteria.status
        ? Array.isArray(criteria.status) ? criteria.status : [criteria.status]
        : ['available'];

      const snapshot = await adminDb
        .collection(COLLECTIONS.units)
        .where('status', 'in', statuses)
        .limit(300)
        .get();

      let units = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() ),
      })) ;

      // In-memory filters for fields not supported in composite Firestore queries
      if (criteria.propertyType) {
        const t = criteria.propertyType.toLowerCase();
        units = units.filter((u) => _optionalChain([u, 'access', _ => _.propertyType, 'optionalAccess', _2 => _2.toLowerCase, 'call', _3 => _3()]) === t);
      }
      if (criteria.compound) {
        const c = criteria.compound.toLowerCase();
        units = units.filter((u) =>
          _optionalChain([u, 'access', _4 => _4.compound, 'optionalAccess', _5 => _5.toLowerCase, 'call', _6 => _6(), 'access', _7 => _7.includes, 'call', _8 => _8(c)]) ||
          _optionalChain([u, 'access', _9 => _9.location, 'optionalAccess', _10 => _10.toLowerCase, 'call', _11 => _11(), 'access', _12 => _12.includes, 'call', _13 => _13(c)])
        );
      }
      if (criteria.keyword) {
        const kw = criteria.keyword.toLowerCase();
        units = units.filter((u) =>
          [u.title, u.compound, u.location, u.description].some((f) =>
            _optionalChain([f, 'optionalAccess', _14 => _14.toLowerCase, 'call', _15 => _15(), 'access', _16 => _16.includes, 'call', _17 => _17(kw)])
          )
        );
      }
      if (criteria.bedrooms != null) {
        units = units.filter((u) => u.bedrooms === criteria.bedrooms);
      } else {
        if (criteria.bedsMin != null) units = units.filter((u) => u.bedrooms >= criteria.bedsMin);
        if (criteria.bedsMax != null) units = units.filter((u) => u.bedrooms <= criteria.bedsMax);
      }
      if (criteria.priceMin != null) units = units.filter((u) => u.price >= criteria.priceMin);
      if (criteria.priceMax != null) units = units.filter((u) => u.price <= criteria.priceMax);
      if (criteria.areaMin != null) units = units.filter((u) => u.area >= criteria.areaMin);
      if (criteria.areaMax != null) units = units.filter((u) => u.area <= criteria.areaMax);
      if (criteria.ownerType) {
        units = units.filter((u) => u.ownerType === criteria.ownerType);
      }

      const limit = _nullishCoalesce(criteria.limit, () => ( 20));
      return units.slice(0, limit);
    } catch (err) {
      logger.error('[InventoryQueryService] query failed:', err.message);
      return [];
    }
  },

  /**
   * Get all available units for agent context injection.
   * Returns a compact summary to keep token count low.
   */
  async getAvailableSummary(limit = 50) {
    const units = await this.query({ status: 'available', limit });
    if (units.length === 0) return 'No available units found in Master Sheet.';

    const lines = units.map((u) => {
      const beds = u.bedrooms ? `${u.bedrooms}BR` : '';
      const price = u.price ? `${(u.price / 1000000).toFixed(1)}M EGP` : 'price N/A';
      const area = u.area ? `${u.area}sqm` : '';
      const type = u.ownerType === 'owner' ? '🏠 Owner' : '🤝 Broker';
      return `• [${u.code}] ${u.propertyType} ${beds} in ${u.compound} | ${price} ${area} | ${type} | ${u.ownerContact}`;
    });

    return `LIVE INVENTORY (${units.length} available units from Master Sheet):\n${lines.join('\n')}`;
  },

  /**
   * Match inventory to a client's requirements. Returns top N ranked matches.
   */
  async matchForClient(params






) {
    const criteria = {
      status: 'available',
      propertyType: params.propertyType,
      compound: params.compound,
      bedrooms: params.bedrooms,
      priceMax: params.priceMax,
      limit: _nullishCoalesce(params.limit, () => ( 10)),
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
  async getStats()







 {
    try {
      const snapshot = await adminDb.collection(COLLECTIONS.units).limit(500).get();
      const units = snapshot.docs.map((d) => d.data() );
      return {
        total: units.length,
        available: units.filter((u) => u.status === 'available').length,
        rented: units.filter((u) => u.status === 'rented').length,
        sold: units.filter((u) => u.status === 'sold').length,
        offMarket: units.filter((u) => u.status === 'off-market').length,
        ownerDirect: units.filter((u) => u.ownerType === 'owner').length,
        broker: units.filter((u) => u.ownerType === 'broker').length,
      };
    } catch (err) {
      logger.error('[InventoryQueryService] getStats failed:', err.message);
      return { total: 0, available: 0, rented: 0, sold: 0, offMarket: 0, ownerDirect: 0, broker: 0 };
    }
  },
};
