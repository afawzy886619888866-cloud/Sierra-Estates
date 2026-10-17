/**
 * POST /api/internal/embeddings/generate   (X-SBR-SECRET-KEY gated in production by proxy.ts)
 *
 * Sierra Estates 3.0 — Phase 3 activation: server-side batch regeneration of
 * listings.embedding_768 (gemini-embedding-001, 768 dimensions).
 *
 * Mirrors scripts/generate-supabase-embeddings.ts EXACTLY where it matters
 * for vector-space parity — the same semantic string (§21 no-fabrication:
 * only fields the row actually states, absent fields omitted entirely), the
 * same model + outputDimensionality: 768 — so vectors written via this
 * route live in the same space as the script's and the
 * match_listings_gemini cosine RPC stays meaningful across both producers.
 *
 * Row-selection policy (deliberate divergence from the script): ONLY
 * status='active' rows are embedded. match_listings_gemini filters
 * `listings.status = 'active'`, so vectors on any other status are dead
 * weight the RPC can never see — embedding them burns Gemini quota for
 * zero retrievable memory. A row whose status later flips to active keeps
 * its (same-builder) vector and becomes searchable immediately.
 *
 * Why a route at all: operators egressing from Gemini-unsupported regions
 * cannot run the local script (generativelanguage.googleapis.com geo-blocks
 * them), while the Vercel deployment egresses from a supported region. The
 * route is idempotent — only rows with embedding_768 IS NULL are processed —
 * so re-driving it after any interruption never double-embeds a listing.
 *
 * Body:   { batch?: number } — default 20, max 40. One invocation must fit
 * the platform function timeout (each embedding round-trip is ~0.5–1s and
 * there is no artificial pacing server-side — the CALLER paces between
 * invocations).
 *
 * Response: { ok, processed, failed, remaining, hasMore, ... } — the caller
 * loops while hasMore. Failures are per-row and reported, never swallowed;
 * rate-limit exhaustion stops the batch early with retryAfterMs instead of
 * burning retries against a quota that will not reset inside the timeout.
 *
 * §21: nothing here fabricates coverage — if the Gemini key is absent the
 * route returns 503 with the exact gap, never a zero vector, and never a
 * "processed" count that did not actually land in Supabase.
 */
import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@sierra-estates/db';
import {
  embedQuery768,
  isGeminiEmbeddingConfigured,
  GEMINI_EMBEDDING_MODEL,
  GEMINI_EMBEDDING_DIMENSIONS,
} from '@/lib/server/gemini-embeddings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 60s platform budget (Hobby ceiling): one batch must complete embeds + writes
// inside a single invocation. Batch 40 ≈ 35-50s worst case; the caller's
// adaptive driver shrinks the batch if a 504 ever proves the budget tighter.
export const maxDuration = 60;

const DEFAULT_BATCH = 20;
const MAX_BATCH = 40;
const RATE_LIMIT_BACKOFF_MS = 2500;
const RATE_LIMIT_RETRY_AFTER_MS = 10_000;

/** Column list identical to the script (bathrooms is selected, context omits it). */
const SELECT_COLUMNS =
  'id, ref_id, title, compound, property_type, deal_type, price, bedrooms, bathrooms, area_sqm, finishing_type, description';

interface PendingListing {
  id: string;
  ref_id: string | null;
  title: string | null;
  compound: string | null;
  property_type: string | null;
  deal_type: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  finishing_type: string | null;
  description: string | null;
}

function clampBatch(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_BATCH;
  return Math.min(MAX_BATCH, Math.max(1, Math.trunc(n)));
}

function isRateLimitError(err: unknown): boolean {
  const message = (err as Error | undefined)?.message ?? '';
  return /429|quota|resource.?exhausted|rate.?limit/i.test(message);
}

/**
 * Google's 429 body carries the real reset window, e.g.
 * "Please retry in 13h8m23.413328522s" and RetryInfo "retryDelay":"47303s".
 * Surfacing it keeps operator tooling truthful — a 10s hint against a 13h
 * quota wall is a lie by omission (§21). Returns null when unparseable.
 */
export function parseRetryAfterMs(message: string): number | null {
  const human = /Please retry in (?:(\d+)\s*h)?(?:(\d+)\s*m)?([\d.]+)?\s*s/i.exec(message);
  if (human) {
    const hours = Number(human[1] ?? 0) * 3_600_000;
    const minutes = Number(human[2] ?? 0) * 60_000;
    const seconds = Math.round(Number(human[3] ?? 0) * 1000);
    const total = hours + minutes + seconds;
    if (total > 0) return Math.min(total, 24 * 3_600_000);
  }
  const retryInfo = /retryDelay"?:\s*"?(\d+)\s*"?s/i.exec(message);
  if (retryInfo) {
    const total = Number(retryInfo[1]) * 1000;
    if (total > 0) return Math.min(total, 24 * 3_600_000);
  }
  return null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * §21 no-fabrication: byte-identical to the context builder in
 * scripts/generate-supabase-embeddings.ts — absent fields are omitted
 * entirely, never filled with invented values that would poison semantic
 * search. Exported for tests.
 */
export function buildEmbeddingContext(listing: PendingListing): string {
  return [
    listing.title ? `Title: ${listing.title}` : null,
    listing.compound ? `Compound: ${listing.compound}` : null,
    listing.property_type ? `Type: ${listing.property_type}` : null,
    listing.deal_type ? `Deal: ${listing.deal_type}` : null,
    `Price: ${
      listing.price ? `${Number(listing.price).toLocaleString()} EGP` : 'Price on request'
    }`,
    listing.bedrooms ? `Bedrooms: ${listing.bedrooms}` : null,
    listing.area_sqm ? `Area: ${listing.area_sqm} sqm` : null,
    listing.finishing_type ? `Finishing: ${listing.finishing_type}` : null,
    listing.description ? `Description: ${listing.description}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
}

/** Count ACTIVE listings still missing embedding_768 (head-only, cheap, read-only). */
async function countPending(
  admin: ReturnType<typeof getSupabaseAdmin>,
): Promise<{ ok: true; count: number } | { ok: false; reason: string }> {
  const { count, error } = await admin
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .is('embedding_768', null);
  if (error) return { ok: false, reason: error.message };
  return { ok: true, count: count ?? 0 };
}

export async function GET() {
  const configured = {
    geminiEmbeddings: isGeminiEmbeddingConfigured(),
    supabaseAdmin: isSupabaseAdminConfigured(),
  };
  let pending: number | null = null;
  let pendingError: string | null = null;
  if (configured.supabaseAdmin) {
    const result = await countPending(getSupabaseAdmin());
    if (result.ok) pending = result.count;
    else pendingError = result.reason;
  }
  return NextResponse.json({
    endpoint: '/api/internal/embeddings/generate',
    method: 'POST',
    body: { batch: `number 1..${MAX_BATCH} (default ${DEFAULT_BATCH})` },
    model: GEMINI_EMBEDDING_MODEL,
    dimensions: GEMINI_EMBEDDING_DIMENSIONS,
    configured,
    pending,
    ...(pendingError ? { pendingError } : {}),
    note: 'Idempotent: only ACTIVE listings with embedding_768 IS NULL are embedded (match_listings_gemini filters status=active — other statuses are dead weight). Loop while hasMore. Context builder mirrors scripts/generate-supabase-embeddings.ts byte-for-byte.',
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const batch = clampBatch(body?.batch);

  if (!isGeminiEmbeddingConfigured()) {
    return NextResponse.json(
      {
        error: 'Embedding generation unavailable',
        reason:
          'GOOGLE_GENAI_API_KEY (or GEMINI_API_KEY / GOOGLE_AI_API_KEY) is not configured — no fallback vectorizer exists (§21).',
      },
      { status: 503 },
    );
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error: 'Embedding generation unavailable',
        reason: 'SUPABASE_SERVICE_ROLE_KEY is not configured — cannot write embeddings.',
      },
      { status: 503 },
    );
  }

  const admin = getSupabaseAdmin();

  const pendingBefore = await countPending(admin);
  if (!pendingBefore.ok) {
    return NextResponse.json(
      { error: 'Pending-count query failed', reason: pendingBefore.reason },
      { status: 502 },
    );
  }
  if (pendingBefore.count === 0) {
    return NextResponse.json({
      ok: true,
      complete: true,
      processed: 0,
      failed: 0,
      remaining: 0,
      hasMore: false,
      model: GEMINI_EMBEDDING_MODEL,
      dimensions: GEMINI_EMBEDDING_DIMENSIONS,
      generatedAt: new Date().toISOString(),
    });
  }

  const { data: listings, error: fetchError } = await admin
    .from('listings')
    .select(SELECT_COLUMNS)
    .eq('status', 'active')
    .is('embedding_768', null)
    .order('compound', { ascending: true, nullsFirst: false })
    .limit(batch);
  if (fetchError) {
    return NextResponse.json(
      { error: 'Listing fetch failed', reason: fetchError.message },
      { status: 502 },
    );
  }
  const rows = (Array.isArray(listings) ? listings : []) as PendingListing[];

  let processed = 0;
  let failed = 0;
  let rateLimited = false;
  let rateLimitMessage: string | null = null;
  const failures: Array<{ id: string; reason: string }> = [];

  for (const listing of rows) {
    if (rateLimited) break;
    try {
      const contextText = buildEmbeddingContext(listing);
      let embedding: number[];
      try {
        embedding = await embedQuery768(contextText);
      } catch (err) {
        if (isRateLimitError(err)) {
          await sleep(RATE_LIMIT_BACKOFF_MS);
          embedding = await embedQuery768(contextText);
        } else {
          throw err;
        }
      }
      const { error: updateError } = await admin
        .from('listings')
        .update({ embedding_768: `[${embedding.join(',')}]` })
        .eq('id', listing.id);
      if (updateError) {
        failed += 1;
        failures.push({ id: listing.id, reason: updateError.message });
      } else {
        processed += 1;
      }
    } catch (err) {
      failed += 1;
      failures.push({ id: listing.id, reason: (err as Error)?.message ?? 'unknown error' });
      if (isRateLimitError(err)) {
        rateLimited = true;
        rateLimitMessage = (err as Error)?.message ?? '';
      }
    }
  }

  // Honest remaining recount — reflects concurrent writers, not arithmetic.
  const pendingAfter = await countPending(admin);
  const remaining = pendingAfter.ok ? pendingAfter.count : pendingBefore.count - processed;

  return NextResponse.json({
    ok: true,
    model: GEMINI_EMBEDDING_MODEL,
    dimensions: GEMINI_EMBEDDING_DIMENSIONS,
    requested: rows.length,
    processed,
    failed,
    ...(failures.length > 0 ? { failures: failures.slice(0, 10) } : {}),
    ...(rateLimited
      ? {
          rateLimited: true,
          // The server's own reset window when Google states it (e.g. 13h),
          // otherwise a conservative 10s poll hint.
          retryAfterMs: parseRetryAfterMs(rateLimitMessage ?? '') ?? RATE_LIMIT_RETRY_AFTER_MS,
        }
      : {}),
    remaining,
    hasMore: remaining > 0,
    generatedAt: new Date().toISOString(),
  });
}
