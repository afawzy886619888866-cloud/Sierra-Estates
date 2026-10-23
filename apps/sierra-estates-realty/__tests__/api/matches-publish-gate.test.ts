/**
 * POST /api/matches — PUBLISH GATE (activation plan Phase D).
 *
 * Public unauthenticated scoring endpoint. It used to `listRecords('listings')`
 * with NO where clause at all — pulling ~9.7k archived rows plus every
 * unverified public submission into the scoring pool, then filtering status
 * in memory. Unverified-but-active rows (public submissions land as
 * publish_status = 'REVIEW_REQUIRED') could therefore be matched and shown
 * to the public. The query itself must now filter BOTH on-market statuses
 * AND publish_status = 'PUBLISHABLE' inside the SQL.
 */
const listRecordsMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  listRecords: (...args: unknown[]) => listRecordsMock(...args),
  getRecord: jest.fn(async () => null),
  insertRecord: jest.fn(async () => ({ id: 'demo' })),
}));

import { POST } from '@/app/api/matches/route';

const validBody = { budget: 500_000, beds: 3, type: 'Villa', mode: 'sale' as const };

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/matches — publish gate (Phase D)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listRecordsMock.mockResolvedValue([]);
  });

  it('filters status AND publish_status inside the query (not in memory)', async () => {
    const res = await post(validBody);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);

    expect(listRecordsMock).toHaveBeenCalledTimes(1);
    const [table, options] = listRecordsMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(table).toBe('listings');
    expect(options.where).toEqual([
      // On-market statuses only — the live table buries ~9.7k archived rows.
      { column: 'status', op: 'in', value: ['active', 'available'] },
      // PUBLISH GATE (Phase D): unverified rows must never reach a public
      // match response regardless of their status.
      { column: 'publish_status', op: 'eq', value: 'PUBLISHABLE' },
    ]);
    expect(options.limit).toBe(500);
  });

  it('returns an honest empty result set when the gated query finds nothing', async () => {
    listRecordsMock.mockResolvedValue([]);

    const res = await post(validBody);
    expect(res.status).toBe(200);
    const results = await res.json();
    expect(results).toEqual([]);
  });

  it('scores only gated rows when the query returns publishable inventory', async () => {
    listRecordsMock.mockResolvedValue([
      {
        id: 'match-1',
        code: 'MATCH-1',
        title: 'Villa in Hyde Park',
        compound: 'Hyde Park',
        propertyType: 'Villa',
        dealType: 'sale',
        price: 15_000_000,
        bedrooms: 4,
        bathrooms: 4,
        areaSqm: 300,
        status: 'active',
        aiScore: 8.5,
        description: 'Gated villa',
      },
    ]);

    const res = await post({ ...validBody, budget: 300_000, beds: 3, type: 'Villa' });
    expect(res.status).toBe(200);
    const results = await res.json();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(3);
    for (const r of results) {
      expect(Number.isFinite(r.score)).toBe(true);
    }
  });
});
