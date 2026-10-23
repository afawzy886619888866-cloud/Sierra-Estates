import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { getRecord } from '@sierra-estates/db';
import { AirtableIntegrationService } from '@/lib/services/AirtableIntegrationService';
import { logger } from '@/lib/logger';

/**
 * AIRTABLE SYNC API
 *
 * POST /api/sync/airtable                          — pull listings from Airtable into the database.
 * POST /api/sync/airtable {"direction":"export"}   — push listings + leads INTO Airtable
 *                                                    (upserts: listings merge on Code, leads on
 *                                                    record ID — safe to re-run).
 * GET  /api/sync/airtable                          — report whether Airtable is configured (no secrets).
 *
 * Auth mirrors /api/sync: Supabase-authenticated admins, or service/cron callers
 * presenting the X-SBR-SECRET-KEY header (verifyRequest's "secret" method).
 */

/** Fails closed: any lookup error denies rather than admits. */
async function isAdmin(uid: string): Promise<boolean> {
  try {
    const profile = await getRecord<{ role?: string }>('profiles', uid);
    return profile?.role === 'admin';
  } catch (error) {
    logger.error('[AIRTABLE_SYNC_AUTH_ERROR] Role check failed:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.method === 'supabase' && !(await isAdmin(auth.uid!))) {
    return unauthorizedResponse('Admin privileges required');
  }

  const cfg = AirtableIntegrationService.getConfig();
  return NextResponse.json({
    configured: cfg !== null,
    tables: cfg?.tables ?? [],
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.method === 'supabase' && !(await isAdmin(auth.uid!))) {
    return unauthorizedResponse('Admin privileges required');
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result =
      body?.direction === 'export'
        ? await AirtableIntegrationService.exportToAirtable()
        : await AirtableIntegrationService.syncFromEnv();
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // Missing configuration is a client-actionable 400, not a server fault.
    const status = message.includes('not configured') ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
