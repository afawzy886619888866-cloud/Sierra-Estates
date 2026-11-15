import {
  syncCareerToSheet,
  getCareersSpreadsheetRows,
  loadLocalCareersMirror,
  saveLocalCareersMirror,
} from '@/lib/services/CareerSheetSyncService';
import {
  syncRequestToSheet,
  getRequestsSpreadsheetRows,
  loadLocalRequestsMirror,
  saveLocalRequestsMirror,
} from '@/lib/services/RequestSheetSyncService';

jest.mock('@sierra-estates/db', () => ({
  listRecords: jest.fn().mockResolvedValue([]),
  insertRecord: jest.fn().mockResolvedValue({ id: 'mock-rec-id' }),
  updateRecord: jest.fn().mockResolvedValue({ id: 'mock-rec-id' }),
}));

describe('Career & Request Online Spreadsheet Sync Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SHEETS_WEBAPP_URL;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('syncs career candidate application to local mirror and handles Google Apps Script dispatch', async () => {
    process.env.SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/mock-gas/exec';

    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, row: 15, sheet: 'Career_Applications' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const testApp = {
      id: 'CAR-TEST-001',
      role: 'sales' as const,
      fullName: 'Tarek Al-Sayed',
      phone: '01012345678',
      email: 'tarek@example.com',
      position: 'Senior Real Estate Sales Consultant',
      experience: '3',
      hasVehicle: true,
      biggestAchievements: 'Closed 80M EGP in New Cairo luxury compounds',
      expectedSalary: '15,000 EGP + Commission',
      cvUrl: 'https://drive.google.com/file/d/mock-cv/view',
    };

    const result = await syncCareerToSheet(testApp);

    expect(result.ok).toBe(true);
    expect(result.sheet).toBe('Career_Applications');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [, init] = fetchSpy.mock.calls[0];
    const payload = JSON.parse(String(init?.body || '{}'));
    expect(payload.action).toBe('career_submission');
    expect(payload.tab).toBe('Career_Applications');
    expect(payload.application.fullName).toBe('Tarek Al-Sayed');
    expect(payload.application.hasVehicle).toBe(true);
    expect(payload.application.cvUrl).toContain('drive.google.com');

    // Verify it is saved in local mirror
    const localRows = loadLocalCareersMirror();
    const found = localRows.find((r) => r.id === 'CAR-TEST-001');
    expect(found).toBeDefined();
    expect(found?.position).toBe('Senior Real Estate Sales Consultant');
  });

  it('loads unified career rows with sorting and fallback', async () => {
    const rows = await getCareersSpreadsheetRows();
    expect(Array.isArray(rows)).toBe(true);
    const found = rows.find((r) => r.id === 'CAR-TEST-001');
    expect(found).toBeDefined();
    expect(found?.fullName).toBe('Tarek Al-Sayed');
  });

  it('syncs client property request with 25% promo to local mirror and Google Sheet dispatch', async () => {
    process.env.SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/mock-gas/exec';

    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, row: 42, sheet: 'Client_Requests' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const testReq = {
      id: 'REQ-TEST-VIP25',
      type: 'buyer_demand' as const,
      clientName: 'Sherif Mansour',
      clientPhone: '01099887766',
      clientEmail: 'sherif@example.com',
      mode: 'sale' as const,
      preferredZone: 'Mivida, Hyde Park',
      unitType: 'Stand-alone Villa',
      bedrooms: 4,
      budget: '35,000,000 EGP',
      finishing: 'Fully Finished',
      campaign: 'BLACK_FRIDAY_25_OFF_TILL_25_NOV_2026',
      voucherCode: 'SE-BF25-TEST',
      targetDate: 'Immediate',
      matchedUnits: ['MV-V-01', 'HP-V-09'],
    };

    const result = await syncRequestToSheet(testReq);

    expect(result.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [, init] = fetchSpy.mock.calls[0];
    const payload = JSON.parse(String(init?.body || '{}'));
    expect(payload.action).toBe('request_submission');
    expect(payload.tab).toBe('Client_Requests');
    expect(payload.request.clientName).toBe('Sherif Mansour');
    expect(payload.request.voucherCode).toBe('SE-BF25-TEST');
    expect(payload.request.matchedUnitsStr).toBe('MV-V-01, HP-V-09');

    // Verify it is saved in local requests mirror
    const localReqs = loadLocalRequestsMirror();
    const found = localReqs.find((r) => r.id === 'REQ-TEST-VIP25');
    expect(found).toBeDefined();
    expect(found?.voucherCode).toBe('SE-BF25-TEST');
  });
});
