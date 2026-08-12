/**
 * GET /api/admin/db/:collection
 *
 * Database browser for admin super-users. Lists documents in any Firestore
 * collection with optional pagination + simple field filters.
 *
 * SECURITY: this endpoint is gated behind verifyAdminRequest AND an
 * additional `role === 'superadmin'` check — regular admins cannot use it
 * because it grants raw access to any collection (including `users`,
 * `audit_log`, etc.).
 *
 * Query params:
 *   - limit  (default 100, max 500)
 *   - offset (default 0, handled by client since Firestore cursors are complex)
 *   - where  (format: "field==value" — single filter, basic equality only)
 *   - order  (format: "field" or "field:desc" — single order by)
 *
 * Response:
 *   { success: true, collection, docs: [{id, ...data}], count }
 *
 * Example:
 *   GET /api/admin/db/users?limit=50&where=role==admin&order=createdAt:desc
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, AuthResult } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { logger } from '@/lib/logger';

// Collections that are NEVER browseable, even for superadmins.
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ collection: string }> }) {
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
  if (BLOCKED_COLLECTIONS.has(collection)) {
    return NextResponse.json(
      { error: `Collection '${collection}' is not browseable` },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const where = searchParams.get('where');
    const order = searchParams.get('order');

    let query: FirebaseFirestore.Query = adminDb.collection(collection);

    // Simple equality filter: "field==value"
    if (where) {
      const match = where.match(/^([a-zA-Z0-9_.]+)==(.+)$/);
      if (match) {
        const [, field, value] = match;
        // Try to coerce to number/boolean
        let coerced: string | number | boolean = value;
        if (value === 'true') coerced = true;
        else if (value === 'false') coerced = false;
        else if (/^-?\d+(\.\d+)?$/.test(value)) coerced = Number(value);
        query = query.where(field, '==', coerced);
      }
    }

    // Order: "field" or "field:desc"
    if (order) {
      const [field, direction] = order.split(':');
      query = query.orderBy(field, direction === 'desc' ? 'desc' : 'asc');
    }

    const snap = await query.limit(limit).get();

    const docs = snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      // Serialize Firestore Timestamps to ISO strings for JSON transport
      const serialized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object' && typeof (value as any).toDate === 'function') {
          serialized[key] = (value as any).toDate().toISOString();
        } else if (value && typeof value === 'object' && Array.isArray((value as any).values)) {
          // Firestore arrayValue
          serialized[key] = (value as any).values;
        } else {
          serialized[key] = value;
        }
      }
      return { id: doc.id, ...serialized };
    });

    return NextResponse.json({
      success: true,
      collection,
      count: docs.length,
      docs,
    });
  } catch (err: any) {
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
export async function POST(req: NextRequest, { params }: { params: Promise<{ collection: string }> }) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await callerIsSuperadmin(authResult))) {
    return NextResponse.json({ error: 'Forbidden — superadmin required' }, { status: 403 });
  }

  const { collection } = await params;
  if (BLOCKED_COLLECTIONS.has(collection)) {
    return NextResponse.json({ error: `Collection '${collection}' is read-only` }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { Timestamp } = await import('firebase-admin/firestore');
    const ref = await adminDb.collection(collection).add({
      ...body,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return NextResponse.json({ success: true, id: ref.id }, { status: 201 });
  } catch (err) {
    logger.error(`[db-editor] Failed to create doc:`, err);
    return NextResponse.json(
      { error: 'Failed to create', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
