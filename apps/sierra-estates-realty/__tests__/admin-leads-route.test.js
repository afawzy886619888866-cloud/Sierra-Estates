const collectionMock = jest.fn();
const getMock = jest.fn();
const verifyAdminRequestMock = jest.fn();

jest.mock('@/lib/server/firebase-admin', () => ({
  adminDb: { collection: (...args) => collectionMock(...args) },
}));

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: (...args) => verifyAdminRequestMock(...args),
}));

import { GET } from '@/app/api/admin/leads/route';
import { NextRequest } from 'next/server';

const makeReq = () => new NextRequest('http://localhost:3000/api/admin/leads');

describe('GET /api/admin/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'admin-1' });
    collectionMock.mockReturnValue({ limit: () => ({ get: getMock }) });
  });

  test('rejects unauthenticated requests', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: false });

    const res = await GET(makeReq());

    expect(res.status).toBe(401);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  test('fetches the leads collection exactly once, not twice', async () => {
    // Regression guard: this route used to also query adminDb.collection('leads')
    // as if it were a second collection distinct from COLLECTIONS.stakeholders
    // and merge the results - COLLECTIONS.stakeholders IS 'leads', so it was
    // fetching and merging the exact same collection with itself.
    getMock.mockResolvedValue({
      docs: [
        { id: 'lead-1', data: () => ({ name: 'Jane', phone: '+201000000000', source: 'website' }) },
      ],
    });

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(collectionMock).toHaveBeenCalledTimes(1);
    expect(collectionMock).toHaveBeenCalledWith('leads');
    expect(body.leads).toHaveLength(1);
    expect(body.leads[0].source).toBe('website');
  });
});
