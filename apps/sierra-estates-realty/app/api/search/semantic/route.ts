/**
 * POST /api/search/semantic
 *
 * Bilingual (Arabic + English) AI-powered property search.
 *
 * Request body:
 *   {
 *     "query": "3 bedroom apartment for rent in New Cairo under 50k EGP",
 *     "locale": "en",                  // "en" | "ar" (default: "en")
 *     "intentOverride": { ... },       // optional, for admin tooling
 *     "limit": 12,                     // 1-50 (default: 12)
 *     "offset": 0                      // pagination
 *   }
 *
 * Response:
 *   {
 *     "results": [SearchResult, ...],
 *     "intent": SearchIntent,          // what the AI extracted
 *     "extractionMethod": "ai" | "regex-fallback",
 *     "total": number,
 *     "query": string,
 *     "locale": "en" | "ar"
 *   }
 *
 * The AI extraction accepts Arabic, English, mixed, Arabizi, and Arabic
 * numerals. Falls back to a regex-based extractor if the AI service is
 * unavailable (no GOOGLE_AI_API_KEY set, or network error).
 */

import { NextResponse } from 'next/server';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { parseRequestBody, isParseFailure, semanticSearchSchema } from '@/lib/server/schemas';
import { semanticSearch } from '@/lib/server/search-service';
import { adminDb } from '@/lib/server/firebase-admin';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const parsed = await parseRequestBody(req, semanticSearchSchema);
    if (isParseFailure(parsed)) return parsed.errorResponse;

    const { query, intentOverride } = parsed.data;
    // Zod schema has defaults but z.infer marks them as optional — extract safely.
    const locale = parsed.data.locale ?? 'en';
    const limit = parsed.data.limit ?? 12;
    const offset = parsed.data.offset ?? 0;

    logger.info('[search] Semantic search:', { query, locale, limit, offset });

    const result = await semanticSearch({
      query,
      locale,
      intentOverride,
      limit,
      offset,
    });

    // Log the search query for analytics (fire-and-forget, non-blocking)
    try {
      const userAgent = req.headers.get('user-agent') ?? undefined;
      adminDb.collection('search_queries').add({
        query,
        locale,
        intent: result.intent,
        extractionMethod: result.extractionMethod,
        total: result.total,
        timestamp: new Date(),
        userAgent,
      }).catch(() => {
        // swallow — don't fail the search if logging fails
      });
    } catch {
      // swallow — analytics are best-effort
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    logger.error('[search] Semantic search failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/** GET /api/search/semantic — return API metadata (handy for health checks). */
export async function GET(req: Request) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  return NextResponse.json({
    success: true,
    endpoint: '/api/search/semantic',
    method: 'POST',
    description: 'Bilingual (Arabic + English) AI-powered property search for the Egyptian market.',
    examples: [
      '3 bedroom apartment for rent in New Cairo under 50k EGP',
      'شقة 3 غرف للإيجار في التجمع الخامس تحت ٥٠ ألف',
      'furnished studio Tagamoa monthly 20k',
      'فيلا مفروشة الشيخ زايد شهرية',
    ],
  });
}
