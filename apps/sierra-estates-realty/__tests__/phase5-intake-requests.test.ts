/**
 * Phase 5 Gate Tests — Unified Add Listing (/api/listings/intake),
 * Buyer Demand -> /api/viewing-requests (top-3 Unit_Codes preferring tier_1),
 * & Admin RequestsSpreadsheetView matchedUnits projection.
 */
import { NextRequest } from 'next/server';

const mockWorkflowStart = jest.fn();
const mockInsertRecord = jest.fn();
const mockUpdateRecord = jest.fn();
const mockListRecords = jest.fn();
const mockSyncRequestToSheet = jest.fn();

jest.mock('workflow/api', () => ({
  __esModule: true,
  start: (...args: unknown[]) => mockWorkflowStart(...args),
}));

jest.mock('@/lib/workflow/listing-submission-workflow', () => ({
  __esModule: true,
  listingSubmissionWorkflow: jest.fn(),
}));

jest.mock('@/lib/server/rate-limit', () => ({
  __esModule: true,
  applyRateLimit: jest.fn().mockResolvedValue(null),
  publicEndpointLimiter: {},
}));

jest.mock('@/lib/server/auth-guard', () => ({
  __esModule: true,
  requireAdminSession: jest.fn().mockResolvedValue({ authorized: false }),
}));

jest.mock('@/lib/services/telegram-controller', () => ({
  __esModule: true,
  sendTelegramMessage: jest.fn().mockResolvedValue({ ok: true }),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@sierra-estates/db', () => ({
  __esModule: true,
  insertRecord: (...args: unknown[]) => mockInsertRecord(...args),
  updateRecord: (...args: unknown[]) => mockUpdateRecord(...args),
  listRecords: (...args: unknown[]) => mockListRecords(...args),
}));

jest.mock('@/lib/services/RequestSheetSyncService', () => {
  const actual = jest.requireActual('@/lib/services/RequestSheetSyncService');
  return {
    ...actual,
    syncRequestToSheet: (...args: unknown[]) => mockSyncRequestToSheet(...args),
  };
});

import { POST as intakePost } from '@/app/api/listings/intake/route';
import { POST as viewingRequestPost } from '@/app/api/viewing-requests/route';
import { getRequestsSpreadsheetRows } from '@/lib/services/RequestSheetSyncService';

describe('Phase 5: Unified Add Listing & Add Request Pipelines', () => {
  const savedEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...savedEnv };
    delete process.env.WF_SHEET_WRITE_URL;
    delete process.env.WF_SHEET_WRITE_SECRET;
    delete process.env.APPS_SCRIPT_WEBHOOK_URL;
    mockInsertRecord.mockResolvedValue({ id: 'REC-1' });
    mockUpdateRecord.mockResolvedValue({ id: 'REC-1' });
    mockListRecords.mockResolvedValue([]);
    mockSyncRequestToSheet.mockResolvedValue({ ok: true, id: 'REQ-1' });
    mockWorkflowStart.mockResolvedValue({
      returnValue: Promise.resolve({
        success: true,
        code: 'SE-SL-MVD-101',
        message: 'Listing saved',
      }),
    });
  });

  afterAll(() => {
    process.env = savedEnv;
    global.fetch = originalFetch;
  });

  describe('POST /api/listings/intake', () => {
    it('flags confidence < 0.75 and validates PF Title (30-47 chars) & Bilingual Description (750-2000 chars)', async () => {
      const lowReq = new NextRequest('http://localhost/api/listings/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          rawText: 'شقة في التجمع',
          pfTitle: 'Too short',
          description: 'Too short description',
        }),
      });
      const lowRes = await intakePost(lowReq);
      expect(lowRes.status).toBe(200);
      const lowJson = await lowRes.json();
      expect(lowJson.lowConfidence).toBe(true);
      expect(lowJson.confidence).toBeLessThan(0.75);
      expect(lowJson.pfTitleValid).toBe(false);
      expect(lowJson.descriptionValid).toBe(false);

      const validTitle = 'Prime Garden Apartment in Mivida New Cairo'; // 42 chars
      const validDesc = 'شقة للبيع في كمبوند ميفيدا التجمع الخامس تشطيب الترا سوبر لوكس 3 غرف نوم '.repeat(12).slice(0, 820);
      const highReq = new NextRequest('http://localhost/api/listings/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          rawText: 'شقة للبيع في ميفيدا 185 متر 3 غرف 01012345678 المالك',
          pfTitle: validTitle,
          description: validDesc,
        }),
      });
      const highRes = await intakePost(highReq);
      expect(highRes.status).toBe(200);
      const highJson = await highRes.json();
      expect(highJson.lowConfidence).toBe(false);
      expect(highJson.confidence).toBeGreaterThanOrEqual(0.75);
      expect(highJson.pfTitleValid).toBe(true);
      expect(highJson.descriptionValid).toBe(true);
    });

    it('submits through listingSubmissionWorkflow and syncs upsert_units to WF_SHEET_WRITE_URL', async () => {
      process.env.WF_SHEET_WRITE_URL = 'https://script.google.com/macros/s/test/exec';
      process.env.WF_SHEET_WRITE_SECRET = 'sec-55';
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      global.fetch = fetchMock as unknown as typeof fetch;

      const req = new NextRequest('http://localhost/api/listings/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compound: 'Mivida',
          propertyType: 'Apartment',
          mode: 'sale',
          beds: 3,
          baths: 3,
          area: 185,
          price: 9200000,
          pfTitle: 'Prime Garden Apartment in Mivida New Cairo',
          description: 'Luxury 3BR apartment in Mivida Emaar New Cairo ready to move. '.repeat(14),
          ownerName: 'أحمد فوزي',
          mobile: '01012345678',
          rawText: 'شقة للبيع ميفيدا 185 متر 01012345678 المالك',
        }),
      });

      const res = await intakePost(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.code).toBe('SE-SL-MVD-101');
      expect(json.wfSheetSync).toEqual({ ok: true, status: 200 });
      expect(mockWorkflowStart).toHaveBeenCalledTimes(1);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://script.google.com/macros/s/test/exec',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"upsert_units"'),
        })
      );
    });
  });

  describe('POST /api/viewing-requests (buyer demand matching)', () => {
    it('attaches top 3 Unit_Codes preferring tier_1_top_ad & tier_1_broker_top, redacts phones, and syncs via RequestSheetSyncService', async () => {
      mockListRecords.mockResolvedValue([
        {
          id: 'u-sold',
          unit_code: 'SE-SL-MVD-999',
          compound: 'Mivida',
          mode: 'sale',
          status: 'sold',
          price: 8_000_000,
          score_tier: 'tier_1_top_ad',
          ai_score: 99,
        },
        {
          id: 'u-tier2',
          unit_code: 'SE-SL-MVD-004',
          compound: 'Mivida',
          mode: 'sale',
          status: 'available',
          price: 8_200_000,
          score_tier: 'tier_2_search_only',
          ai_score: 95,
          owner_phone: '+201099999999',
        },
        {
          id: 'u-top-broker',
          unit_code: 'SE-SL-MVD-002',
          compound: 'Mivida',
          mode: 'sale',
          status: 'available',
          price: 8_500_000,
          score_tier: 'tier_1_broker_top',
          ai_score: 82,
          owner_phone: '+201088888888',
        },
        {
          id: 'u-top-ad-1',
          unit_code: 'SE-SL-MVD-001',
          compound: 'Mivida',
          mode: 'sale',
          status: 'available',
          price: 8_700_000,
          score_tier: 'tier_1_top_ad',
          ai_score: 91,
          owner_phone: '+201077777777',
        },
        {
          id: 'u-top-ad-2',
          unit_code: 'SE-SL-HYD-003',
          compound: 'Hyde Park',
          mode: 'sale',
          status: 'available',
          price: 7_900_000,
          score_tier: 'tier_1_top_ad',
          ai_score: 88,
          owner_phone: '+201066666666',
        },
      ]);

      const req = new NextRequest('http://localhost/api/viewing-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'sale',
          name: 'Karim Hassan',
          phone: '01012345678',
          compounds: ['Mivida', 'Hyde Park'],
          unitType: 'Apartment',
          bedrooms: 3,
          budgetMax: 9_000_000,
          budget: '9,000,000 EGP',
          notes: 'Ready to move',
        }),
      });

      const res = await viewingRequestPost(req);
      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.matchedUnitCodes).toEqual([
        'SE-SL-MVD-001',
        'SE-SL-HYD-003',
        'SE-SL-MVD-002',
      ]);
      expect(data.matchedUnitCodes).not.toContain('SE-SL-MVD-999');
      expect(data.matchedUnitCodes).not.toContain('SE-SL-MVD-004');
      expect(data.topMatches).toHaveLength(3);
      for (const m of data.topMatches) {
        expect(m.owner_phone).toBeUndefined();
        expect(m.phone).toBeUndefined();
      }

      expect(mockSyncRequestToSheet).toHaveBeenCalledWith(
        expect.objectContaining({
          clientName: 'Karim Hassan',
          clientPhone: '+201012345678',
          matchedUnits: ['SE-SL-MVD-001', 'SE-SL-HYD-003', 'SE-SL-MVD-002'],
        })
      );
    });

    it('preserves matchedUnits from DB inquiries in getRequestsSpreadsheetRows for admin table rendering', async () => {
      mockListRecords.mockImplementation(async (table: string) => {
        if (table === 'inquiries') {
          return [
            {
              id: 'REQ-ADMIN-1',
              name: 'Nourhan Ali',
              phone: '+201011122233',
              zone: 'Mivida',
              unitType: 'Villa',
              budget: '15,000,000 EGP',
              matchedUnits: ['SE-SL-MVD-001', 'SE-SL-MVD-002', 'SE-SL-HYD-003'],
              status: 'new',
              createdAt: '2026-11-16T00:00:00.000Z',
            },
          ];
        }
        return [];
      });

      const rows = await getRequestsSpreadsheetRows();
      const target = rows.find((r) => r.id === 'REQ-ADMIN-1');
      expect(target).toBeDefined();
      expect(target?.matchedUnits).toEqual(['SE-SL-MVD-001', 'SE-SL-MVD-002', 'SE-SL-HYD-003']);
    });
  });
});
