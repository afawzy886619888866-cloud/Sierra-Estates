const collectionMock = jest.fn();
const addMock = jest.fn();
const updateMock = jest.fn();
const getMock = jest.fn();
const docMock = jest.fn();

jest.mock('@/lib/server/firebase-admin', () => ({
  adminDb: { collection: (...args: unknown[]) => collectionMock(...args) },
}));

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: { now: jest.fn(() => 'ts') },
}));

import { POST } from '@/app/api/leads/request-viewing/route';

const makeReq = (body: unknown) =>
  new Request('http://localhost:3000/api/leads/request-viewing', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('POST /api/leads/request-viewing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    docMock.mockReturnValue({ update: updateMock, get: getMock });
    collectionMock.mockReturnValue({ add: addMock, doc: docMock });
    addMock.mockResolvedValue({ id: 'viewing-abc' });
    updateMock.mockResolvedValue(undefined);
    getMock.mockResolvedValue({ exists: true });
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
    expect(addMock).not.toHaveBeenCalled();
  });

  test('returns 400 when unitId is missing', async () => {
    const res = await POST(makeReq({ leadId: 'lead-1' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(addMock).not.toHaveBeenCalled();
  });

  test('returns 400 when body is empty', async () => {
    const res = await POST(makeReq({}));
    const _body = await res.json();

    expect(res.status).toBe(400);
    expect(addMock).not.toHaveBeenCalled();
  });

  test('accepts optional portfolioId', async () => {
    const res = await POST(makeReq({ leadId: 'l1', unitId: 'u1', portfolioId: 'p1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
