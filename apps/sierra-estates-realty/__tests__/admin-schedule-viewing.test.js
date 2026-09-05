const scheduleViewingMock = jest.fn();
const verifyAdminRequestMock = jest.fn();
const unauthorizedResponseMock = jest.fn();

jest.mock('@/lib/services/viewing-engine', () => ({
  scheduleViewing: (...args) => scheduleViewingMock(...args),
}));

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: (...args) => verifyAdminRequestMock(...args),
  unauthorizedResponse: (...args) => unauthorizedResponseMock(...args),
}));

import { POST } from '@/app/api/admin/schedule-viewing/route';
import { NextRequest } from 'next/server';

const makeReq = (body) =>
  new NextRequest('http://localhost:3000/api/admin/schedule-viewing', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('POST /api/admin/schedule-viewing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'admin-1' });
    unauthorizedResponseMock.mockReturnValue(
      new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })
    );
    scheduleViewingMock.mockResolvedValue('viewing-abc');
  });

  test('rejects unauthenticated requests', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: false });

    const res = await POST(makeReq({ leadId: 'lead-1', units: [{ id: 'unit-1', title: 'Villa' }] }));

    expect(res.status).toBe(401);
    expect(scheduleViewingMock).not.toHaveBeenCalled();
  });

  test('schedules a viewing for each unit and returns a calendar link', async () => {
    const res = await POST(
      makeReq({
        leadId: 'lead-1',
        units: [
          { id: 'unit-1', title: 'Villa A' },
          { code: 'unit-2', title: 'Villa B' },
        ],
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.viewingIds).toEqual(['viewing-abc', 'viewing-abc']);
    expect(body.calendarLink).toContain('Villa%20A');
    expect(scheduleViewingMock).toHaveBeenCalledTimes(2);
    expect(scheduleViewingMock).toHaveBeenCalledWith('lead-1', 'unit-1', 'admin-1', expect.any(Date));
    expect(scheduleViewingMock).toHaveBeenCalledWith('lead-1', 'unit-2', 'admin-1', expect.any(Date));
  });

  test('returns 400 when leadId is missing', async () => {
    const res = await POST(makeReq({ units: [{ id: 'unit-1' }] }));
    expect(res.status).toBe(400);
    expect(scheduleViewingMock).not.toHaveBeenCalled();
  });

  test('returns 400 when units is empty', async () => {
    const res = await POST(makeReq({ leadId: 'lead-1', units: [] }));
    expect(res.status).toBe(400);
    expect(scheduleViewingMock).not.toHaveBeenCalled();
  });

  test('returns 500 when a unit has no id/code/unitId', async () => {
    const res = await POST(makeReq({ leadId: 'lead-1', units: [{ title: 'No ID Villa' }] }));
    expect(res.status).toBe(500);
  });
});
