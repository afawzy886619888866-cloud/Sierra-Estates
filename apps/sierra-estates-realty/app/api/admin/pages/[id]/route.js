 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * GET    /api/admin/pages/:id — fetch one page
 * PATCH  /api/admin/pages/:id — update page sections
 * DELETE /api/admin/pages/:id — delete page (superadmin only)
 */

import { NextResponse } from 'next/server';
import { verifyAdminRequest, } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

async function callerIsSuperadmin(authResult) {
  if (!authResult.uid) return false;
  const callerDoc = await adminDb.collection('users').doc(authResult.uid).get();
  return _optionalChain([callerDoc, 'access', _ => _.data, 'call', _2 => _2(), 'optionalAccess', _3 => _3.role]) === 'superadmin';
}

export async function GET(
  req,
  { params }
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
  req,
  { params }
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
      updatedBy: _nullishCoalesce(authResult.uid, () => ( 'system')),
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
  req,
  { params }
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
