/**
 * /api/listings
 *
 * GET — two response modes, both public:
 *
 *   1. Legacy envelope mode — when `?id=` or `?limit=` is present.
 *      Returns { success, listing | listings, count }. Kept for the static
 *      public/client-page and lib/services/InventoryService.client.ts.
 *      Reads Firestore via the public REST key; if the key is missing, the
 *      read fails, or rules deny access, it falls back to seed data instead
 *      of erroring (INTEGRATION.md data-flow contract).
 *
 *   2. Filter mode (default) — used by lib/api-client `api.listings()`.
 *      Returns a bare Listing[] filtered by mode/compound/type/beds/maxUsd/q.
 *      Reads Firestore via the Admin SDK → falls back to SEED_LISTINGS.
 *
 * POST — create a listing (manager+). Writes to Firestore when the Admin SDK
 * is configured; in sandbox mode returns a demo id so the admin UI flow works.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { COLLECTIONS } from '@/lib/models/schema';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { logger } from '@/lib/logger';
import { SEED_LISTINGS } from '@/lib/seed';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/auth';
import { fetchSheetUnits } from '@/lib/inventory/fetch-sheet';
import snapshot from '@/lib/inventory/snapshot.json';
import type { Listing } from '@/lib/types';



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

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '';
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sierra-estates';

interface FirestoreValue {
  [key: string]: any;
}

interface FirestoreDocument {
  name?: string;
  fields?: { [key: string]: FirestoreValue };
}

/** Extract value from a Firestore REST document field. */
function extractValue(field: FirestoreValue): any {
  if (!field) return undefined;
  if (field.stringValue) return field.stringValue;
  if (field.integerValue) return parseInt(field.integerValue, 10);
  if (field.doubleValue) return field.doubleValue;
  if (field.booleanValue) return field.booleanValue;
  if (field.arrayValue?.values) {
    return field.arrayValue.values.map(extractValue);
  }
  if (field.mapValue?.fields) {
    const obj: any = {};
    for (const [key, val] of Object.entries(field.mapValue.fields)) {
      obj[key] = extractValue(val as FirestoreValue);
    }
    return obj;
  }
  return undefined;
}

/** Query Firestore via the public REST API (legacy envelope mode). */
async function queryFirestoreRest(
  collectionName: string,
  limit?: number,
  docId?: string
): Promise<{ doc?: FirestoreDocument; docs: FirestoreDocument[] } | null> {
  if (!API_KEY) return null;
  try {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}`
    );

    if (docId) {
      url.pathname += `/${docId}`;
    } else if (limit) {
      url.searchParams.append('pageSize', limit.toString());
    }
    url.searchParams.append('key', API_KEY);

    const response = await fetch(url.toString(), { method: 'GET' });

    if (!response.ok) {
      logger.error(`[FIRESTORE_REST] ${response.status}: ${await response.text()}`);
      return null;
    }

    const data = await response.json();

    if (docId) {
      return { doc: data, docs: [] };
    }
    return { docs: data.documents || [] };
  } catch (error: any) {
    logger.error('[FIRESTORE_REST_ERROR]', error?.message || error);
    return null;
  }
}

/** Transform a Firestore REST document to the legacy envelope listing shape. */
function transformToListing(doc: FirestoreDocument): any {
  if (!doc || !doc.fields) return null;

  const fields = doc.fields;
  const id = doc.name?.split('/').pop() || '';

  return {
    id,
    title: extractValue(fields.title) || 'Untitled Property',
    titleAr: extractValue(fields.titleAr) || undefined,
    price: extractValue(fields.price) || 0,
    compound: extractValue(fields.compound) || extractValue(fields.location) || extractValue(fields.city) || '',
    beds: extractValue(fields.bedrooms) || 0,
    baths: extractValue(fields.bathrooms) || 0,
    area: extractValue(fields.area) || 0,
    image: (extractValue(fields.images)?.[0]) || undefined,
    images: extractValue(fields.images) || [],
    description: extractValue(fields.description) || undefined,
    propertyType: extractValue(fields.propertyType) || extractValue(fields.type) || 'apartment',
    status: extractValue(fields.status) || 'available',
    amenities: extractValue(fields.amenities) || [],
    purpose: extractValue(fields.monthlyRent) ? 'for-rent' : 'for-sale',
    pfReferenceNumber: extractValue(fields.pfReferenceNumber) || null,
    publishToClient: extractValue(fields.publishToClient) || false,
  };
}

/** Map a seed Listing to the legacy envelope shape (offline / sandbox fallback). */
function seedToEnvelope(l: Listing) {
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

function inventoryUnitToListing(u: any): Listing {
  const price = u.price || 0;
  const egpM = price > 100000 ? price / 1_000_000 : price;
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
  } as Listing;
}

/** Filter-mode read: Supabase → Firebase → Live Sheet → Snapshot → Seed fallback (INTEGRATION.md contract). */
async function readListings(): Promise<Listing[]> {
  // 1. Try Supabase first (reads all active listings directly)
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: supaListings, error: supaErr } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .limit(500);

    if (!supaErr && supaListings && supaListings.length > 0) {
      return supaListings.map((item: any) => {
        const price = Number(item.price) || 0;
        const egpM = price > 100000 ? price / 1_000_000 : price;
        const usd = item.deal_type === 'rent' ? Math.round(price / 50) : Math.round(price / 50);

        return {
          id: item.id || item.ref_id,
          code: item.ref_id || `SE-${item.id?.substring(0, 4)}`,
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
        } as Listing;
      });
    }
  } catch (supaErr) {
    console.warn('[listings] Supabase read failed, checking Firestore fallback:', supaErr);
  }

  // 2. Try Firebase Firestore (reads houyez_listings + listings merged)
  const db = await getAdminDb();
  if (db) {
    try {
      const [snap1, snap2] = await Promise.all([
        db.collection('houyez_listings').get(),
        db.collection('listings').get(),
      ]);
      const map = new Map<string, Listing>();
      if (!snap1.empty) {
        snap1.docs.forEach((d) => {
          const data = d.data();
          map.set(d.id, {
            id: d.id,
            code: data.code || `SE-${d.id.slice(0, 4).toUpperCase()}`,
            compound: data.compound || data.cmp || data.location || 'New Cairo',
            zone: data.zone || '5th Settlement',
            type: data.type || data.propertyType || 'Apartment',
            beds: data.beds ?? data.bedrooms ?? 3,
            bath: data.bath ?? data.bathrooms ?? 2,
            area: data.area ?? 150,
            egpM: data.egpM ?? (data.price ? data.price / 1e6 : 8),
            usd: data.usd ?? (data.price && data.currency === 'USD' ? data.price : 1500),
            aiScore: data.aiScore ?? data.ai ?? 8.5,
            tag: data.tag ?? data.badge ?? null,
            mode: data.mode ?? 'sale',
            agent: data.agent ?? 'Sierra Broker',
            img: data.img ?? data.featuredImage ?? '',
            status: data.status ?? (data.active === false ? 'archived' : 'available'),
            description: data.description ?? '',
          } as Listing);
        });
      }
      if (!snap2.empty) {
        snap2.docs.forEach((d) => {
          if (!map.has(d.id)) {
            map.set(d.id, { id: d.id, ...(d.data() as any) });
          }
        });
      }
      if (map.size > 0) {
        return Array.from(map.values());
      }
    } catch (err) {
      console.warn('[listings] Admin SDK read failed, using sheet:', err);
    }
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
  if (snapshot && (snapshot as any).units?.length) {
    return (snapshot as any).units.map(inventoryUnitToListing);
  }

  // Final fallback to seed data
  return SEED_LISTINGS;
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
      const result = await queryFirestoreRest(COLLECTIONS.units, undefined, id);
      if (result?.doc) {
        return NextResponse.json({ success: true, listing: transformToListing(result.doc) });
      }
      const seed = SEED_LISTINGS.find((l) => l.id === id);
      if (!seed) {
        return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, listing: seedToEnvelope(seed) });
    }

    if (limit != null) {
      const result = await queryFirestoreRest(COLLECTIONS.units, limit);
      if (result) {
        let listings = (result.docs || []).map(transformToListing).filter(Boolean);
        listings = listings.filter((l: any) => l.publishToClient === true);
        return NextResponse.json({ success: true, listings, count: listings.length });
      }
      // Firestore unreachable / denied / key missing → seed fallback, never 5xx.
      const listings = SEED_LISTINGS.slice(0, limit).map(seedToEnvelope);
      return NextResponse.json({ success: true, listings, count: listings.length, seeded: true });
    }

    // ── Filter mode (api-client contract): bare Listing[] ──────────────────
    let items = await readListings();
    items = items.filter((l) => l.status !== 'archived');
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

    const db = await getAdminDb();
    if (db) {
      const ref = await db.collection('listings').add(doc);
      // Dual-write to houyez_listings for real-time client page synchronization
      await db.collection('houyez_listings').doc(ref.id).set({
        ...doc,
        id: ref.id,
        cmp: doc.compound,
        ai: doc.aiScore,
        active: doc.status !== 'archived',
      }, { merge: true });

      return NextResponse.json({ id: ref.id }, { status: 201 });
    }

    // Sandbox mode (no Admin SDK): acknowledge with a demo id so the UI flow
    // completes; data is not persisted (seed data is immutable).
    return NextResponse.json({ id: `demo-${Date.now()}`, sandbox: true }, { status: 201 });
  } catch (error: any) {
    logger.error('[LISTINGS_CREATE_ERROR]', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
