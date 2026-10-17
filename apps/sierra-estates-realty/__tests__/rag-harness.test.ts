/**
 * lib/server/rag-harness + /api/internal/run-harness — Phase 3 RAG
 * retrieval accuracy evaluation.
 *
 * Contract: benchmark queries run through the same embed→RPC path as
 * /api/internal/rag-search; compound hits are scored; an unconfigured stack
 * reports `configured: false` with the exact blocker (never fabricated
 * accuracy). The route composes the DeepSeek suite + the RAG report.
 */

const rpcMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  getSupabaseAdmin: () => ({ rpc: (...args: unknown[]) => rpcMock(...args) }),
  isSupabaseAdminConfigured: () => true,
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        embedContent: async () => ({
          embedding: { values: Array.from({ length: 768 }, (_, i) => (i % 5) / 5) },
        }),
      };
    }
  },
}));

import { runRagRetrievalHarness, RAG_BENCHMARK_QUERIES } from '../lib/server/rag-harness';
import { GET as runHarnessGET } from '@/app/api/internal/run-harness/route';

beforeEach(() => {
  rpcMock.mockReset();
  process.env.GOOGLE_GENAI_API_KEY = 'test-gemini-key';
});

afterEach(() => {
  delete process.env.GOOGLE_GENAI_API_KEY;
});

describe('runRagRetrievalHarness — live path', () => {
  it('scores compound hits across the benchmark queries', async () => {
    rpcMock.mockResolvedValue({
      data: [
        { compound: 'Hyde Park', similarity: 0.83 },
        { compound: 'Hyde Park', similarity: 0.79 },
      ],
      error: null,
    });

    const report = await runRagRetrievalHarness([RAG_BENCHMARK_QUERIES[0]]);
    expect(report.configured).toBe(true);
    expect(report.model).toBe('gemini-embedding-001');
    expect(report.scenarios).toHaveLength(1);
    expect(report.scenarios[0].passed).toBe(true);
    expect(report.scenarios[0].topCompound).toBe('Hyde Park');
    expect(report.scenarios[0].topSimilarity).toBeCloseTo(0.83);
    expect(report.accuracy).toBe(1);
  });

  it('fails a scenario whose expected compound never surfaces', async () => {
    rpcMock.mockResolvedValue({ data: [{ compound: 'Madinaty', similarity: 0.4 }], error: null });
    const report = await runRagRetrievalHarness([RAG_BENCHMARK_QUERIES[0]]);
    expect(report.scenarios[0].passed).toBe(false);
    expect(report.accuracy).toBe(0);
  });

  it('flags empty result sets with the embeddings generator hint', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    const report = await runRagRetrievalHarness([RAG_BENCHMARK_QUERIES[0]]);
    expect(report.scenarios[0].passed).toBe(false);
    expect(report.scenarios[0].note).toContain('generate-supabase-embeddings');
  });

  it('carries RPC errors into the scenario note without throwing', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'relation does not exist' } });
    const report = await runRagRetrievalHarness([RAG_BENCHMARK_QUERIES[0]]);
    expect(report.scenarios[0].passed).toBe(false);
    expect(report.scenarios[0].note).toContain('relation does not exist');
  });
});

describe('runRagRetrievalHarness — honest unavailability', () => {
  it('reports configured:false with the Gemini blocker and zero scenarios', async () => {
    delete process.env.GOOGLE_GENAI_API_KEY;
    const report = await runRagRetrievalHarness();
    expect(report.configured).toBe(false);
    expect(report.blocker).toContain('GOOGLE_GENAI_API_KEY');
    expect(report.scenarios).toEqual([]);
    expect(report.accuracy).toBe(0);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe('/api/internal/run-harness — composition', () => {
  it('returns the DeepSeek suite plus the RAG retrieval report', async () => {
    const res = await runHarnessGET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.report).toBeTruthy(); // DeepSeek benchmark suite
    expect(body.ragRetrieval).toBeTruthy();
    expect(body.ragRetrieval.configured).toBe(true);
    expect(Array.isArray(body.ragRetrieval.scenarios)).toBe(true);
    expect(body.executedAt).toBeTruthy();
  });
});
