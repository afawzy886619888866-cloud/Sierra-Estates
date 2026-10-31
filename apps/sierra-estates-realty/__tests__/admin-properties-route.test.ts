/**
 * Tests: /api/admin/properties — the Inventory & Freshness Control console.
 *
 *   · GET: rejects unauthenticated callers; maps rows into the command-center
 *     buckets (verified / stale / sold / pending) and returns honest summary
 *     counts over the fetched window.
 *   · PATCH [id]: the se_code uniqueness contract — a Postgres 23505 surfaces
 *     as a 409 with the SE_CODE_DUPLICATE code, never a 500; lifecycle
 *     actions write the production publish/stale fields.
 */
const listRecordsMock = jest.fn();
const getRecordMock = jest.fn();
const updateRecordMock = jest.fn();
const insertRecordMock = jest.fn();
const verifyAdminRequestMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  listRecords: (...args: unknown[]) => listRecordsMock(...args),
  getRecord: (...args: unknown[]) => getRecordMock(...args),
  updateRecord: (...args: unknown[]) => updateRecordMock(...args),
  insertRecord: (...args: unknown[]) => insertRecordMock(...args),
}));

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: (...args: unknown[]) => verifyAdminRequestMock(...args),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}));

import { GET } from '@/app/api/admin/properties/route';
import { PATCH } from '@/app/api/admin/properties/[id]/route';
import { NextRequest } from 'next/server';

const makeGet = (qs = '') =>
  new NextRequest(`http://localhost:3000/api/admin/properties${qs}`);

const makePatch = (id: string, body: unknown) =>
  new NextRequest(`http://localhost:3000/api/admin/properties/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('GET /api/admin/properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'admin-1' });
    listRecordsMock.mockResolvedValue([]);
  });

  test('rejects unauthenticated requests', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: false });

    const res = await GET(makeGet());

    expect(res.status).toBe(401);
    expect(listRecordsMock).not.toHaveBeenCalled();
  });

  test('buckets rows and summarizes the window honestly', async () => {
    listRecordsMock.mockResolvedValue([
      { id: 'p1', status: 'active', publishStatus: 'PUBLISHABLE', stale: false, freshnessScore: 95, compound: 'Mivida', price: '12000000' },
      { id: 'p2', status: 'active', publishStatus: 'STALE', stale: true, freshnessScore: 40, compound: 'Mivida', price: 0 },
      { id: 'p3', status: 'sold', publishStatus: null, stale: false, freshnessScore: 80, compound: 'Villette', price: 0 },
      { id: 'p4', status: 'pending', publishStatus: 'REVIEW_REQUIRED', stale: false, freshnessScore: 100, compound: 'Villette', price: 0 },
    ]);

    const res = await GET(makeGet());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary.counts).toMatchObject({
      verified: 1,
      stale: 1,
      sold: 1,
      pending: 1,
      all: 4,
    });
    // (95 + 40 + 80 + 100) / 4 = 79 — rounded average over scored rows.
    expect(body.summary.avgFreshness).toBe(79);
    expect(body.summary.freshOver90).toBe(2);
    expect(body.summary.compounds).toEqual(['Mivida', 'Villette']);
    // Rows carry their bucket + numeric price normalization.
    expect(body.rows[0]).toMatchObject({ id: 'p1', bucket: 'verified', price: 12_000_000 });
  });

  test('bucket filter narrows the response to the requested bucket', async () => {
    listRecordsMock.mockResolvedValue([
      { id: 'p1', status: 'active', publishStatus: 'PUBLISHABLE', stale: false, freshnessScore: 95 },
      { id: 'p2', status: 'sold', publishStatus: null, stale: false, freshnessScore: 80 },
    ]);

    const res = await GET(makeGet('?bucket=sold'));
    const body = await res.json();

    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].bucket).toBe('sold');
  });
});

describe('PATCH /api/admin/properties/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'admin-1' });
    getRecordMock.mockResolvedValue({
      id: 'p1',
      status: 'active',
      publishStatus: 'STALE',
      stale: true,
      seCode: 'SE-SUB-1',
      code: 'HP-VL-01',
    });
    updateRecordMock.mockResolvedValue({ id: 'p1', status: 'active' });
    insertRecordMock.mockResolvedValue({ id: 'a1' });
  });

  test('rejects unauthenticated requests', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: false });

    const res = await PATCH(
      new NextRequest('http://localhost:3000/api/admin/properties/p1', { method: 'PATCH' }),
      { params: Promise.resolve({ id: 'p1' }) },
    );

    expect(res.status).toBe(401);
  });

  test('404s for a missing listing', async () => {
    getRecordMock.mockResolvedValue(null);

    const res = await PATCH(makePatch('missing', { action: 'verify' }), {
      params: Promise.resolve({ id: 'missing' }),
    });

    expect(res.status).toBe(404);
  });

  test('verify action drives the production publish gate fields', async () => {
    const res = await PATCH(makePatch('p1', { action: 'verify' }), {
      params: Promise.resolve({ id: 'p1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(updateRecordMock).toHaveBeenCalledWith(
      'listings',
      'p1',
      expect.objectContaining({
        verified: true,
        publishStatus: 'PUBLISHABLE',
        publishToClient: true,
        stale: false,
      }),
    );
  });

  test('mark-sold walks the legal reserved → sold transition', async () => {
    const res = await PATCH(makePatch('p1', { action: 'mark-sold' }), {
      params: Promise.resolve({ id: 'p1' }),
    });

    expect(res.status).toBe(200);
    const calls = updateRecordMock.mock.calls.map((c) => c[2] as Record<string, unknown>);
    // Two hops: live → reserved, reserved → sold (audited by the DB trigger).
    expect(calls[0]).toMatchObject({ status: 'reserved' });
    expect(calls[1]).toMatchObject({ status: 'sold', publishToClient: false });
  });

  test('a duplicate se_code surfaces as 409 SE_CODE_DUPLICATE, never a 500', async () => {
    updateRecordMock.mockRejectedValue(
      new Error(
        '[supabase:update listings] duplicate key value violates unique constraint "idx_listings_se_code_unique"',
      ),
    );

    const res = await PATCH(makePatch('p1', { seCode: 'SE-SUB-TAKEN' }), {
      params: Promise.resolve({ id: 'p1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe('SE_CODE_DUPLICATE');
    expect(body.error).toContain('SE-SUB-TAKEN');
  });

  test('rejects an empty patch payload', async () => {
    const res = await PATCH(makePatch('p1', {}), {
      params: Promise.resolve({ id: 'p1' }),
    });

    expect(res.status).toBe(400);
  });
});
