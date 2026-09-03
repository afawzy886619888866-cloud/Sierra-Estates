 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * GET    /api/admin/pages/:id — fetch one page
 * PATCH  /api/admin/pages/:id — update page sections
 * DELETE /api/admin/pages/:id — delete page (superadmin only)
 */

import { NextResponse } from 'next/server';
import { verifyAdminRequest, } from '@/lib/server/auth-guard';
import { getRecord, updateRecord, deleteRecord } from '@sierra-estates/db';
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

  try {
    const { id } = await params;
    const page = await getRecord('pages', id);
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, page });
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
    // updateRecord returns the updated row, so the separate re-read the
    // Firestore version needed is gone; a missing row comes back null.
    const updated = await updateRecord('pages', id, {
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: _nullishCoalesce(authResult.uid, () => ( 'system')),
    });
    if (!updated) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, page: updated });
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
    await deleteRecord('pages', id);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    logger.error('[pages] DELETE failed:', err);
    return NextResponse.json(
      { error: 'Failed to delete page', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
