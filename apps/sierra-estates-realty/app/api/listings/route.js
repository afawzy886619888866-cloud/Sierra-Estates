 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * /api/listings
 *
 * GET — two response modes, both public:
 *
 *   1. Legacy envelope mode — when `?id=` or `?limit=` is present.
 *      Returns { success, listing | listings, count }. Kept for the static
 *      public/client-page and lib/services/InventoryService.client.ts.
 *      Reads public.listings; if the read fails or RLS denies access it falls
 *      back to seed data instead of erroring (INTEGRATION.md data-flow
 *      contract).
 *
 *   2. Filter mode (default) — used by lib/api-client `api.listings()`.
 *      Returns a bare Listing[] filtered by mode/compound/type/beds/maxUsd/q.
 *      Reads Supabase → Live Sheet → snapshot → SEED_LISTINGS.
 *
 * POST — create a listing (manager+). Writes to public.listings; if the write
 * fails outside production it returns a demo id so the admin UI flow works.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { COLLECTIONS, isPubliclyVisibleListingStatus } from '@/lib/models/schema';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { logger } from '@/lib/logger';
import { SEED_LISTINGS } from '@/lib/seed';
import { getRecord, insertRecord, listRecords } from '@sierra-estates/db';
import { toListingColumns, toListingRecord } from '@/lib/server/listing-columns';
import { requireRole } from '@/lib/auth';
import { fetchSheetUnits } from '@/lib/inventory/fetch-sheet';
import snapshot from '../../../lib/inventory/snapshot.json';




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
function rowToEnvelope(row) {
  const r = toListingRecord(row) ;
  const images = Array.isArray(r.images) ? r.images : [];

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
    pfReferenceNumber: r.pfReferenceNumber || null,
    publishToClient: r.publishToClient || false,
  };
}

/** Map a seed Listing to the legacy envelope shape (offline / sandbox fallback). */
function seedToEnvelope(l) {
  return {
    id: l.id,
    title: `${l.type} · ${l.compound}`,
    price: l.usd,
    compound: l.compound,
    beds: l.beds,
    baths: l.bath,
    area: l.area,
    image: l.img || undefined,
    images: l.img ? [l.img] : [],
    description: l.description,
    propertyType: l.type,
    status: l.status,
    amenities: [],
    purpose: l.mode === 'rent' ? 'for-rent' : 'for-sale',
    pfReferenceNumber: null,
    publishToClient: true,
  };
}

function inventoryUnitToListing(u) {
  const price = u.price || 0;
  const egpM = price > 100000 ? price / 1000000 : price;
  const usd = u.mode === 'rent' ? Math.round(price / 50) : Math.round(price / 50);
  return {
    id: u.id,
    code: u.code || u.id,
    compound: u.location || 'New Cairo',
    zone: u.zone || '5th Settlement',
    type: u.propertyType || 'Apartment',
    beds: u.beds || 3,
    bath: Math.max(1, (u.beds || 3) - 1),
    area: u.area || 150,
    egpM: Number(egpM.toFixed(2)),
    usd: usd,
    aiScore: 8.5,
    tag: u.status === 'available' ? 'Verified Owner' : null,
    mode: u.mode || 'sale',
    agent: 'Sierra Direct Advisor',
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    status: u.status || 'available',
    description: u.comment || '',
  } ;
}

/** Filter-mode read: Supabase → Live Sheet → Snapshot → Seed fallback (INTEGRATION.md contract). */
async function readListings() {
  // Try Supabase first (reads all active listings directly)
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: supaListings, error: supaErr } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .limit(500);

    if (!supaErr && supaListings && supaListings.length > 0) {
      return supaListings.map((item) => {
        const price = Number(item.price) || 0;
        const egpM = price > 100000 ? price / 1000000 : price;
        const usd = item.deal_type === 'rent' ? Math.round(price / 50) : Math.round(price / 50);

        return {
          id: item.id || item.ref_id,
          code: item.code || item.ref_id || `SE-${_optionalChain([item, 'access', _ => _.id, 'optionalAccess', _2 => _2.substring, 'call', _3 => _3(0, 4)])}`,
          compound: item.compound || 'New Cairo',
          zone: item.location_area || '5th Settlement',
          type: item.property_type || 'Apartment',
          beds: item.bedrooms || 3,
          bath: item.bathrooms || 2,
          area: Number(item.area_sqm) || 150,
          egpM: Number(egpM.toFixed(2)),
          usd: usd || 1500,
          aiScore: item.roi_percentage ? 9.0 : 8.8,
          tag: item.featured ? 'Featured' : item.is_hot_deal ? 'Hot Deal' : 'Verified Owner',
          mode: item.deal_type === 'rent' ? 'rent' : 'sale',
          agent: item.owner_name ? `${item.owner_name} (Owner)` : 'Sierra Broker',
          img: (item.images && item.images[0]) || '',
          status: item.status || 'available',
          description: item.description || '',
        } ;
      });
    }
  } catch (supaErr) {
    console.warn('[listings] Supabase read failed, using sheet:', supaErr);
  }

  // Live Sheet fallback
  try {
    const sheetUnits = await fetchSheetUnits({ revalidate: 300 });
    if (sheetUnits && sheetUnits.length > 0) {
      return sheetUnits.map(inventoryUnitToListing);
    }
  } catch (err) {
    console.warn('[listings] Live sheet fetch failed, using snapshot:', err);
  }

  // Snapshot fallback
  if (snapshot && _optionalChain([(snapshot ), 'access', _4 => _4.units, 'optionalAccess', _5 => _5.length])) {
    return (snapshot ).units.map(inventoryUnitToListing);
  }

  // Final fallback to seed data
  return SEED_LISTINGS;
}

export async function GET(request) {
  const rateLimitResponse = await applyRateLimit(request, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const parseResult = listingsQuerySchema.safeParse({
      id: _nullishCoalesce(searchParams.get('id'), () => ( undefined)),
      limit: _nullishCoalesce(searchParams.get('limit'), () => ( undefined)),
      mode: _nullishCoalesce(searchParams.get('mode'), () => ( undefined)),
      compound: _nullishCoalesce(searchParams.get('compound'), () => ( undefined)),
      type: _nullishCoalesce(searchParams.get('type'), () => ( undefined)),
      beds: _nullishCoalesce(searchParams.get('beds'), () => ( undefined)),
      maxUsd: _nullishCoalesce(searchParams.get('maxUsd'), () => ( undefined)),
      q: _nullishCoalesce(searchParams.get('q'), () => ( undefined)),
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { id, limit, mode, compound, type, beds, maxUsd, q } = parseResult.data;

    // ── Legacy envelope mode (?id= / ?limit=) ──────────────────────────────
    if (id) {
      let row = null;
      try {
        row = await getRecord(COLLECTIONS.units, id);
      } catch (err) {
        // Unreachable / denied → fall through to seed, never a 5xx.
        logger.error('[LISTINGS] fetch-by-id failed:', err);
      }
      if (row) {
        const listing = rowToEnvelope(row);
        // The submit endpoint hands the caller the new id, so fetch-by-id
        // would otherwise be a direct link to an unverified submission.
        if (isPubliclyVisibleListingStatus(listing.status)) {
          return NextResponse.json({ success: true, listing });
        }
        return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
      }
      const seed = SEED_LISTINGS.find((l) => l.id === id);
      if (!seed) {
        return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, listing: seedToEnvelope(seed) });
    }

    if (limit != null) {
      try {
        const rows = await listRecords(COLLECTIONS.units, { limit });
        // publishToClient is the staff moderation switch: a row is only public
        // inventory once someone has turned it on.
        const listings = rows.map(rowToEnvelope).filter((l) => l.publishToClient === true);
        return NextResponse.json({ success: true, listings, count: listings.length });
      } catch (err) {
        // Unreachable / denied → seed fallback, never 5xx.
        logger.error('[LISTINGS] envelope list failed:', err);
      }
      const listings = SEED_LISTINGS.slice(0, limit).map(seedToEnvelope);
      return NextResponse.json({ success: true, listings, count: listings.length, seeded: true });
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
        [l.code, l.compound, l.agent, l.type, _nullishCoalesce(l.description, () => ( ''))]
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
  } catch (error) {
    logger.error('[LISTINGS_ERROR] Failed to fetch listings:', _optionalChain([error, 'optionalAccess', _6 => _6.message]) || error);
    return NextResponse.json(
      { success: false, error: _optionalChain([error, 'optionalAccess', _7 => _7.message]) || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
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

      const created = await insertRecord('listings', columns);
      return NextResponse.json({ id: created.id }, { status: 201 });
    } catch (writeError) {
      if (process.env.NODE_ENV === 'production') throw writeError;
      // Sandbox mode (no Supabase credentials): acknowledge with a demo id so
      // the UI flow completes; data is not persisted.
      logger.warn('[LISTINGS_CREATE] Supabase write failed, returning sandbox id:', writeError);
      return NextResponse.json({ id: `demo-${Date.now()}`, sandbox: true }, { status: 201 });
    }
  } catch (error) {
    logger.error('[LISTINGS_CREATE_ERROR]', _optionalChain([error, 'optionalAccess', _8 => _8.message]) || error);
    return NextResponse.json(
      { error: _optionalChain([error, 'optionalAccess', _9 => _9.message]) || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
