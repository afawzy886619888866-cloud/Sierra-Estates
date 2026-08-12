import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { mapLeadToSpa, mapSpaToLeadPatch } from '@/lib/server/admin-spa-mappers';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

// Force dynamic rendering — uses Firebase/auth at runtime
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const patch = mapSpaToLeadPatch(body);

    const ref = adminDb.collection(COLLECTIONS.stakeholders).doc(id);
    await ref.update({ ...patch, updatedAt: Timestamp.now() });

    const updated = await ref.get();
    if (!updated.exists) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead: mapLeadToSpa(id, updated.data()) });
  } catch (err) {
    logger.error('Error updating lead:', err);
    return NextResponse.json(
      { error: 'Failed to update lead', details: err instanceof Error ? err.message : 'Unknown error' },
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
    await adminDb.collection(COLLECTIONS.stakeholders).doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error deleting lead:', err);
    return NextResponse.json(
      { error: 'Failed to delete lead', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
