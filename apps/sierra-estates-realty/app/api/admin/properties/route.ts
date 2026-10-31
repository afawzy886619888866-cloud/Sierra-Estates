/**
 * /api/admin/properties — Inventory & Freshness Control for the Unified
 * Admin Command Center (/admin/properties).
 *
 * GET (staff) — paginated inventory window with the command-center status
 *               buckets and freshness summary. Reads public.listings through
 *               the records layer; only the light columns are selected
 *               (never the pgvector embeddings or photo arrays).
 *
 * The console's status vocabulary maps the spec's verified / stale / sold
 * toggles onto the real production model — see lib/server/inventory-buckets.ts.
 *
 * Writes (verify / mark-stale / mark-sold / se_code edits) live in
 * app/api/admin/properties/[id]/route.ts; the bulk freshness recompute lives
 * in app/api/admin/properties/refresh-freshness/route.ts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { listRecords } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';
import {
  bucketFor,
  isInventoryBucket,
  type InventoryBucket,
} from '@/lib/server/inventory-buckets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Columns the console table renders — nothing heavier crosses the wire. */
const SELECT_COLUMNS =
  'id,seCode,code,referenceCode,title,compound,developer,propertyType,dealType,' +
  'price,priceCurrency,bedrooms,bathrooms,areaSqm,status,publishStatus,verified,' +
  'publishToClient,stale,freshnessScore,img,agent,tag,updatedAt,createdAt';

/** Fallback projection for databases that have not applied migration 037 yet. */
const SELECT_COLUMNS_PRE_MIGRATION =
  'id,code,referenceCode,title,compound,developer,propertyType,dealType,' +
  'price,priceCurrency,bedrooms,bathrooms,areaSqm,status,publishStatus,verified,' +
  'publishToClient,stale,img,agent,tag,updatedAt,createdAt';

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const params = new URL(req.url).searchParams;
    const bucketParam = params.get('bucket') ?? 'all';
    const bucket: InventoryBucket = isInventoryBucket(bucketParam) ? bucketParam : 'all';
    const compound = (params.get('compound') ?? '').trim();
    const q = (params.get('q') ?? '').trim().toLowerCase();
    const minFreshness = parseInt(params.get('minFreshness') ?? '', 10);
    const limit = Math.min(
      Math.max(parseInt(params.get('limit') ?? '300', 10) || 300, 1),
      1000,
    );
    const order = params.get('order') ?? 'updated';

    const where: { column: string; op?: 'eq' | 'gte' | 'lte' | 'ilike'; value: unknown }[] = [];
    if (compound) where.push({ column: 'compound', op: 'ilike', value: `%${compound}%` });

    // Pre-migration degrade: before 037 lands, se_code / freshness_score do
    // not exist — retry without them so the console stays usable (scores read
    // as unknown; the console prompts the operator to dispatch 037).
    let migrationPending = false;
    let rows: Record<string, unknown>[];

    try {
      rows = (await listRecords('listings', {
        select: SELECT_COLUMNS,
        where: Number.isFinite(minFreshness)
          ? [...where, { column: 'freshnessScore', op: 'gte' as const, value: minFreshness }]
          : where,
        limit: order === 'freshness' ? 2000 : limit,
        orderBy:
          order === 'freshness'
            ? { column: 'freshnessScore', ascending: true }
            : order === 'price'
              ? { column: 'price', ascending: false }
              : { column: 'updatedAt', ascending: false },
      })) as Record<string, unknown>[];
    } catch (err) {
      const message = String(err instanceof Error ? err.message : err);
      if (!/se_code|freshness_score|seCode|freshnessScore/i.test(message)) {
        throw err;
      }
      migrationPending = true;
      rows = (await listRecords('listings', {
        select: SELECT_COLUMNS_PRE_MIGRATION,
        where,
        limit: order === 'freshness' ? 2000 : limit,
        orderBy:
          order === 'price'
            ? { column: 'price', ascending: false }
            : { column: 'updatedAt', ascending: order === 'freshness' },
      })) as Record<string, unknown>[];
    }

    // Bucket + free-text filters run post-read (the stale bucket is an OR of
    // two columns, which the AND-only records layer cannot express).
    let filtered = rows;
    if (bucket !== 'all') {
      filtered = filtered.filter((row) => bucketFor(row) === bucket);
    }
    if (q) {
      filtered = filtered.filter((row) =>
        [
          row.title,
          row.compound,
          row.seCode,
          row.code,
          row.referenceCode,
          row.agent,
          row.developer,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      );
    }
    if (order === 'freshness') filtered = filtered.slice(0, limit);

    // Honest summary stats over the fetched window.
    const counts: Record<InventoryBucket, number> = {
      verified: 0,
      stale: 0,
      sold: 0,
      pending: 0,
      all: rows.length,
    };
    let freshnessSum = 0;
    let freshnessCount = 0;
    let freshOver90 = 0;
    for (const row of rows) {
      counts[bucketFor(row)] += 1;
      const score = row.freshnessScore;
      if (typeof score === 'number' && Number.isFinite(score)) {
        freshnessSum += score;
        freshnessCount += 1;
        if (score >= 90) freshOver90 += 1;
      }
    }

    const compounds = [
      ...new Set(rows.map((row) => (row.compound ? String(row.compound) : '')).filter(Boolean)),
    ].sort();

    return NextResponse.json({
      rows: filtered.map((row) => ({
        ...row,
        bucket: bucketFor(row),
        price: num(row.price),
      })),
      summary: {
        counts,
        avgFreshness: freshnessCount ? Math.round(freshnessSum / freshnessCount) : 0,
        freshOver90,
        compounds,
        windowSize: rows.length,
        ...(migrationPending ? { migrationPending: true } : {}),
      },
    });
  } catch (error) {
    logger.error('[ADMIN_PROPERTIES_API_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to load inventory.' },
      { status: 500 },
    );
  }
}
