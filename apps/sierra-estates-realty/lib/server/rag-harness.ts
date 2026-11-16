import 'server-only';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@sierra-estates/db';
import {
  embedQuery768,
  isGeminiEmbeddingConfigured,
  GEMINI_EMBEDDING_MODEL,
} from '@/lib/server/gemini-embeddings';

/**
 * SIERRA ESTATES 3.0 — RAG RETRIEVAL EVALUATION HARNESS (Phase 3)
 *
 * Benchmark scenarios for the autonomous evaluation harness
 * (/api/internal/run-harness): Arabic + English buyer-intent queries are
 * embedded with gemini-embedding-001 and matched against
 * match_listings_gemini; a scenario passes when the expected compound (or a
 * semantically close one) surfaces in the top results with a healthy
 * similarity score.
 *
 * §21 honesty: when Gemini or the Supabase admin client is not configured
 * the harness reports `configured: false` with the exact blocker — it never
 * fabricates retrieval accuracy.
 */

export interface RagHarnessQuery {
  id: string;
  query: string;
  /** Compound (case-insensitive substring) expected in the top matches. */
  expectedCompound: string;
}

export const RAG_BENCHMARK_QUERIES: RagHarnessQuery[] = [
  {
    id: 'rag-ar-hyde-park-sale',
    query: 'شقة 3 غرف في هايد بارك بسعر مناسب للبيع',
    expectedCompound: 'hyde park',
  },
  {
    id: 'rag-en-mountain-view-rent',
    query: 'villa for rent in Mountain View New Cairo with private garden',
    expectedCompound: 'mountain view',
  },
  {
    id: 'rag-ar-mivida-rent',
    query: 'تاون هاوس مفروش للإيجار في ميفيدا التجمع',
    expectedCompound: 'mivida',
  },
  {
    id: 'rag-en-uptown-penthouse',
    query: 'luxury penthouse for sale in Uptown Cairo with panoramic view',
    expectedCompound: 'uptown',
  },
];

export interface RagScenarioResult {
  id: string;
  query: string;
  expectedCompound: string;
  passed: boolean;
  topCompound: string | null;
  topSimilarity: number | null;
  matchCount: number;
  note?: string;
}

export interface RagHarnessReport {
  configured: boolean;
  blocker?: string;
  model: string;
  scenarios: RagScenarioResult[];
  passedCount: number;
  accuracy: number;
  ranAt: string;
}

interface MatchRow {
  compound: string | null;
  similarity: number;
}

/**
 * Run the RAG retrieval benchmark against the live vector store. When the
 * stack is not configured, returns an honest unconfigured report.
 */
export async function runRagRetrievalHarness(
  queries: RagHarnessQuery[] = RAG_BENCHMARK_QUERIES,
): Promise<RagHarnessReport> {
  const ranAt = new Date().toISOString();
  const base = { configured: false, model: GEMINI_EMBEDDING_MODEL, scenarios: [], passedCount: 0, accuracy: 0, ranAt };

  if (!isGeminiEmbeddingConfigured()) {
    return {
      ...base,
      blocker: 'GOOGLE_GENAI_API_KEY (or GEMINI_API_KEY / GOOGLE_AI_API_KEY) is not configured — query vectorization impossible.',
    };
  }
  if (!isSupabaseAdminConfigured()) {
    return {
      ...base,
      blocker: 'SUPABASE_SERVICE_ROLE_KEY is not configured — match_listings_gemini unreachable.',
    };
  }

  const scenarios: RagScenarioResult[] = [];
  for (const scenario of queries) {
    try {
      const embedding = await embedQuery768(scenario.query);
      const { data, error } = await getSupabaseAdmin().rpc('match_listings_gemini', {
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: 5,
      });
      if (error) throw new Error(error.message);
      const rows = (Array.isArray(data) ? data : []) as MatchRow[];
      const topCompound = rows[0]?.compound ?? null;
      const topSimilarity = rows[0] ? Number(Number(rows[0].similarity).toFixed(4)) : null;
      const passed =
        rows.length > 0 &&
        rows.some((row) => String(row.compound ?? '').toLowerCase().includes(scenario.expectedCompound));
      scenarios.push({
        id: scenario.id,
        query: scenario.query,
        expectedCompound: scenario.expectedCompound,
        passed,
        topCompound,
        topSimilarity,
        matchCount: rows.length,
        ...(rows.length === 0 ? { note: 'No vectors above threshold — run scripts/generate-supabase-embeddings.ts.' } : {}),
      });
    } catch (err) {
      scenarios.push({
        id: scenario.id,
        query: scenario.query,
        expectedCompound: scenario.expectedCompound,
        passed: false,
        topCompound: null,
        topSimilarity: null,
        matchCount: 0,
        note: (err as Error)?.message,
      });
    }
  }

  const passedCount = scenarios.filter((s) => s.passed).length;
  return {
    configured: true,
    model: GEMINI_EMBEDDING_MODEL,
    scenarios,
    passedCount,
    accuracy: scenarios.length > 0 ? Number((passedCount / scenarios.length).toFixed(4)) : 0,
    ranAt,
  };
}
