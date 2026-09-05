const listRecordsMock = jest.fn();
const verifyAdminRequestMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  listRecords: (...args: unknown[]) => listRecordsMock(...args),
  insertRecord: jest.fn(),
}));

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: (...args: unknown[]) => verifyAdminRequestMock(...args),
}));

import { GET } from '@/app/api/admin/leads/route';
import { NextRequest } from 'next/server';

const makeReq = () => new NextRequest('http://localhost:3000/api/admin/leads');

describe('GET /api/admin/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'admin-1' });
    listRecordsMock.mockResolvedValue([]);
  });

  test('rejects unauthenticated requests', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: false });

    const res = await GET(makeReq());

    expect(res.status).toBe(401);
    expect(listRecordsMock).not.toHaveBeenCalled();
  });

  test('reads the leads table exactly once, not twice', async () => {
    // Regression guard: this route used to query 'leads' a second time as if it
    // were a collection distinct from COLLECTIONS.stakeholders and merge the
    // results — COLLECTIONS.stakeholders IS 'leads', so it was fetching and
    // merging the same data with itself.
    listRecordsMock.mockResolvedValue([
      { id: 'lead-1', fullName: 'Jane', phone: '+201000000000', source: 'website' },
    ]);

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(listRecordsMock).toHaveBeenCalledTimes(1);
    expect(listRecordsMock.mock.calls[0][0]).toBe('leads');
    expect(body.leads).toHaveLength(1);
    expect(body.leads[0].source).toBe('website');
  });
});
