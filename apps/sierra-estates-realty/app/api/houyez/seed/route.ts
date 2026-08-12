/**
 * POST /api/houyez/seed
 * ────────────────────────────────────────────────────────────────────────────
 * Admin-only endpoint that seeds the four Houyez Firestore collections
 * (houyez_slides, houyez_compounds, houyez_rooms, houyez_listings) from the
 * static seed data in data/houyez-properties.ts.
 *
 * Body:
 *   { "overwrite": false }   ← skip collections that already have docs (default)
 *   { "overwrite": true }    ← wipe each collection first, then re-insert
 *
 * Auth: requires the `x-admin-key` header to match `process.env.ADMIN_API_KEY`.
 * Fails CLOSED in production — if ADMIN_API_KEY is not configured on a deployed
 * environment the endpoint refuses (503). It stays open only outside production
 * (local dev) for convenience.
 *
 * Response:
 *   200 { success: true, result: { slides, compounds, rooms, listings, skipped, errors } }
 *   401 { success: false, error: 'Unauthorized' }              (key set, header wrong/missing)
 *   503 { success: false, error: 'Seed endpoint disabled...' } (production + ADMIN_API_KEY unset)
 *   500 { success: false, error: '<message>' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // ─── Auth (fail closed in production) ──────────────────────────────────────
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    // No key configured: never leave a destructive seed endpoint open on a
    // deployed environment. Allow only outside production for local convenience.
    if (process.env.NODE_ENV === 'production') {
      logger.error('[houyez/seed] ADMIN_API_KEY not configured — refusing in production');
      return NextResponse.json(
        { success: false, error: 'Seed endpoint disabled: ADMIN_API_KEY not configured' },
        { status: 503 },
      );
    }
  } else {
    const provided = req.headers.get('x-admin-key');
    if (provided !== adminKey) {
      logger.warn('[houyez/seed] unauthorized attempt');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  // ─── Parse body ──────────────────────────────────────────────────────────
  let overwrite = false;
  try {
    const body = await req.json();
    if (body && typeof body.overwrite === 'boolean') overwrite = body.overwrite;
  } catch {
    // Empty / invalid body is fine — default overwrite=false
  }

  // ─── Run seed ────────────────────────────────────────────────────────────
  try {
    // Dynamic import so the Firestore client isn't pulled into the build
    // graph for routes that don't need it.
    const { seedHouyezPortal } = await import('@/lib/houyez/firestore');
    const result = await seedHouyezPortal({ overwrite });
    logger.info('[houyez/seed] seed completed', result);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    const msg = (err as Error).message;
    logger.error('[houyez/seed] seed failed:', msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Use POST with optional { overwrite: boolean } body',
  }, { status: 405 });
}
