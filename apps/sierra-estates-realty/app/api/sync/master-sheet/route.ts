import { NextRequest, NextResponse } from 'next/server';
import { syncMasterOwnerSheet, MASTER_SHEET_ID_DEFAULT } from '@/lib/services/master-sheet-sync';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';

/**
 * Triggers a live write into the canonical `units` collection, so it must be
 * authenticated (Firebase Bearer token, or X-SBR-SECRET-KEY for service/cron
 * callers) — same contract as the other ingest routes (see
 * app/api/admin/ingest/route.ts). Previously this had no auth check at all.
 */
export async function POST(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  const auth = await verifyRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const body = await req.json().catch(() => ({}));
    const sheetId = body.sheetId || process.env.MASTER_SHEET_ID || MASTER_SHEET_ID_DEFAULT;

    const result = await syncMasterOwnerSheet(sheetId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Successfully synchronized ${result.count} active owner/inventory listings from Master Sheet into database & AI memory.`,
      spreadsheetId: sheetId,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  return NextResponse.json({
    success: true,
    endpoint: '/api/sync/master-sheet',
    defaultSheetId: MASTER_SHEET_ID_DEFAULT,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID_DEFAULT}/edit`,
    description: 'Synchronizes active owner inventory listings into single source of truth.',
  });
}
