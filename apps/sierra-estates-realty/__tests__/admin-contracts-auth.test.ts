const verifyAdminRequestMock = jest.fn();
const listRecordsMock = jest.fn();
const upsertRecordMock = jest.fn();

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: (...args: unknown[]) => verifyAdminRequestMock(...args),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}));

jest.mock('@sierra-estates/db', () => ({
  listRecords: (...args: unknown[]) => listRecordsMock(...args),
  upsertRecord: (...args: unknown[]) => upsertRecordMock(...args),
}));

import { GET, POST } from '@/app/api/admin/contracts/route';
import type { NextRequest } from 'next/server';

const req = (body?: unknown) =>
  new Request('http://localhost/api/admin/contracts', {
    method: body ? 'POST' : 'GET',
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as NextRequest;

describe('/api/admin/contracts authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listRecordsMock.mockResolvedValue([]);
    upsertRecordMock.mockResolvedValue({});
  });

  it('rejects an unauthenticated GET — it returns buyer national IDs and phones', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: false });
    expect((await GET(req())).status).toBe(401);
  });

  it('rejects an unauthenticated POST', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: false });
    expect((await POST(req({ unitCode: 'X' }))).status).toBe(401);
  });

  it('does not leak contract data in the unauthorized GET body', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: false });
    const body = await (await GET(req())).text();
    expect(body).not.toContain('nationalIdOrPassport');
    expect(body).not.toContain('contractNumber');
  });

  it('lets an authenticated admin through', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'u1', role: 'admin' });
    expect((await GET(req())).status).toBe(200);
  });

  it('returns an honest empty list when the registry holds no contracts — no fabricated sample', async () => {
    // §21 (wave 5): the route used to seed a fabricated sample contract
    // (invented parties, sample unit, decorative signature hash) and serve
    // it whenever the database was empty. An empty registry must now stay
    // honestly empty.
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'u1', role: 'admin' });
    listRecordsMock.mockResolvedValue([]);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.total).toBe(0);
    expect(body.contracts).toEqual([]);
    const raw = JSON.stringify(body);
    expect(raw).not.toContain('con-sample');
    expect(raw).not.toContain('nationalIdOrPassport');
    expect(raw).not.toContain('contractNumber');
  });

  it('reports registry unavailability instead of inventing records (502)', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'u1', role: 'admin' });
    listRecordsMock.mockRejectedValue(new Error('supabase unreachable'));
    const res = await GET(req());
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Contract registry unavailable');
    expect(body.contracts).toBeUndefined();
  });
<<<<<<< HEAD
=======

  it('refuses to create a contract with invented terms — missing fields are a 400', async () => {
    // §21: the old POST defaulted compoundName 'New Cairo', propertyType
    // 'Apartment', bedrooms 3, areaSqm 150, finishing 'Super Lux' and a 10%
    // reservation deposit — fabricated terms in a legal record. An empty
    // body must now fail loudly with the missing-fields list.
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'u1', role: 'admin' });
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.missing).toContain('unitCode');
    expect(body.missing).toContain('compoundName');
    expect(body.missing).toContain('agreedPrice');
    expect(body.missing).toContain('reservationDeposit');
    expect(body.missing).toContain('bedrooms');
    expect(body.missing).toContain('finishing');
    expect(body.missing).toContain('buyerName');
  });

  it('requires commission share splits when a commission percentage is supplied', async () => {
    // §21: share splits were silently defaulted to 50/50 — the block must
    // now arrive complete or be rejected.
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'u1', role: 'admin' });
    const res = await POST(
      req({
        unitCode: 'ET-B04-3U',
        compoundName: 'Eastown (SODIC)',
        propertyType: 'Apartment',
        dealType: 'rent',
        finishing: 'Ultra Super Lux',
        agreedPrice: 45000,
        reservationDeposit: 45000,
        areaSqm: 165,
        bedrooms: 3,
        bathrooms: 2,
        buyerName: 'Test Buyer',
        commissionPercentage: 2.5,
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.missing).toContain('sierraSharePercentage');
    expect(body.missing).toContain('brokerSharePercentage');
  });
<<<<<<< HEAD
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
=======

  it('persists a fully-specified contract and echoes it (success only after the DB write)', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'u1', role: 'admin' });
    const res = await POST(
      req({
        unitCode: 'MT-B14-3U',
        compoundName: 'Madinaty',
        propertyType: 'Apartment',
        dealType: 'rent',
        finishing: 'Ultra Super Lux',
        agreedPrice: 35000,
        reservationDeposit: 35000,
        areaSqm: 140,
        bedrooms: 3,
        bathrooms: 2,
        buyerName: 'Test Buyer',
        buyerPhone: '+201000000000',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.contract.unit.unitCode).toBe('MT-B14-3U');
    expect(body.contract.buyer.name).toBe('Test Buyer');
    expect(upsertRecordMock).toHaveBeenCalledTimes(1);
    expect(upsertRecordMock).toHaveBeenCalledWith('contracts', expect.objectContaining({
      id: body.contract.id,
    }));
    expect(body.signUrl).toContain(`/contracts/sign/${body.contract.id}`);
  });

  it('fails loudly when the contract cannot be persisted — success is never claimed for a lost record', async () => {
    // §21: the old flow swallowed upsert failures (an in-memory copy made
    // the response look successful while no durable legal record existed).
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'u1', role: 'admin' });
    upsertRecordMock.mockRejectedValue(new Error('supabase unreachable'));
    const res = await POST(
      req({
        unitCode: 'MT-B14-3U',
        compoundName: 'Madinaty',
        propertyType: 'Apartment',
        dealType: 'rent',
        finishing: 'Ultra Super Lux',
        agreedPrice: 35000,
        reservationDeposit: 35000,
        areaSqm: 140,
        bedrooms: 3,
        bathrooms: 2,
        buyerName: 'Test Buyer',
      })
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('no contract record was created');
    expect(body.contract).toBeUndefined();
  });
<<<<<<< HEAD
>>>>>>> 07e94f3edebe105ec6bf01e86d601f7f16d70325
=======
>>>>>>> origin/main
>>>>>>> d2b8a29c09aad3d3015897345ba8ee9ad9e55824
});
