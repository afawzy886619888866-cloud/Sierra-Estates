/**
 * /api/internal/rag-search — Gemini vector RAG semantic search route
 * (Sierra Estates 3.0, Phase 3).
 *
 * Contract under test:
 *  - POST embeds the query (gemini-embedding-001 @ 768) and calls the
 *    match_listings_gemini Supabase RPC, returning scored matches;
 *  - missing query → 400;
 *  - no Gemini key → 503 with the exact blocker (never fabricated matches);
 *  - no Supabase admin → 503;
 *  - GET reports honest capability status.
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
          embedding: { values: Array.from({ length: 768 }, (_, i) => (i % 7) / 7) },
        }),
      };
    }
  },
}));

import { GET, POST } from '@/app/api/internal/rag-search/route';

const request = (body: unknown) =>
  new Request('http://localhost:3000/api/internal/rag-search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  rpcMock.mockReset();
  process.env.GOOGLE_GENAI_API_KEY = 'test-gemini-key';
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;
});

afterEach(() => {
  delete process.env.GOOGLE_GENAI_API_KEY;
});

describe('GET /api/internal/rag-search — capability status', () => {
  it('reports model, dimensions and honest configuration flags', async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.model).toBe('gemini-embedding-001');
    expect(body.dimensions).toBe(768);
    expect(body.rpc).toBe('match_listings_gemini');
    expect(body.configured.geminiEmbeddings).toBe(true);
    expect(body.configured.supabaseAdmin).toBe(true);
  });
});

describe('POST /api/internal/rag-search — validation', () => {
  it('rejects a missing query with 400', async () => {
    const res = await POST(request({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('query');
  });

  it('rejects an empty/whitespace query with 400', async () => {
    const res = await POST(request({ query: '   ' }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/internal/rag-search — semantic retrieval', () => {
  it('embeds the query and returns scored matches with metadata', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: 'l-1',
          ref_id: 'SE-SL-HYD-0014',
          title: 'Hyde Park apartment',
          compound: 'Hyde Park',
          price: 9000000,
          bedrooms: 3,
          area_sqm: 165,
          deal_type: 'sale',
          similarity: 0.87123,
        },
      ],
      error: null,
    });

    const res = await POST(request({ query: 'شقة 3 غرف في هايد بارك بسعر مناسب للبيع' }));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.model).toBe('gemini-embedding-001');
    expect(body.dimensions).toBe(768);
    expect(body.count).toBe(1);
    expect(body.matches[0]).toMatchObject({
      refId: 'SE-SL-HYD-0014',
      compound: 'Hyde Park',
      dealType: 'sale',
      similarity: 0.8712,
    });

    // The RPC must have been called with a 768-dim vector + defaults.
    expect(rpcMock).toHaveBeenCalledWith('match_listings_gemini', {
      query_embedding: expect.any(Array),
      match_threshold: 0.5,
      match_count: 10,
    });
    const embeddingArg = rpcMock.mock.calls[0][1].query_embedding as number[];
    expect(embeddingArg).toHaveLength(768);
  });

  it('clamps caller-supplied threshold and count into safe ranges', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await POST(request({ query: 'villa', matchThreshold: 42, matchCount: -5 }));
    expect(rpcMock).toHaveBeenCalledWith('match_listings_gemini', {
      query_embedding: expect.any(Array),
      match_threshold: 1,
      match_count: 1,
    });
  });

  it('maps an RPC error to 502 with the reason', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'function public.match_listings_gemini does not exist' } });
    const res = await POST(request({ query: 'شقة' }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.reason).toContain('match_listings_gemini');
  });
});

describe('POST /api/internal/rag-search — honest unavailability', () => {
  it('returns 503 (never fabricated matches) when the Gemini key is absent', async () => {
    delete process.env.GOOGLE_GENAI_API_KEY;
    const res = await POST(request({ query: 'شقة في ميفيدا' }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('Semantic search unavailable');
    expect(body.hint).toContain('GOOGLE_GENAI_API_KEY');
    expect(rpcMock).not.toHaveBeenCalled();
    expect(body.matches).toBeUndefined();
  });
});
