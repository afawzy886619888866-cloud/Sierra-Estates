const collectionMock = jest.fn();
const analyzeAssetFinancialsMock = jest.fn();
const verifyAdminRequestMock = jest.fn();

jest.mock('@/lib/server/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => collectionMock(...args),
  },
}));

jest.mock('@/lib/services/roi-service', () => ({
  analyzeAssetFinancials: (...args: unknown[]) => analyzeAssetFinancialsMock(...args),
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
      }) as NextRequest,
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Proposal ID is required' });
  });

  test('returns 404 when proposal does not exist', async () => {
    collectionMock.mockImplementation((collectionName: string) => {
      if (collectionName === 'proposals') {
        return { doc: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ exists: false }) })) };
      }
      return { doc: jest.fn() };
    });

    const res = await POST(
      new NextRequest('http://localhost:3000/api/wealth/roi', {
        method: 'POST',
        body: JSON.stringify({ proposalId: 'missing-proposal' }),
      }) as NextRequest,
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: 'Proposal not found' });
  });

  test('re-analyzes units and updates proposal successfully', async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    const proposalDoc = {
      exists: true,
      data: () => ({
        units: [{ id: 'unit-1' }, { id: 'unit-2' }, { id: 'unit-missing' }],
      }),
    };

    const unitsById: Record<string, any> = {
      'unit-1': { exists: true, id: 'unit-1', data: () => ({ title: 'Unit 1' }) },
      'unit-2': { exists: true, id: 'unit-2', data: () => ({ title: 'Unit 2' }) },
      'unit-missing': { exists: false, id: 'unit-missing', data: () => ({}) },
    };

    collectionMock.mockImplementation((collectionName: string) => {
      if (collectionName === 'proposals') {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(proposalDoc),
            update: updateMock,
          })),
        };
      }

      if (collectionName === 'listings') {
        return {
          doc: jest.fn((id: string) => ({
            get: jest.fn().mockResolvedValue(unitsById[id]),
          })),
        };
      }

      return { doc: jest.fn() };
    });

    analyzeAssetFinancialsMock
      .mockResolvedValueOnce({ projectedROI: 10, annualYield: 7.2 })
      .mockResolvedValueOnce({ projectedROI: 20, annualYield: 8.4 });

    const res = await POST(
      new NextRequest('http://localhost:3000/api/wealth/roi', {
        method: 'POST',
        body: JSON.stringify({ proposalId: 'proposal-1' }),
      }) as NextRequest,
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.financialAnalysis.projectedROI).toBe(15);
    expect(body.financialAnalysis.annualYield).toBe(7.8);
    expect(analyzeAssetFinancialsMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0].units).toHaveLength(2);
  });

  test('returns 500 when unexpected error is thrown', async () => {
    collectionMock.mockImplementation(() => {
      throw new Error('database unavailable');
    });

    const res = await POST(
      new NextRequest('http://localhost:3000/api/wealth/roi', {
        method: 'POST',
        body: JSON.stringify({ proposalId: 'proposal-1' }),
      }) as NextRequest,
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'database unavailable' });
  });
});
