const getRecordMock = jest.fn();
const updateRecordMock = jest.fn();
const analyzeAssetFinancialsMock = jest.fn();
const verifyAdminRequestMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  getRecord: (...args: unknown[]) => getRecordMock(...args),
  updateRecord: (...args: unknown[]) => updateRecordMock(...args),
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
import { FinancialService } from '@/lib/services/financial-service';

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
    // getRecord resolves null when the row is absent.
    getRecordMock.mockResolvedValue(null);

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
    const proposal = {
      units: [{ id: 'unit-1' }, { id: 'unit-2' }, { id: 'unit-missing' }],
    };

    // 'unit-missing' resolves null, so it is skipped and only two units are
    // written back — the same behaviour the Firestore `exists: false` had.
    const unitsById: Record<string, unknown> = {
      'unit-1': { id: 'unit-1', title: 'Unit 1' },
      'unit-2': { id: 'unit-2', title: 'Unit 2' },
      'unit-missing': null,
    };

    getRecordMock.mockImplementation(async (table: string, id: string) => {
      if (table === 'proposals') return proposal;
      if (table === 'listings') return unitsById[id] ?? null;
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
      }) as NextRequest,
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
      }) as NextRequest,
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'database unavailable' });
  });
});

describe('§21 no-fabrication: FinancialService.calcAppraisedValue', () => {
  test('returns null when area is missing — never appraises on an invented 150 sqm', () => {
    const report = FinancialService.calcAppraisedValue({
      price: 12_000_000,
      area: undefined,
    } as unknown as Parameters<typeof FinancialService.calcAppraisedValue>[0]);

    expect(report).toBeNull();
  });

  test('returns null when price is missing or zero', () => {
    expect(
      FinancialService.calcAppraisedValue({ price: 0, area: 200 } as never)
    ).toBeNull();
    expect(
      FinancialService.calcAppraisedValue({ price: undefined, area: 200 } as never)
    ).toBeNull();
  });

  test('computes a full report from real area and price', () => {
    const report = FinancialService.calcAppraisedValue({
      price: 12_000_000,
      area: 200,
      intelligence: { finishingGrade: 'ultra-lux' },
    } as never);

    expect(report).not.toBeNull();
    // 45000 EGP/sqm heuristic × 200 sqm × 1.4 ultra-lux multiplier
    expect(report!.appraisedValue).toBe(12_600_000);
    expect(['underpriced', 'fair', 'overpriced']).toContain(report!.valuationStatus);
    expect(report!.monthlyInstallment).toBeGreaterThan(0);
  });
});
