/**
 * GET /api/admin/webhook-logs — inbound webhook ledger for the AI COO &
 * 10-Bot Operations Desk (/admin/bots).
 *
 * Reads public.webhook_logs (migration 037), written by the WhatsApp and
 * Telegram webhook routes via lib/server/webhook-log.ts. The desk also
 * subscribes to the table over Supabase Realtime; this endpoint provides the
 * authoritative initial window and filtered views.
 *
 *   ?source=whatsapp|telegram   — filter by provider
 *   ?status=processed|error|…   — filter by processing outcome
 *   ?limit=50                   — window size (1..200, newest first)
 */
import { NextRequest, NextResponse } from 'next/server';
import { listRecords } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCES = new Set(['whatsapp', 'telegram', 'other']);
const STATUSES = new Set(['received', 'processed', 'duplicate', 'rejected', 'error']);

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const params = new URL(req.url).searchParams;
    const source = params.get('source') ?? '';
    const status = params.get('status') ?? '';
    const limit = Math.min(
      Math.max(parseInt(params.get('limit') ?? '50', 10) || 50, 1),
      200,
    );

    const where: { column: string; value: unknown }[] = [];
    if (SOURCES.has(source)) where.push({ column: 'source', value: source });
    if (STATUSES.has(status)) where.push({ column: 'status', value: status });

    const rows = (await listRecords('webhook_logs', {
      select: 'id,source,eventType,externalId,payload,signatureValid,status,error,latencyMs,createdAt',
      where,
      limit,
      orderBy: { column: 'createdAt', ascending: false },
    })) as Record<string, unknown>[];

    return NextResponse.json({ rows });
  } catch (error) {
    logger.error('[ADMIN_WEBHOOK_LOGS_API_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to load webhook ledger.' },
      { status: 500 },
    );
  }
}
