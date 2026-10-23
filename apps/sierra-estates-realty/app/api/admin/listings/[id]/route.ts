import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { updateRecord, deleteRecord, type RecordData } from '@sierra-estates/db';
import { mapListingToSpa, mapSpaToListingPatch } from '@/lib/server/admin-spa-mappers';
import { toListingColumns } from '@/lib/server/listing-columns';
import { logger } from '@/lib/logger';

// Force dynamic rendering — uses Supabase/auth at runtime
export const dynamic = 'force-dynamic';

/** See app/api/admin/listings/route.ts — area_sqm/location_area are the only renamed columns. */
function rowToListingDoc(row: RecordData): Record<string, unknown> {
  const { areaSqm, locationArea, ...rest } = row as Record<string, unknown>;
  return { ...rest, area: areaSqm, location: locationArea };
}

function listingPatchToColumns(patch: Record<string, unknown>): RecordData {
  const { area, ...rest } = patch;
  const out: RecordData = { ...rest };
  if (area !== undefined) out.areaSqm = area;
  return out;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const patch = listingPatchToColumns(mapSpaToListingPatch(body));

    // toListingColumns parks any non-column field (publishToClient, …) in
    // raw_data so the update can never fail on the deployed schema cache.
    const updated = await updateRecord('listings', id, {
      ...toListingColumns(patch),
      updatedAt: new Date().toISOString(),
    });
    if (!updated) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, listing: mapListingToSpa(id, rowToListingDoc(updated)) });
  } catch (err) {
    logger.error('Error updating listing:', err);
    return NextResponse.json(
      { error: 'Failed to update listing', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteRecord('listings', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error deleting listing:', err);
    return NextResponse.json(
      { error: 'Failed to delete listing', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
