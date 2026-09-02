 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * GET    /api/admin/db/:collection/:id — fetch a single doc
 * PATCH  /api/admin/db/:collection/:id — update fields (merge)
 * DELETE /api/admin/db/:collection/:id — delete a doc
 *
 * Same security model as the collection route: superadmin-only.
 * Blocked collections are read-only.
 */

import { NextResponse } from 'next/server';
import { verifyAdminRequest, } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

const BLOCKED_COLLECTIONS = new Set([
  'admin_credentials',
  'service_accounts',
  'system_secrets',
]);

async function callerIsSuperadmin(authResult) {
  if (authResult.method === 'secret-key') return true;
  if (!authResult.uid) return false;
  const callerDoc = await adminDb.collection('users').doc(authResult.uid).get();
  return _optionalChain([callerDoc, 'access', _ => _.data, 'call', _2 => _2(), 'optionalAccess', _3 => _3.role]) === 'superadmin';
}

function serialize(data) {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && typeof (value ).toDate === 'function') {
      out[key] = (value ).toDate().toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function GET(
  req,
  { params }
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
    return NextResponse.json({ success: true, doc: { id: doc.id, ...serialize(doc.data()) } });
  } catch (err) {
    logger.error('[db-editor] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req,
  { params }
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
    return NextResponse.json({ success: true, doc: { id: updated.id, ...serialize(updated.data()) } });
  } catch (err) {
    logger.error('[db-editor] PATCH failed:', err);
    return NextResponse.json(
      { error: 'Failed to update', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req,
  { params }
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
