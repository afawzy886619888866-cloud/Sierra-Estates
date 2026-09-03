 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * GET /api/admin/db/:collection
 *
 * Database browser for admin super-users. Lists rows from any allowlisted
 * Postgres table with optional pagination + simple field filters.
 *
 * SECURITY: this endpoint is gated behind verifyAdminRequest AND an
 * additional `role === 'superadmin'` check — regular admins cannot use it
 * because it grants raw access to any collection (including `users`,
 * `audit_log`, etc.).
 *
 * Query params:
 *   - limit  (default 100, max 500)
 *   - offset (default 0)
 *   - where  (format: "field==value" — single filter, basic equality only)
 *   - order  (format: "field" or "field:desc" — single order by)
 *
 * Response:
 *   { success: true, collection, docs: [{id, ...data}], count }
 *
 * Example:
 *   GET /api/admin/db/users?limit=50&where=role==admin&order=createdAt:desc
 */

import { NextResponse } from 'next/server';
import { verifyAdminRequest, } from '@/lib/server/auth-guard';
import { listRecords, getRecord, insertRecord, } from '@sierra-estates/db';
import { isBrowseableTable } from '@/lib/server/browseable-tables';
import { logger } from '@/lib/logger';

async function callerIsSuperadmin(authResult) {
  if (!authResult.uid) return false;
  const caller = await getRecord('profiles', authResult.uid);
  return _optionalChain([caller, 'optionalAccess', _ => _.role]) === 'superadmin';
}

export async function GET(req, { params }) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await callerIsSuperadmin(authResult))) {
    return NextResponse.json(
      { error: 'Forbidden — superadmin role required for raw DB access' },
      { status: 403 }
    );
  }

  const { collection } = await params;
  if (!isBrowseableTable(collection)) {
    return NextResponse.json(
      { error: `Table '${collection}' is not browseable` },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const where = searchParams.get('where');
    const order = searchParams.get('order');

    const clauses = [];

    // Simple equality filter: "field==value"
    if (where) {
      const match = where.match(/^([a-zA-Z0-9_.]+)==(.+)$/);
      if (match) {
        const [, field, value] = match;
        // Try to coerce to number/boolean
        let coerced = value;
        if (value === 'true') coerced = true;
        else if (value === 'false') coerced = false;
        else if (/^-?\d+(\.\d+)?$/.test(value)) coerced = Number(value);
        clauses.push({ column: field, value: coerced });
      }
    }

    // Order: "field" or "field:desc"
    const [orderField, orderDirection] = (_nullishCoalesce(order, () => ( ''))).split(':');

    // No Timestamp serialisation step: timestamptz columns already arrive as
    // ISO strings and JSONB as plain objects.
    const docs = await listRecords(collection, {
      where: clauses,
      ...(orderField
        ? { orderBy: { column: orderField, ascending: orderDirection !== 'desc' } }
        : {}),
      limit,
    });

    return NextResponse.json({
      success: true,
      collection,
      count: docs.length,
      docs,
    });
  } catch (err) {
    logger.error(`[db-editor] Failed to list collection:`, err);
    return NextResponse.json(
      {
        error: 'Failed to list collection',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/db/:collection — create a new document in any collection.
 * Body: arbitrary JSON (will be stored as-is, with createdAt/updatedAt timestamps).
 */
export async function POST(req, { params }) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await callerIsSuperadmin(authResult))) {
    return NextResponse.json({ error: 'Forbidden — superadmin required' }, { status: 403 });
  }

  const { collection } = await params;
  if (!isBrowseableTable(collection)) {
    return NextResponse.json({ error: `Table '${collection}' is read-only` }, { status: 403 });
  }

  try {
    const body = await req.json();
    const created = await insertRecord(collection, {
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (err) {
    logger.error(`[db-editor] Failed to create doc:`, err);
    return NextResponse.json(
      { error: 'Failed to create', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
