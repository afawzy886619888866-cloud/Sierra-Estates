import { NextResponse } from 'next/server';
import { DeepSeekHarness } from '@sierra-estates/deepseek-harness';
import { runRagRetrievalHarness } from '@/lib/server/rag-harness';

/**
 * POST/GET /api/internal/run-harness
 *
 * Sierra Estates 3.0 autonomous evaluation harness:
 *  - DeepSeek benchmark suite — NLP unit extraction (sc-easy-listing-scribe),
 *    price calibration / AVM (sc-cairo-avm, fx-gold parity) and RAG memory
 *    (sc-rag-memory) scenarios from packages/deepseek-harness.
 *  - Gemini vector RAG retrieval accuracy (Phase 3) — live
 *    gemini-embedding-001 + match_listings_gemini benchmark queries; an
 *    honest `configured: false` report is returned when credentials are
 *    absent rather than fabricated accuracy.
 */
export async function POST() {
  try {
    const harness = new DeepSeekHarness();
    const report = await harness.runFullSuite();
    const ragRetrieval = await runRagRetrievalHarness();

    return NextResponse.json({
      success: true,
      report,
      ragRetrieval,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
