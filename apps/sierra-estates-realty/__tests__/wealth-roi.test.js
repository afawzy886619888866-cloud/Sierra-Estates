 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }const getRecordMock = jest.fn();
const updateRecordMock = jest.fn();
const analyzeAssetFinancialsMock = jest.fn();
const verifyAdminRequestMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  getRecord: (...args) => getRecordMock(...args),
  updateRecord: (...args) => updateRecordMock(...args),
}));

jest.mock('@/lib/services/roi-service', () => ({
  analyzeAssetFinancials: (...args) => analyzeAssetFinancialsMock(...args),
}));

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: jest.fn().mockResolvedValue({ authenticated: true, uid: 'test-user' }),
  unauthorizedResponse: jest.fn(),
}));

import { POST } from '@/app/api/wealth/roi/route';
import { NextRequest } from 'next/server';

describe('POST /api/wealth/roi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'admin-user' });
  });

  test('returns 400 when proposalId is missing', async () => {
    const res = await POST(
      new NextRequest('http://localhost:3000/api/wealth/roi', {
        method: 'POST',
        body: JSON.stringify({}),
      }) ,
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Proposal ID is required' });
  });

  test('returns 404 when proposal does not exist', async () => {
    // getRecord resolves null when the row is absent.
    getRecordMock.mockResolvedValue(null);

    const res = await POST(
      new NextRequest('http://localhost:3000/api/wealth/roi', {
        method: 'POST',
        body: JSON.stringify({ proposalId: 'missing-proposal' }),
      }) ,
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: 'Proposal not found' });
  });

  test('re-analyzes units and updates proposal successfully', async () => {
    const proposal = {
      units: [{ id: 'unit-1' }, { id: 'unit-2' }, { id: 'unit-missing' }],
    };

    // 'unit-missing' resolves null, so it is skipped and only two units are
    // written back — the same behaviour the Firestore `exists: false` had.
    const unitsById = {
      'unit-1': { id: 'unit-1', title: 'Unit 1' },
      'unit-2': { id: 'unit-2', title: 'Unit 2' },
      'unit-missing': null,
    };

    getRecordMock.mockImplementation(async (table, id) => {
      if (table === 'proposals') return proposal;
      if (table === 'listings') return _nullishCoalesce(unitsById[id], () => ( null));
      return null;
    });
    updateRecordMock.mockResolvedValue(undefined);

    analyzeAssetFinancialsMock
      .mockResolvedValueOnce({ projectedROI: 10, annualYield: 7.2 })
      .mockResolvedValueOnce({ projectedROI: 20, annualYield: 8.4 });

    const res = await POST(
      new NextRequest('http://localhost:3000/api/wealth/roi', {
        method: 'POST',
        body: JSON.stringify({ proposalId: 'proposal-1' }),
      }) ,
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.financialAnalysis.projectedROI).toBe(15);
    expect(body.financialAnalysis.annualYield).toBe(7.8);
    expect(analyzeAssetFinancialsMock).toHaveBeenCalledTimes(2);
    expect(updateRecordMock).toHaveBeenCalledTimes(1);
    expect(updateRecordMock.mock.calls[0][0]).toBe('proposals');
    expect(updateRecordMock.mock.calls[0][2].units).toHaveLength(2);
  });

  test('returns 500 when unexpected error is thrown', async () => {
    getRecordMock.mockRejectedValue(new Error('database unavailable'));

    const res = await POST(
      new NextRequest('http://localhost:3000/api/wealth/roi', {
        method: 'POST',
        body: JSON.stringify({ proposalId: 'proposal-1' }),
      }) ,
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'database unavailable' });
  });
});
