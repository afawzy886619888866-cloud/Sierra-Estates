/**
 * GET    /api/admin/pages/:id — fetch one page
 * PATCH  /api/admin/pages/:id — update page sections
 * DELETE /api/admin/pages/:id — delete page (superadmin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, AuthResult } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

async function callerIsSuperadmin(authResult: AuthResult): Promise<boolean> {
  if (authResult.method === 'secret-key') return true;
  if (!authResult.uid) return false;
  const callerDoc = await adminDb.collection('users').doc(authResult.uid).get();
  return callerDoc.data()?.role === 'superadmin';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const doc = await adminDb.collection('pages').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, page: { id: doc.id, ...doc.data() } });
  } catch (err) {
    logger.error('[pages] GET by id failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch page', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const ref = adminDb.collection('pages').doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    await ref.update({
      ...body,
      updatedAt: Timestamp.now(),
      updatedBy: authResult.uid ?? 'system',
    });

    const updated = await ref.get();
    return NextResponse.json({ success: true, page: { id: updated.id, ...updated.data() } });
  } catch (err) {
    logger.error('[pages] PATCH failed:', err);
    return NextResponse.json(
      { error: 'Failed to update page', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await callerIsSuperadmin(authResult))) {
    return NextResponse.json({ error: 'Forbidden — superadmin required to delete pages' }, { status: 403 });
  }

  try {
    const { id } = await params;
    await adminDb.collection('pages').doc(id).delete();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    logger.error('[pages] DELETE failed:', err);
    return NextResponse.json(
      { error: 'Failed to delete page', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
