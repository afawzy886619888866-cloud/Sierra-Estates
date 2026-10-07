/**
 * /api/listings
 *
 * GET — two response modes, both public:
 *
 *   1. Legacy envelope mode — when `?id=` or `?limit=` is present.
 *      Returns { success, listing | listings, count }. Kept for the static
 *      public/client-page and lib/services/InventoryService.client.ts.
 *      Reads public.listings. PUBLISH GATE: only rows with
 *      publish_status = 'PUBLISHABLE' are served; when the live read fails
 *      or nothing verified exists the honest answer is an empty envelope —
 *      never fabricated seed/snapshot data (activation plan Phase D/E).
 *
 *   2. Filter mode (default) — used by lib/api-client `api.listings()`.
 *      Returns a bare Listing[] filtered by mode/compound/type/beds/maxUsd/q.
 *      Reads Supabase with the same PUBLISH gate. No sheet/snapshot/seed
 *      fallback: when no PUBLISHABLE rows exist the answer is [].
 *
 * POST — create a listing (manager+). Writes to public.listings; if the write
 * fails outside production it returns a demo id so the admin UI flow works.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { COLLECTIONS, isPubliclyVisibleListingStatus } from '@/lib/models/schema';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { logger } from '@/lib/logger';
// SEED_LISTINGS intentionally NOT imported (anti-fabrication, Master Rule 5):
// public endpoints must never serve baked-in listings when live sources are empty.
// The live-sheet and snapshot imports were removed with their fallback paths:
// unverified units must not reach the public surface (activation plan Phase E).
import { getRecord, insertRecord, listRecords } from '@sierra-estates/db';
import { toListingColumns, toListingRecord } from '@/lib/server/listing-columns';
import { requireRole } from '@/lib/auth';
import type { Listing } from '@/lib/types';
import { calculateHaversineDistanceKm } from '@/lib/server/spatial-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const listingsQuerySchema = z.object({
  id: z.string().min(1, 'id must not be empty').optional(),
  limit: z.coerce
    .number()
    .int('limit must be an integer')
    .positive('limit must be positive')
    .max(100, 'limit must not exceed 100')
    .optional(),
  mode: z.string().optional(),
  compound: z.string().optional(),
  type: z.string().optional(),
  beds: z.coerce.number().int().min(0).optional(),
  maxUsd: z.coerce.number().min(0).optional(),
  q: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(100).optional(),
});

const listingCreateSchema = z
  .object({
    code: z.string().max(50).optional(),
    compound: z.string().min(1).max(100),
    zone: z.string().max(100).optional(),
    type: z.string().min(1).max(50),
    beds: z.coerce.number().int().min(0).default(0),
    bath: z.coerce.number().int().min(0).default(0),
    area: z.coerce.number().min(0).default(0),
    egpM: z.coerce.number().min(0).default(0),
    usd: z.coerce.number().min(0).default(0),
    aiScore: z.coerce.number().min(0).max(10).default(0),
    tag: z.string().nullable().optional(),
    mode: z.string().default('sale'),
    agent: z.string().max(100).default(''),
    img: z.string().url().or(z.literal('')).default(''),
    status: z.string().default('available'),
    description: z.string().max(5000).optional(),
  })
  .passthrough();

/**
 * Map a stored listing row to the legacy envelope shape.
 *
 * Same field set the Firestore REST transform produced, so the envelope
 * response body is unchanged. `purpose` was previously inferred from the
 * presence of a `monthlyRent` field; `deal_type` is the column that now
 * carries that distinction.
 */
function rowToEnvelope(row: Record<string, unknown>) {
  const r = toListingRecord(row) as any;
  const images: string[] = Array.isArray(r.images) ? r.images : [];

  return {
    id: r.id,
    title: r.title || 'Untitled Property',
    titleAr: r.titleAr || undefined,
    price: r.price || 0,
    compound: r.compound || r.locationArea || r.city || '',
    beds: r.bedrooms || 0,
    baths: r.bathrooms || 0,
    area: r.areaSqm || 0,
    image: images[0] || r.img || undefined,
    images,
    description: r.description || undefined,
    propertyType: r.propertyType || 'apartment',
    status: r.status || 'available',
    amenities: r.amenities || [],
    purpose: r.dealType === 'rent' ? 'for-rent' : 'for-sale',
    // The portal's mapRow reads agent/agentName; live rows store agent_name.
    agent: r.agentName || undefined,
    pfReferenceNumber: r.pfReferenceNumber || null,
    // Absence means public: the deployed table has no publish_to_client
    // column, so the only stored values come from raw_data — where an
    // explicit false is the staff moderation off-switch (see the submit
    // path, which parks publishToClient: false on unreviewed rows).
    publishToClient: r.publishToClient ?? true,
  };
}

/**
 * Filter-mode read — PUBLISH GATE (activation plan Phase D/E):
 * serves ONLY public.listings rows whose publish_status = 'PUBLISHABLE'.
 * No sheet/snapshot/seed fallback: unverified units must never reach the
 * public surface, and when nothing verified exists the honest answer is [].
 */
async function readListings(): Promise<Listing[]> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: supaListings, error: supaErr } = await supabase
      .from('listings')
      .select('*')
      .in('status', ['active', 'available'])
      .eq('publish_status', 'PUBLISHABLE')
      .limit(500);

    if (!supaErr && supaListings) {
      return supaListings.map((item: any) => {
        const price = Number(item.price) || 0;
        const egpM = price > 100000 ? price / 1_000_000 : price;
        const usd = Math.round(price / 50);

        // Presentation fields (img/tag/aiScore) are parked in raw_data on the
        // deployed table — read them back through the same convention the
        // write path uses (lib/server/listing-columns.ts).
        // ANTI-FABRICATION: missing values surface as empty/0 — never
        // invented defaults (no 'New Cairo', no ||3 beds, no ||1500 USD).
        const raw = (item.raw_data && typeof item.raw_data === 'object') ? item.raw_data : {};
        return {
          id: item.id || item.ref_id,
          code: item.code || item.sbr_code || item.ref_id || `SE-${item.id?.substring(0, 4)}`,
          compound: item.compound ?? '',
          zone: item.location_area ?? '',
          type: item.property_type ?? '',
          beds: item.bedrooms ?? 0,
          bath: item.bathrooms ?? 0,
          area: Number(item.area_sqm) || 0,
          egpM: Number(egpM.toFixed(2)),
          usd,
          aiScore: typeof raw.aiScore === 'number' ? raw.aiScore : 0,
          tag: raw.tag || (item.featured ? 'Featured' : item.is_hot_deal ? 'Hot Deal' : ''),
          mode: item.deal_type === 'rent' ? 'rent' : 'sale',
          agent: item.agent_name || (item.owner_name ? `${item.owner_name} (Owner)` : ''),
          img: raw.img || (item.images && item.images[0]) || '',
          status: item.status || 'available',
          description: item.description || '',
        } as Listing;
      });
    }
    if (supaErr) {
      logger.warn('[listings] Supabase read failed:', supaErr);
    }
  } catch (supaErr) {
    logger.warn('[listings] Supabase read failed:', supaErr);
  }

  // ANTI-FABRICATION (Master Rule 5 + activation plan Phase E): the public
  // path has NO sheet/snapshot/seed fallback. When no PUBLISHABLE rows exist
  // the honest answer is an empty set.
  return [];
}

export async function GET(request: Request) {
  const rateLimitResponse = await applyRateLimit(request, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const parseResult = listingsQuerySchema.safeParse({
      id: searchParams.get('id') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      mode: searchParams.get('mode') ?? undefined,
      compound: searchParams.get('compound') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      beds: searchParams.get('beds') ?? undefined,
      maxUsd: searchParams.get('maxUsd') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      lat: searchParams.get('lat') ?? undefined,
      lng: searchParams.get('lng') ?? undefined,
      radiusKm: searchParams.get('radiusKm') ?? undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { id, limit, mode, compound, type, beds, maxUsd, q, lat, lng, radiusKm } = parseResult.data;

    // ── Legacy envelope mode (?id= / ?limit=) ──────────────────────────────
    if (id) {
      let row: Record<string, unknown> | null = null;
      try {
        row = await getRecord<Record<string, unknown>>(COLLECTIONS.units, id);
      } catch (err) {
        // Unreachable / denied → fall through to seed, never a 5xx.
        logger.error('[LISTINGS] fetch-by-id failed:', err);
      }
      if (row) {
        const listing = rowToEnvelope(row);
        // The submit endpoint hands the caller the new id, so fetch-by-id
        // would otherwise be a direct link to an unverified submission.
        // PUBLISH GATE (activation plan Phase D): status alone is not enough —
        // only publish_status = 'PUBLISHABLE' rows may be served publicly, so
        // an unverified-but-active row 404s instead of leaking by direct link.
        const publishable =
          String((row as Record<string, unknown>).publishStatus ?? '') === 'PUBLISHABLE';
        if (publishable && isPubliclyVisibleListingStatus(listing.status)) {
          return NextResponse.json({ success: true, listing });
        }
        return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
      }
      const seed = null; // ANTI-FABRICATION: no hardcoded listing-by-id fallback
      if (!seed) {
        return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
      }
    }

    if (limit != null) {
      try {
        // The live table mixes ~9.7k archived rows in with the ~160 active
        // ones, so the status filter has to run inside the query — a plain
        // limit would return mostly archived rows and the page would show
        // nothing. Public submissions land as 'pending' (see /api/listings/
        // submit), so this stays the moderation gate. PUBLISH GATE: only
        // publish_status = 'PUBLISHABLE' rows are served (activation plan
        // Phase D — the public client must never see unverified inventory).
        const rows = await listRecords<Record<string, unknown>>(COLLECTIONS.units, {
          limit,
          orderBy: { column: 'updatedAt', ascending: false },
          where: [
            { column: 'status', op: 'in', value: ['active', 'available'] },
            { column: 'publish_status', op: 'eq', value: 'PUBLISHABLE' },
          ],
        });
        // publishToClient remains a moderation off-switch (an explicit false
        // hides the row), but the live table has no publish_to_client column
        // — it parks in raw_data at best — so requiring === true hid every
        // live row and the envelope consumers fell back to static data.
        const listings = rows
          .map(rowToEnvelope)
          .filter(
            (l) => l.publishToClient !== false && isPubliclyVisibleListingStatus(l.status)
          );
        if (listings.length > 0) {
          return NextResponse.json({ success: true, listings, count: listings.length });
        }
      } catch (err) {
        // Unreachable / denied → honest empty envelope, never a 5xx, never
        // fabricated snapshot/seed data (activation plan Phase E).
        logger.error('[LISTINGS] envelope list failed:', err);
      }

      // ANTI-FABRICATION (activation plan Phase E): no snapshot fallback —
      // the static units were never verified. The honest answer is an empty
      // envelope with an explicit source marker.
      return NextResponse.json({ success: true, listings: [], count: 0, source: 'none', seeded: false });
    }

    // ── Proximity mode (?lat= & ?lng=): PostGIS radius search ─────────────
    if (lat != null && lng != null) {
      const radiusMeters = (radiusKm || 25) * 1000;
      let spatialItems: (Listing & { distanceKm: number })[] = [];

      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_listings_near_capital', {
          capital_lat: lat,
          capital_lng: lng,
          radius_meters: radiusMeters,
        });

        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          // PUBLISH GATE: the RPC returns full listing rows; only verified
          // PUBLISHABLE units may surface in public proximity search.
          const publishable = rpcData.filter(
            (item: any) => String(item.publish_status ?? '') === 'PUBLISHABLE'
          );
          spatialItems = publishable.map((item: any) => {
            const price = Number(item.price) || 0;
            const egpM = price > 100000 ? price / 1_000_000 : price;
            const usd = Math.round(price / 50);
            const dist = calculateHaversineDistanceKm(lat, lng, Number(item.latitude), Number(item.longitude));

            // ANTI-FABRICATION: no invented defaults (no 'New Cairo', no
            // ||3 beds, no ||1500 USD, no hardcoded 9.0/8.8 aiScore).
            const raw = (item.raw_data && typeof item.raw_data === 'object') ? item.raw_data : {};
            return {
              id: item.id || item.ref_id,
              code: item.code || item.reference_code || `SE-${item.id?.substring(0, 4)}`,
              compound: item.compound ?? '',
              zone: item.location_area ?? '',
              type: item.property_type ?? '',
              beds: item.bedrooms ?? 0,
              bath: item.bathrooms ?? 0,
              area: Number(item.area_sqm) || 0,
              egpM: Number(egpM.toFixed(2)),
              usd,
              aiScore: typeof raw.aiScore === 'number' ? raw.aiScore : 0,
              tag: raw.tag || (item.featured ? 'Featured' : item.is_hot_deal ? 'Hot Deal' : ''),
              mode: item.deal_type === 'rent' ? 'rent' : 'sale',
              agent: item.agent_name || (item.owner_name ? `${item.owner_name} (Owner)` : ''),
              img: (item.images && item.images[0]) || '',
              status: item.status || 'available',
              description: item.description || '',
              distanceKm: dist,
              latitude: Number(item.latitude),
              longitude: Number(item.longitude),
            } as Listing & { distanceKm: number };
          });
        }
      } catch (rpcErr) {
        logger.warn('[LISTINGS_PROXIMITY] Supabase spatial RPC failed:', rpcErr);
      }

      if (spatialItems.length === 0) {
        // ANTI-FABRICATION: no seed fallback — an empty DB returns zero
        // nearby results rather than fabricated coordinates.
        spatialItems = [];
      }

      let filtered = spatialItems.filter((l) => isPubliclyVisibleListingStatus(l.status));
      if (mode) filtered = filtered.filter((l) => l.mode === mode);
      if (compound) filtered = filtered.filter((l) => l.compound.toLowerCase().includes(compound.toLowerCase()));
      if (type) filtered = filtered.filter((l) => l.type === type);
      if (beds != null) filtered = filtered.filter((l) => l.beds >= beds);
      if (maxUsd != null) filtered = filtered.filter((l) => l.usd <= maxUsd);
      if (q) {
        const needle = q.toLowerCase();
        filtered = filtered.filter((l) =>
          [l.code, l.compound, l.agent, l.type, l.description ?? '']
            .join(' ')
            .toLowerCase()
            .includes(needle)
        );
      }
      filtered.sort((a, b) => a.distanceKm - b.distanceKm);
      return NextResponse.json(filtered);
    }

    // ── Filter mode (api-client contract): bare Listing[] ──────────────────
    let items = await readListings();
    // Excludes archived listings and unreviewed public submissions alike —
    // /api/listings/submit is unauthenticated, so anything it wrote is only
    // a claim until staff verify it.
    items = items.filter((l) => isPubliclyVisibleListingStatus(l.status));
    if (mode) items = items.filter((l) => l.mode === mode);
    if (compound) items = items.filter((l) => l.compound.toLowerCase().includes(compound.toLowerCase()));
    if (type) items = items.filter((l) => l.type === type);
    if (beds != null) items = items.filter((l) => l.beds >= beds);
    if (maxUsd != null) items = items.filter((l) => l.usd <= maxUsd);
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter((l) =>
        [l.code, l.compound, l.agent, l.type, l.description ?? '']
          .join(' ')
          .toLowerCase()
          .includes(needle)
      );
    }
    items = [...items].sort((a, b) => {
      if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
      return b.aiScore - a.aiScore;
    });

    return NextResponse.json(items);
  } catch (error: any) {
    logger.error('[LISTINGS_ERROR] Failed to fetch listings:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const rateLimitResponse = await applyRateLimit(request, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await requireRole(request, 'manager');
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = listingCreateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid listing payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const doc = { ...parsed.data, createdAt: now, updatedAt: now };

    try {
      // One table replaces the listings + houyez_listings dual-write, so the
      // denormalised cmp / ai / active aliases are no longer needed: compound,
      // aiScore and status are the single source for all three.
      const columns = toListingColumns(doc);
      // title is NOT NULL in Postgres and the create form has no title field.
      if (!columns.title) columns.title = `${doc.type} · ${doc.compound}`;

      const created = await insertRecord<{ id: string }>('listings', columns);
      return NextResponse.json({ id: created.id }, { status: 201 });
    } catch (writeError) {
      if (process.env.NODE_ENV === 'production') throw writeError;
      // Sandbox mode (no Supabase credentials): acknowledge with a demo id so
      // the UI flow completes; data is not persisted.
      logger.warn('[LISTINGS_CREATE] Supabase write failed, returning sandbox id:', writeError);
      return NextResponse.json({ id: `demo-${Date.now()}`, sandbox: true }, { status: 201 });
    }
  } catch (error: any) {
    logger.error('[LISTINGS_CREATE_ERROR]', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
