const insertMock = jest.fn();
const updateMock = jest.fn();
const getMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  insertRecord: (...args) => insertMock(...args),
  updateRecord: (...args) => updateMock(...args),
  getRecord: (...args) => getMock(...args),
}));

import { POST } from '@/app/api/leads/request-viewing/route';

const makeReq = (body) =>
  new Request('http://localhost:3000/api/leads/request-viewing', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('POST /api/leads/request-viewing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    insertMock.mockResolvedValue({ id: 'viewing-abc' });
    updateMock.mockResolvedValue(undefined);
    getMock.mockResolvedValue({ id: 'lead-1' });
  });

  test('creates viewing request with valid payload', async () => {
    const res = await POST(makeReq({ leadId: 'lead-1', unitId: 'unit-1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.viewingId).toBe('viewing-abc');
  });

  test('returns 400 when leadId is missing', async () => {
    const res = await POST(makeReq({ unitId: 'unit-1' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test('returns 400 when unitId is missing', async () => {
    const res = await POST(makeReq({ leadId: 'lead-1' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test('returns 400 when body is empty', async () => {
    const res = await POST(makeReq({}));
    const _body = await res.json();

    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  test('accepts optional portfolioId', async () => {
    const res = await POST(makeReq({ leadId: 'l1', unitId: 'u1', portfolioId: 'p1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
