import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { listRecords, insertRecord, type RecordData } from '@sierra-estates/db';
import { mapListingToSpa, mapSpaToListingPatch } from '@/lib/server/admin-spa-mappers';
import { toListingColumns } from '@/lib/server/listing-columns';
import { fingerprint } from '@/lib/services/inventory/dedupe';
import { logger } from '@/lib/logger';

// Validates the SPA listing shape; passthrough keeps extra fields the mapper reads.
const listingCreateSchema = z
  .object({
    cmp: z.string().min(1).max(100),
    type: z.string().min(1).max(50),
    code: z.string().max(50).optional(),
    beds: z.number().int().min(0).optional(),
    area: z.number().min(0).optional(),
    price: z.union([z.string(), z.number()]).optional(),
    ai: z.number().optional(),
    status: z.string().max(50).optional(),
    img: z.number().int().optional(),
    publishToClient: z.boolean().optional(),
  })
  .passthrough();

/**
 * A `public.listings` row → the document shape the SPA mappers were written
 * against. Only two columns were renamed by the Supabase schema:
 *   area_sqm      → area
 *   location_area → location   (the mapper's fallback for `compound`)
 */
function rowToListingDoc(row: RecordData): Record<string, unknown> {
  const { areaSqm, locationArea, ...rest } = row as Record<string, unknown>;
  return { ...rest, area: areaSqm, location: locationArea };
}

/** Inverse of rowToListingDoc, for the patches mapSpaToListingPatch produces. */
function listingPatchToColumns(patch: Record<string, unknown>): RecordData {
  const { area, ...rest } = patch;
  const out: RecordData = { ...rest };
  if (area !== undefined) out.areaSqm = area;
  return out;
}

/** Admin-scoped listings CRUD via the service-role client — unlike the public /api/listings. */
export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limit = parseInt(new URL(req.url).searchParams.get('limit') || '500', 10);

    // This used to read the Firestore collections 'listings' and 'properties'
    // and merge them by doc id. Both were consolidated into public.listings by
    // the migration, so a single read now returns the same set.
    const rows = await listRecords('listings', { limit });

    const listings = rows.map((row) => mapListingToSpa(String(row.id), rowToListingDoc(row)));

    return NextResponse.json({ success: true, listings, count: listings.length });
  } catch (err) {
    logger.error('Error fetching admin listings:', err);
    return NextResponse.json(
      { error: 'Failed to fetch listings', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = listingCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid listing payload', details: parsed.error.flatten() }, { status: 400 });
    }
    const patch = mapSpaToListingPatch(parsed.data);

    if (!patch.compound || !patch.propertyType) {
      return NextResponse.json({ error: 'cmp and type are required' }, { status: 400 });
    }

    // Inventory Domain Service (additive, non-breaking):
    // `dupeCheckHash` and `syncSource` already exist on the canonical Unit schema
    // (lib/models/schema.ts) but were never populated by this route. We fill them
    // in without changing the SPA-facing shape — mapListingToSpa/mapSpaToListingPatch
    // are untouched, so the admin frontend is unaffected.
    //
    // NOTE: the admin SPA form has no rent-vs-sale field today, so `offerType` is
    // fixed to 'sale' for the fingerprint. This is a known approximation — nothing
    // currently reads dupeCheckHash, so it carries zero live risk, but it should
    // not be treated as authoritative for rent/sale dedupe until the SPA adds an
    // explicit offer-type field. See FUTURE_PLAN/04 for the tracked follow-up.
    const inventoryFields: RecordData = { syncSource: 'manual' };
    if (
      typeof patch.bedrooms === 'number' &&
      typeof patch.area === 'number' &&
      typeof patch.price === 'number'
    ) {
      inventoryFields.dupeCheckHash = fingerprint({
        compound: patch.compound,
        propertyType: patch.propertyType,
        offerType: 'sale',
        bedrooms: patch.bedrooms,
        area: patch.area,
        price: patch.price,
      });
    }

    // Route every field through toListingColumns so anything that is not a
    // real column on the deployed table (category, ownerType, publishToClient…)
    // is parked in raw_data instead of failing the PostgREST schema cache.
    const created = await insertRecord('listings', {
      ...toListingColumns({
        ...listingPatchToColumns(patch),
        ...inventoryFields,
        status: patch.status || 'available',
        category: 'residential',
        ownerType: 'internal',
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, listing: mapListingToSpa(String(created.id), rowToListingDoc(created)) });
  } catch (err) {
    logger.error('Error creating listing:', err);
    return NextResponse.json(
      { error: 'Failed to create listing', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
