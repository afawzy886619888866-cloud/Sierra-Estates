/**
 * GET /api/admin/raw-feed — the raw scrape data inspector for the AI COO &
 * 10-Bot Operations Desk (/admin/bots).
 *
 * Reads public.raw_feed: inbound broker signals captured by the WhatsApp
 * scraper, with their Scribe extraction state (extracted_data / is_reviewed).
 *
 *   ?limit=30 (1..100, newest first)
 *   ?unreviewed=true — only rows the Scribe still has to process
 */
import { NextRequest, NextResponse } from 'next/server';
import { listRecords } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const params = new URL(req.url).searchParams;
    const limit = Math.min(
      Math.max(parseInt(params.get('limit') ?? '30', 10) || 30, 1),
      100,
    );
    const unreviewed = params.get('unreviewed') === 'true';

    const rows = (await listRecords('raw_feed', {
      select: 'id,rawText,sourceChannel,senderPhone,extractedData,isReviewed,createdAt',
      where: unreviewed ? [{ column: 'isReviewed', value: false }] : [],
      limit,
      orderBy: { column: 'createdAt', ascending: false },
    })) as Record<string, unknown>[];

    return NextResponse.json({
      rows,
      unreviewed: rows.filter((row) => row.isReviewed !== true).length,
    });
  } catch (error) {
    logger.error('[ADMIN_RAW_FEED_API_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to load raw feed.' },
      { status: 500 },
    );
  }
}
