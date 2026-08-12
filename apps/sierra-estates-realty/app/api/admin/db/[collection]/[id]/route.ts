/**
 * GET    /api/admin/db/:collection/:id — fetch a single doc
 * PATCH  /api/admin/db/:collection/:id — update fields (merge)
 * DELETE /api/admin/db/:collection/:id — delete a doc
 *
 * Same security model as the collection route: superadmin-only.
 * Blocked collections are read-only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, AuthResult } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

const BLOCKED_COLLECTIONS = new Set([
  'admin_credentials',
  'service_accounts',
  'system_secrets',
]);

async function callerIsSuperadmin(authResult: AuthResult): Promise<boolean> {
  if (authResult.method === 'secret-key') return true;
  if (!authResult.uid) return false;
  const callerDoc = await adminDb.collection('users').doc(authResult.uid).get();
  return callerDoc.data()?.role === 'superadmin';
}

function serialize(data: FirebaseFirestore.DocumentData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && typeof (value as any).toDate === 'function') {
      out[key] = (value as any).toDate().toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await callerIsSuperadmin(authResult))) {
    return NextResponse.json({ error: 'Forbidden — superadmin required' }, { status: 403 });
  }

  const { collection, id } = await params;
  try {
    const doc = await adminDb.collection(collection).doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, doc: { id: doc.id, ...serialize(doc.data()!) } });
  } catch (err) {
    logger.error('[db-editor] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await callerIsSuperadmin(authResult))) {
    return NextResponse.json({ error: 'Forbidden — superadmin required' }, { status: 403 });
  }

  const { collection, id } = await params;
  if (BLOCKED_COLLECTIONS.has(collection)) {
    return NextResponse.json({ error: `Collection '${collection}' is read-only` }, { status: 403 });
  }

  try {
    const body = await req.json();
    const ref = adminDb.collection(collection).doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await ref.update({
      ...body,
      updatedAt: Timestamp.now(),
    });

    const updated = await ref.get();
    return NextResponse.json({ success: true, doc: { id: updated.id, ...serialize(updated.data()!) } });
  } catch (err) {
    logger.error('[db-editor] PATCH failed:', err);
    return NextResponse.json(
      { error: 'Failed to update', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await callerIsSuperadmin(authResult))) {
    return NextResponse.json({ error: 'Forbidden — superadmin required' }, { status: 403 });
  }

  const { collection, id } = await params;
  if (BLOCKED_COLLECTIONS.has(collection)) {
    return NextResponse.json({ error: `Collection '${collection}' is read-only` }, { status: 403 });
  }

  try {
    await adminDb.collection(collection).doc(id).delete();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    logger.error('[db-editor] DELETE failed:', err);
    return NextResponse.json(
      { error: 'Failed to delete', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
