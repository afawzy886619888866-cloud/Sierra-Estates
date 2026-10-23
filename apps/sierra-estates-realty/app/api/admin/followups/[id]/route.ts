/**
 * GET    /api/admin/followups/:id
 * PATCH  /api/admin/followups/:id  — update status, notes, etc.
 * DELETE /api/admin/followups/:id
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { getRecord, updateRecord, deleteRecord, type RecordData } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

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
    const followup = await getRecord('followups', id);
    if (!followup) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, followup });
  } catch (err) {
    logger.error('[followups] GET by id failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch follow-up' },
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
    const existing = await getRecord<RecordData>('followups', id);
    if (!existing) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    const update: RecordData = { ...body, updatedAt: new Date().toISOString() };

    // If status is being set to 'completed', auto-set completedAt
    if (body.status === 'completed' && !existing.completedAt) {
      update.completedAt = new Date().toISOString();
    }

    // If dueAt is being updated as a string, normalise it to a timestamp
    if (typeof body.dueAt === 'string') {
      update.dueAt = new Date(body.dueAt).toISOString();
    }

    const updated = await updateRecord('followups', id, update);
    return NextResponse.json({ success: true, followup: updated });
  } catch (err) {
    logger.error('[followups] PATCH failed:', err);
    return NextResponse.json(
      { error: 'Failed to update follow-up', details: err instanceof Error ? err.message : 'Unknown' },
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

  try {
    const { id } = await params;
    await deleteRecord('followups', id);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    logger.error('[followups] DELETE failed:', err);
    return NextResponse.json(
      { error: 'Failed to delete follow-up' },
      { status: 500 }
    );
  }
}
