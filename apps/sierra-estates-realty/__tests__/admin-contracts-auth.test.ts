const verifyAdminRequestMock = jest.fn();

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: (...args: unknown[]) => verifyAdminRequestMock(...args),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}));

import { GET, POST } from '@/app/api/admin/contracts/route';
import type { NextRequest } from 'next/server';

const req = (body?: unknown) =>
  new Request('http://localhost/api/admin/contracts', {
    method: body ? 'POST' : 'GET',
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as NextRequest;

describe('/api/admin/contracts authorization', () => {
  beforeEach(() => jest.clearAllMocks());

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

  it('ships no real-looking national ID in the seeded sample contract', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'u1', role: 'admin' });
    const body = await (await GET(req())).text();
    // 14-digit Egyptian national ID pattern must not appear in tracked seed data.
    expect(body).not.toMatch(/"\d{14}"/);
  });

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
});
