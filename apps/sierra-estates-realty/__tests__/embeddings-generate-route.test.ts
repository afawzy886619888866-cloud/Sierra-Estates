/**
 * /api/internal/embeddings/generate — Phase 3 activation route (Sierra Estates 3.0).
 *
 * Contract under test:
 *  - buildEmbeddingContext: §21 no-fabrication — absent fields omitted
 *    entirely, price falls back to "Price on request", byte-identical to
 *    the builder in scripts/generate-supabase-embeddings.ts.
 *  - POST fails honestly (503) when the Gemini key or the service-role key
 *    is absent — never a zero vector, never fabricated coverage.
 *  - POST embeds exactly the pending ACTIVE rows (status='active' AND
 *    embedding_768 IS NULL, ordered by compound) and writes '[v1,v2,...]'
 *    pgvector strings via the admin client.
 *  - zero pending → complete:true, hasMore:false, zero embed calls.
 *  - per-row embed failure → counted in failed + failures[], others still
 *    processed.
 *  - rate-limit exhaustion → the batch stops early with rateLimited:true
 *    and retryAfterMs guidance.
 *  - batch is clamped to 1..40 (default 20).
 */
const embedQueryMock = jest.fn();
const geminiConfiguredMock = jest.fn(() => true);
const adminConfiguredMock = jest.fn(() => true);

const countState: { sequence: number[]; calls: number } = { sequence: [0], calls: 0 };
const fetchResult: { data: unknown[]; error: unknown } = { data: [], error: null };
const updateResult: { error: unknown } = { error: null };
const updateCalls: Array<{ payload: Record<string, unknown>; id: string }> = [];
const fetchSelects: Array<{ columns: string; chain: Record<string, jest.Mock> }> = [];

function makeChain(final: () => unknown) {
  const chain: Record<string, unknown> = {
    then: (resolve: unknown, reject: unknown) =>
      Promise.resolve()
        .then(() => final())
        .then(resolve as never, reject as never),
  };
  for (const method of ['is', 'order', 'limit', 'eq']) {
    chain[method] = jest.fn(() => chain);
  }
  return chain as any;
}

const adminMock = {
  from: jest.fn(() => {
    const countChain = makeChain(() => {
      countState.calls += 1;
      const idx = Math.min(countState.calls - 1, countState.sequence.length - 1);
      return { count: countState.sequence[idx], error: null };
    });
    const fetchChain = makeChain(() => ({ data: fetchResult.data, error: fetchResult.error }));
    const updateChain = makeChain(() => ({ error: updateResult.error }));
    return {
      select: jest.fn((columns: string, opts?: { count?: string }) => {
        if (opts?.count === 'exact') return countChain;
        fetchSelects.push({ columns, chain: fetchChain as unknown as Record<string, jest.Mock> });
        return fetchChain;
      }),
      update: jest.fn((payload: Record<string, unknown>) => ({
        eq: jest.fn((_: string, id: string) => {
          updateCalls.push({ payload, id });
          return updateChain;
        }),
      })),
    };
  }),
};

jest.mock('@sierra-estates/db', () => ({
  getSupabaseAdmin: () => adminMock,
  isSupabaseAdminConfigured: () => adminConfiguredMock(),
}));

jest.mock('@/lib/server/gemini-embeddings', () => ({
  embedQuery768: (...args: unknown[]) => embedQueryMock(...(args as [string])),
  isGeminiEmbeddingConfigured: () => geminiConfiguredMock(),
  GEMINI_EMBEDDING_MODEL: 'gemini-embedding-001',
  GEMINI_EMBEDDING_DIMENSIONS: 768,
}));

import { POST, GET, buildEmbeddingContext, parseRetryAfterMs } from '@/app/api/internal/embeddings/generate/route';

const postRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost:3000/api/internal/embeddings/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const FULL_LISTING = {
  id: 'id-1',
  ref_id: 'SE-RNT-HYD-0001',
  title: 'Garden Villa',
  compound: 'Hyde Park',
  property_type: 'Villa',
  deal_type: 'rent',
  price: 25000000,
  bedrooms: 4,
  bathrooms: 4,
  area_sqm: 300,
  finishing_type: 'Fully Finished',
  description: 'Lush garden corner.',
};

const SPARSE_LISTING = {
  id: 'id-2',
  ref_id: null,
  title: null,
  compound: null,
  property_type: null,
  deal_type: null,
  price: null,
  bedrooms: null,
  bathrooms: null,
  area_sqm: null,
  finishing_type: null,
  description: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  embedQueryMock.mockReset();
  embedQueryMock.mockResolvedValue([0.1, 0.2, 0.3]);
  geminiConfiguredMock.mockReturnValue(true);
  adminConfiguredMock.mockReturnValue(true);
  countState.sequence = [0];
  countState.calls = 0;
  fetchResult.data = [];
  fetchResult.error = null;
  updateResult.error = null;
  updateCalls.length = 0;
  fetchSelects.length = 0;
});

describe('buildEmbeddingContext — §21 no-fabrication', () => {
  it('builds the exact script-parity string for a fully populated row', () => {
    expect(buildEmbeddingContext(FULL_LISTING as never)).toBe(
      'Title: Garden Villa | Compound: Hyde Park | Type: Villa | Deal: rent | ' +
        'Price: 25,000,000 EGP | Bedrooms: 4 | Area: 300 sqm | ' +
        'Finishing: Fully Finished | Description: Lush garden corner.',
    );
  });

  it('omits absent fields entirely and falls back to Price on request', () => {
    expect(buildEmbeddingContext(SPARSE_LISTING as never)).toBe('Price: Price on request');
  });

  it('never invents compound/type/deal values for sparse rows', () => {
    const context = buildEmbeddingContext({ ...SPARSE_LISTING, title: 'Loft' } as never);
    expect(context).toBe('Title: Loft | Price: Price on request');
    expect(context).not.toMatch(/Compound:|Type:|Deal:|Bedrooms:|Area:|Finishing:/);
  });
});

describe('parseRetryAfterMs — truthful quota windows (§21)', () => {
  it('parses the human-form reset window Google actually sends', () => {
    expect(parseRetryAfterMs('429 … Please retry in 13h8m23.413328522s [{…}]')).toBe(
      13 * 3_600_000 + 8 * 60_000 + Math.round(23.413328522 * 1000),
    );
  });

  it('parses the RetryInfo retryDelay form', () => {
    expect(parseRetryAfterMs('…"retryDelay":"47303s"…')).toBe(47_303_000);
  });

  it('caps the window at 24h so a poisoned value cannot park a driver for days', () => {
    expect(parseRetryAfterMs('Please retry in 999h0m0s')).toBe(24 * 3_600_000);
  });

  it('returns null for unparseable messages (caller falls back to the 10s poll hint)', () => {
    expect(parseRetryAfterMs('429 RESOURCE_EXHAUSTED: quota exceeded')).toBeNull();
    expect(parseRetryAfterMs('')).toBeNull();
  });
});

describe('GET /api/internal/embeddings/generate — capability report', () => {
  it('reports configured flags and the pending count', async () => {
    countState.sequence = [15];
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.configured).toEqual({ geminiEmbeddings: true, supabaseAdmin: true });
    expect(body.pending).toBe(15);
    expect(body.model).toBe('gemini-embedding-001');
    expect(body.dimensions).toBe(768);
  });
});

describe('POST /api/internal/embeddings/generate — honest unavailability', () => {
  it('returns 503 with the exact gap when the Gemini key is absent', async () => {
    geminiConfiguredMock.mockReturnValue(false);
    const res = await POST(postRequest({ batch: 5 }));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.reason).toMatch(/GOOGLE_GENAI_API_KEY/);
    expect(embedQueryMock).not.toHaveBeenCalled();
  });

  it('returns 503 with the exact gap when the service-role key is absent', async () => {
    adminConfiguredMock.mockReturnValue(false);
    const res = await POST(postRequest({ batch: 5 }));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.reason).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

describe('POST /api/internal/embeddings/generate — batch processing', () => {
  it('reports complete with zero embed calls when nothing is pending', async () => {
    countState.sequence = [0];
    const res = await POST(postRequest({}));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, complete: true, processed: 0, remaining: 0, hasMore: false });
    expect(embedQueryMock).not.toHaveBeenCalled();
  });

  it('embeds pending rows and writes [v1,v2,...] pgvector strings', async () => {
    countState.sequence = [2, 0];
    fetchResult.data = [FULL_LISTING, { ...SPARSE_LISTING, title: 'Loft' }];
    const res = await POST(postRequest({ batch: 10 }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.processed).toBe(2);
    expect(body.remaining).toBe(0);
    expect(body.hasMore).toBe(false);
    expect(embedQueryMock).toHaveBeenCalledTimes(2);
    expect(embedQueryMock).toHaveBeenNthCalledWith(
      1,
      'Title: Garden Villa | Compound: Hyde Park | Type: Villa | Deal: rent | ' +
        'Price: 25,000,000 EGP | Bedrooms: 4 | Area: 300 sqm | ' +
        'Finishing: Fully Finished | Description: Lush garden corner.',
    );
    expect(embedQueryMock).toHaveBeenNthCalledWith(2, 'Title: Loft | Price: Price on request');
    // Row selection is status-scoped: archived rows are RPC-invisible dead weight.
    const fetchChain = fetchSelects[0]?.chain;
    expect(fetchChain?.eq).toHaveBeenCalledWith('status', 'active');
    expect(updateCalls).toHaveLength(2);
    expect(updateCalls[0].payload).toEqual({ embedding_768: '[0.1,0.2,0.3]' });
    expect(updateCalls[0].id).toBe('id-1');
  });

  it('counts per-row failures honestly and keeps processing the rest', async () => {
    countState.sequence = [2, 1];
    fetchResult.data = [FULL_LISTING, { ...SPARSE_LISTING, title: 'Loft' }];
    embedQueryMock.mockImplementation(async (text: string) => {
      if (text.includes('Garden Villa')) throw new Error('boom: API key not valid');
      return [0.5, 0.5];
    });
    const res = await POST(postRequest({}));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.processed).toBe(1);
    expect(body.failed).toBe(1);
    expect(body.failures[0]).toMatchObject({ id: 'id-1', reason: 'boom: API key not valid' });
    expect(body.remaining).toBe(1);
    expect(body.hasMore).toBe(true);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].id).toBe('id-2');
  });

  it('stops the batch early on rate-limit exhaustion with the server-stated window', async () => {
    countState.sequence = [2, 2];
    fetchResult.data = [FULL_LISTING, { ...SPARSE_LISTING, title: 'Loft' }];
    embedQueryMock.mockRejectedValue(
      new Error('429 Too Many Requests … Please retry in 13h8m23.413328522s'),
    );
    const res = await POST(postRequest({}));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.rateLimited).toBe(true);
    // The server's own window (13h8m23s ≈ 47,303,414ms), not the 10s default.
    expect(body.retryAfterMs).toBe(13 * 3_600_000 + 8 * 60_000 + 23_413);
    expect(body.processed).toBe(0);
    expect(body.remaining).toBe(2);
    // Rate-limited row retried once (backoff), then the batch stopped before row 2.
    expect(embedQueryMock).toHaveBeenCalledTimes(2);
    expect(updateCalls).toHaveLength(0);
  }, 15000);

  it('clamps batch to the 40-row maximum', async () => {
    countState.sequence = [2, 0];
    fetchResult.data = [FULL_LISTING];
    const res = await POST(postRequest({ batch: 999 }));
    expect(res.status).toBe(200);
    expect(fetchSelects[0]?.chain?.limit).toHaveBeenCalledWith(40);
  });
});
