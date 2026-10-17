/**
 * POST /api/internal/rag-search   (X-SBR-SECRET-KEY gated in production by proxy.ts)
 *
 * Sierra Estates 3.0 — Phase 3 semantic search over the Gemini vector RAG
 * memory:
 *
 *   query (Arabic or English, e.g. "شقة 3 غرف في هايد بارك بسعر مناسب للبيع")
 *     → gemini-embedding-001 (768 dims) vectorization
 *     → Supabase RPC match_listings_gemini(query_embedding, threshold, count)
 *     → top semantic matches with similarity score + unit metadata.
 *
 * GET reports the capability status honestly (Gemini key? Supabase admin?
 * RPC wired?) so operators can see exactly what is live.
 *
 * §21: without a Gemini key the route fails with 503 — it NEVER returns
 * fabricated matches or a zero-vector search.
 */
import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@sierra-estates/db';
import {
  embedQuery768,
  isGeminiEmbeddingConfigured,
  GEMINI_EMBEDDING_MODEL,
  GEMINI_EMBEDDING_DIMENSIONS,
  GeminiEmbeddingUnavailableError,
} from '@/lib/server/gemini-embeddings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MatchRow {
  id: string;
  ref_id: string | null;
  title: string | null;
  compound: string | null;
  price: number | null;
  bedrooms: number | null;
  area_sqm: number | null;
  deal_type: string | null;
  similarity: number;
}

const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_MATCH_COUNT = 10;
const MAX_MATCH_COUNT = 25;

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/internal/rag-search',
    method: 'POST',
    body: {
      query: 'string (Arabic or English natural-language property search)',
      matchThreshold: 'number 0..1 (default 0.5)',
      matchCount: 'number 1..25 (default 10)',
    },
    model: GEMINI_EMBEDDING_MODEL,
    dimensions: GEMINI_EMBEDDING_DIMENSIONS,
    rpc: 'match_listings_gemini',
    configured: {
      geminiEmbeddings: isGeminiEmbeddingConfigured(),
      supabaseAdmin: isSupabaseAdminConfigured(),
    },
    note: 'Both flags must be true for live semantic search; failures return 503, never fabricated matches.',
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  if (!query) {
    return NextResponse.json(
      { error: 'Missing `query` (Arabic or English natural-language property search)' },
      { status: 400 },
    );
  }
  const matchThreshold = clampNumber(body?.matchThreshold, DEFAULT_THRESHOLD, 0, 1);
  const matchCount = clampNumber(body?.matchCount, DEFAULT_MATCH_COUNT, 1, MAX_MATCH_COUNT);

  // 1. Vectorize the query — explicit failure when Gemini is not configured.
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedQuery768(query);
  } catch (err) {
    const isConfig = err instanceof GeminiEmbeddingUnavailableError && /not configured/.test(err.message);
    return NextResponse.json(
      {
        error: 'Semantic search unavailable',
        reason: (err as Error)?.message,
        hint: isConfig
          ? 'Set GOOGLE_GENAI_API_KEY (or GEMINI_API_KEY / GOOGLE_AI_API_KEY) to enable gemini-embedding-001 query vectorization.'
          : undefined,
      },
      { status: 503 },
    );
  }

  // 2. Vector match through the canonical RPC.
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error: 'Semantic search unavailable',
        reason: 'SUPABASE_SERVICE_ROLE_KEY is not configured — cannot call match_listings_gemini.',
      },
      { status: 503 },
    );
  }

  try {
    const { data, error } = await getSupabaseAdmin().rpc('match_listings_gemini', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });
    if (error) {
      return NextResponse.json(
        { error: 'Vector search RPC failed', reason: error.message },
        { status: 502 },
      );
    }
    const rows = (Array.isArray(data) ? data : []) as MatchRow[];
    return NextResponse.json({
      ok: true,
      query,
      model: GEMINI_EMBEDDING_MODEL,
      dimensions: GEMINI_EMBEDDING_DIMENSIONS,
      matchThreshold,
      matchCount,
      count: rows.length,
      matches: rows.map((row) => ({
        id: row.id,
        refId: row.ref_id,
        title: row.title,
        compound: row.compound,
        price: row.price,
        bedrooms: row.bedrooms,
        areaSqm: row.area_sqm,
        dealType: row.deal_type,
        similarity: Number(Number(row.similarity).toFixed(4)),
      })),
      searchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Vector search failed', reason: (err as Error)?.message },
      { status: 500 },
    );
  }
}
