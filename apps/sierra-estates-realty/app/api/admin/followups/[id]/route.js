 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * GET    /api/admin/followups/:id
 * PATCH  /api/admin/followups/:id  — update status, notes, etc.
 * DELETE /api/admin/followups/:id
 */

import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

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
    const doc = await adminDb.collection('followups').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, followup: { id: doc.id, ...doc.data() } });
  } catch (err) {
    logger.error('[followups] GET by id failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch follow-up' },
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
    const ref = adminDb.collection('followups').doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    const update = { ...body, updatedAt: Timestamp.now() };

    // If status is being set to 'completed', auto-set completedAt
    if (body.status === 'completed' && !_optionalChain([existing, 'access', _ => _.data, 'call', _2 => _2(), 'optionalAccess', _3 => _3.completedAt])) {
      update.completedAt = Timestamp.now();
    }

    // If dueAt is being updated as a string, convert to Timestamp
    if (typeof body.dueAt === 'string') {
      update.dueAt = Timestamp.fromDate(new Date(body.dueAt));
    }

    await ref.update(update);
    const updated = await ref.get();
    return NextResponse.json({ success: true, followup: { id: updated.id, ...updated.data() } });
  } catch (err) {
    logger.error('[followups] PATCH failed:', err);
    return NextResponse.json(
      { error: 'Failed to update follow-up', details: err instanceof Error ? err.message : 'Unknown' },
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

  try {
    const { id } = await params;
    await adminDb.collection('followups').doc(id).delete();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    logger.error('[followups] DELETE failed:', err);
    return NextResponse.json(
      { error: 'Failed to delete follow-up' },
      { status: 500 }
    );
  }
}
