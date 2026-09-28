/**
 * Phase 8 — public viewing-request endpoint contract.
 *
 * POST /api/viewing-requests is the property page's "Request a Viewing"
 * form (PROPERTY → REQUEST stage of the journey). It must: validate the
 * visitor payload, upsert a lead by phone, write ONE canonical
 * public.viewings row (migration 014 consolidation), and return
 * confirmation links that carry the REAL chosen date — never a hardcoded
 * one (the old property page shipped an .ics with a past fabricated date).
 */
const insertMock = jest.fn();
const updateMock = jest.fn();
const listMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  insertRecord: (...args: unknown[]) => insertMock(...args),
  updateRecord: (...args: unknown[]) => updateMock(...args),
  listRecords: (...args: unknown[]) => listMock(...args),
}));

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: jest.fn(async () => ({ authenticated: false })),
  unauthorizedResponse: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}));

jest.mock('@/lib/server/rate-limit', () => ({
  applyRateLimit: jest.fn(async () => null),
  publicEndpointLimiter: {},
}));

jest.mock('@/lib/services/telegram-controller', () => ({
  sendTelegramMessage: jest.fn(async () => undefined),
}));

import { POST, GET } from '@/app/api/viewing-requests/route';

const makeReq = (body: unknown) =>
  new Request('http://localhost:3000/api/viewing-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const valid = {
  propertyCode: 'MVD-3F-15M',
  visitorName: 'Test Client',
  visitorPhone: '+201001234567',
  preferredDate: '2099-05-10',
  preferredTime: 'morning',
};

describe('POST /api/viewing-requests (public form)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listMock.mockResolvedValue([]); // no existing lead by phone
    insertMock.mockImplementation(async (table: string) =>
      table === 'leads' ? { id: 'lead-new' } : { id: 'viewing-new' }
    );
    updateMock.mockResolvedValue(undefined);
  });

  it('creates a lead and a canonical viewings row for a valid request', async () => {
    const res = await POST(makeReq(valid) as never);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.requestId).toBe('viewing-new');
    expect(body.leadId).toBe('lead-new');

    const leadInsert = insertMock.mock.calls.find((c) => c[0] === 'leads');
    expect(leadInsert?.[1]).toMatchObject({
      fullName: 'Test Client',
      phone: '+201001234567',
      source: 'website',
      status: 'Viewing Requested',
      pipelineStage: 'viewing',
    });

    const viewingInsert = insertMock.mock.calls.find((c) => c[0] === 'viewings');
    expect(viewingInsert?.[1]).toMatchObject({
      propertyCode: 'MVD-3F-15M',
      visitorName: 'Test Client',
      visitorPhone: '+201001234567',
      preferredDate: '2099-05-10',
      status: 'pending_approval',
      source: 'website',
    });
  });

  it('confirmation links carry the REAL chosen date — never a hardcoded slot', async () => {
    const res = await POST(makeReq(valid) as never);
    const body = await res.json();

    expect(body.calendarLink).toContain('dates=20990510T100000Z/20990510T110000Z');
    expect(body.whatsappConfirmUrl).toContain(encodeURIComponent('2099-05-10'));
    // the fabricated past date from the old .ics flow must not resurface
    expect(body.calendarLink).not.toContain('20260901');
  });

  it('reuses an existing lead by phone instead of duplicating', async () => {
    listMock.mockResolvedValue([{ id: 'lead-existing' }]);
    const res = await POST(makeReq(valid) as never);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.leadId).toBe('lead-existing');
    expect(updateMock).toHaveBeenCalledWith('leads', 'lead-existing', expect.objectContaining({
      pipelineStage: 'viewing',
    }));
    // no second lead inserted
    expect(insertMock.mock.calls.filter((c) => c[0] === 'leads')).toHaveLength(0);
  });

  it('rejects a past preferred date', async () => {
    const res = await POST(makeReq({ ...valid, preferredDate: '2020-01-01' }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects a missing phone or name', async () => {
    expect((await POST(makeReq({ ...valid, visitorPhone: '' }) as never)).status).toBe(400);
    expect((await POST(makeReq({ ...valid, visitorName: '' }) as never)).status).toBe(400);
  });

  it('keeps the visitor journey alive when the lead lookup fails (viewing row still written)', async () => {
    listMock.mockRejectedValue(new Error('db hiccup'));
    const res = await POST(makeReq(valid) as never);
    const body = await res.json();

    expect(res.status).toBe(201);
    const viewingInsert = insertMock.mock.calls.find((c) => c[0] === 'viewings');
    expect(viewingInsert).toBeDefined();
    expect(body.requestId).toBe('viewing-new');
  });
});

describe('GET /api/viewing-requests (admin)', () => {
  it('requires admin authentication', async () => {
    const res = await GET(new Request('http://localhost:3000/api/viewing-requests') as never);
    expect(res.status).toBe(401);
  });
});
