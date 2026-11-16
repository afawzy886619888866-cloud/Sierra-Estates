/**
 * Regression tests for the 2026-11-12/13 inventory regression:
 * a transient PostgREST page error inside the 4-5 page sequential read
 * aborted the whole fetch, the (status-mismatched, dead) domain fallback
 * returned nothing, and the public map served source:'none' / 0 units for
 * minutes at a time on otherwise healthy deployments.
 *
 * The fix (same route file): per-page single retry, partial-data honesty
 * (complete:false), stale-serve of the last good read, and a live domain
 * fallback status filter.
 *
 * These tests pin the FIX by exercising the route module with a stubbed
 * @sierra-estates/db getSupabase client.
 */

// ── module under test, with its supabase dependency stubbed ────────────────
type PageResult = { data?: unknown[]; error?: { message: string } | null };

/** Builds a fake supabase client whose listings reads follow `pages`:
 *  pages[i] = { data } for a good page, or { error } to fail it. An array
 *  means per-attempt results: [attempt1, attempt2] — the retry path. */
function fakeSupabase(pages: Array<PageResult | PageResult[]>) {
  const calls: Array<{ from: number; attempt: number }> = [];
  const client = {
    from(table: string) {
      if (table === 'compounds') {
        return {
          select() {
            return Promise.resolve({ data: [], error: null });
          },
        };
      }
      // listings
      return {
        select() {
          const builder: Record<string, unknown> = {};
          let rangeFrom = 0;
          builder.eq = () => builder;
          builder.ilike = () => builder;
          builder.order = () => builder;
          builder.range = (from: number) => {
            rangeFrom = from;
            return builder;
          };
          builder.then = (
            resolve: (v: PageResult) => void,
            _reject: (e: unknown) => void,
          ) => {
            const attempt = calls.filter((c) => c.from === rangeFrom).length + 1;
            calls.push({ from: rangeFrom, attempt });
            const spec = pages[rangeFrom / 1000];
            const result =
              spec === undefined
                ? { data: [] } // beyond provided pages = short read
                : Array.isArray(spec)
                  ? spec[Math.min(attempt - 1, spec.length - 1)]
                  : spec;
            setTimeout(() => resolve(result), 1);
          };
          return builder;
        },
      };
    },
  };
  return { client, calls };
}

jest.mock('@sierra-estates/db', () => {
  let current: unknown = null;
  return {
    __setClient(c: unknown) {
      current = c;
    },
    getSupabase: () => current,
    getSupabaseAdmin: () => current,
    getRecord: jest.fn(),
    insertRecord: jest.fn(),
    listRecords: jest.fn(),
  };
});

/** Unit rows with UNIQUE codes per page (start offsets the id range) — the
 *  GET handler dedupes by code, so every page must carry distinct rows. */
function unitRow(id: string): Record<string, unknown> {
  return {
    id,
    code: `CODE-${id}`,
    title: `Unit ${id}`,
    status: 'active',
    publish_status: 'PUBLISHABLE',
    updated_at: '2026-11-13T00:00:00Z',
  };
}

const rows = (n: number, start = 0) =>
  Array.from({ length: n }, (_, i) => unitRow(`u${start + i}`));

describe('GET /api/inventory resilience (2026-11-13 regression)', () => {
  let route: typeof import('../app/api/inventory/route');
  let db: { __setClient(c: unknown): void };

  beforeAll(async () => {
    route = await import('../app/api/inventory/route');
    db = (await import('@sierra-estates/db')) as unknown as {
      __setClient(c: unknown): void;
    };
  });

  beforeEach(() => {
    // isolate per-test module state (the 60s in-memory cache)
    route.bustInventoryCache();
  });

  const get = () => route.GET(new Request('http://localhost/api/inventory'));

  it('serves full inventory when all pages succeed (baseline)', async () => {
    const { client } = fakeSupabase([
      { data: rows(1000) },
      { data: rows(1000, 1000) },
      { data: rows(5, 2000) },
    ]);
    db.__setClient(client);
    const body = await (await get()).json();
    expect(body.source).toBe('supabase');
    expect(body.count).toBe(2005);
    expect(body.complete).toBe(true);
  });

  it('retries a transient single-page error and still serves FULL inventory', async () => {
    // page 0 ok; page 1 fails once then succeeds; page 2 short-reads
    const { client, calls } = fakeSupabase([
      { data: rows(1000) },
      [{ error: { message: 'TypeError: fetch failed' } }, { data: rows(1000, 1000) }],
      { data: rows(3, 2000) },
    ]);
    db.__setClient(client);
    const body = await (await get()).json();
    expect(body.source).toBe('supabase');
    expect(body.count).toBe(2003);
    expect(body.complete).toBe(true);
    // page 1 was fetched exactly twice (the retry happened)
    expect(calls.filter((c) => c.from === 1000)).toHaveLength(2);
  });

  it('serves PARTIAL data (complete:false) when a later page fails twice', async () => {
    const { client } = fakeSupabase([
      { data: rows(1000) },
      [
        { error: { message: 'TypeError: fetch failed' } },
        { error: { message: 'TypeError: fetch failed' } },
      ],
    ]);
    db.__setClient(client);
    const body = await (await get()).json();
    expect(body.source).toBe('supabase');
    expect(body.count).toBe(1000);
    expect(body.complete).toBe(false);
  });

  it('stale-serves the last good read (complete:false) when a fresh read fails at page 0', async () => {
    // 1st request: full success → records the last-good payload
    const good = fakeSupabase([{ data: rows(1000) }, { data: rows(10, 1000) }]);
    db.__setClient(good.client);
    const first = await (await get()).json();
    expect(first.source).toBe('supabase');
    expect(first.count).toBe(1010);
    expect(first.complete).toBe(true);

    // advance perceived time past the 60s cache TTL (Date.now spy — real
    // timers stay live so the retry backoff sleep can actually elapse)
    const realNow = Date.now();
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(realNow + 61_000);
    try {
      // 2nd request: every page-0 attempt fails after retry
      const bad = fakeSupabase([
        [
          { error: { message: 'TypeError: fetch failed' } },
          { error: { message: 'TypeError: fetch failed' } },
        ],
      ]);
      db.__setClient(bad.client);
      const second = await (await get()).json();
      expect(second.source).toBe('supabase'); // not 'none'
      expect(second.count).toBe(1010); // the stale-but-verified rows
      expect(second.complete).toBe(false); // clearly marked degraded
    } finally {
      dateSpy.mockRestore();
    }
  });
});
