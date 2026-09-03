const verifyAdminRequestMock = jest.fn();

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: (...args) => verifyAdminRequestMock(...args),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}));

jest.mock('@/lib/server/firebase-admin', () => ({
  adminDb: { collection: () => { throw new Error('no firestore in test'); } },
}));

import { GET, POST } from '@/app/api/admin/contracts/route';


const req = (body) =>
  new Request('http://localhost/api/admin/contracts', {
    method: body ? 'POST' : 'GET',
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) ;

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
});
