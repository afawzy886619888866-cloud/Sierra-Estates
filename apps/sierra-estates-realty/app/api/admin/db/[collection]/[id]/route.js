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
import { getRecord, updateRecord, deleteRecord } from '@sierra-estates/db';
import { isBrowseableTable } from '@/lib/server/browseable-tables';
import { logger } from '@/lib/logger';

async function callerIsSuperadmin(authResult) {
  if (!authResult.uid) return false;
  const caller = await getRecord('profiles', authResult.uid);
  return _optionalChain([caller, 'optionalAccess', _ => _.role]) === 'superadmin';
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
  // The Firestore version checked the denylist on PATCH and DELETE but not on
  // GET, so a blocked collection was still readable by id. The allowlist is
  // applied to all three.
  if (!isBrowseableTable(collection)) {
    return NextResponse.json({ error: `Table '${collection}' is not browseable` }, { status: 403 });
  }

  try {
    const doc = await getRecord(collection, id);
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, doc });
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
  if (!isBrowseableTable(collection)) {
    return NextResponse.json({ error: `Table '${collection}' is read-only` }, { status: 403 });
  }

  try {
    const body = await req.json();
    // updateRecord returns the updated row, so the separate re-read the
    // Firestore version needed is gone; a missing row comes back null.
    const updated = await updateRecord(collection, id, {
      ...body,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, doc: updated });
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
  if (!isBrowseableTable(collection)) {
    return NextResponse.json({ error: `Table '${collection}' is read-only` }, { status: 403 });
  }

  try {
    await deleteRecord(collection, id);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    logger.error('[db-editor] DELETE failed:', err);
    return NextResponse.json(
      { error: 'Failed to delete', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
