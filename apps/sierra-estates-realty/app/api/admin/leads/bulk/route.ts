import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { mapSpaToLeadPatch } from '@/lib/server/admin-spa-mappers';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

// Force dynamic rendering — uses Firebase/auth at runtime
export const dynamic = 'force-dynamic';

/** Mirrors the SPA's writeBatch usage for multi-select actions in LeadsPage. */
export async function POST(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { ids, action, patch } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }

    const batch = adminDb.batch();
    const collection = adminDb.collection(COLLECTIONS.stakeholders);

    if (action === 'delete') {
      ids.forEach((id: string) => batch.delete(collection.doc(id)));
    } else if (action === 'update') {
      const mapped = mapSpaToLeadPatch(patch || {});
      ids.forEach((id: string) => batch.update(collection.doc(id), { ...mapped, updatedAt: Timestamp.now() }));
    } else {
      return NextResponse.json({ error: 'action must be "delete" or "update"' }, { status: 400 });
    }

    await batch.commit();
    return NextResponse.json({ success: true, count: ids.length });
  } catch (err) {
    logger.error('Error in bulk lead operation:', err);
    return NextResponse.json(
      { error: 'Failed bulk operation', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
