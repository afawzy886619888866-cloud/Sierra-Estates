const recordHeartbeatMock = jest.fn();

jest.mock('@/lib/services/WhatsAppStatusService', () => ({
  WhatsAppStatusService: {
    recordHeartbeat: (...args: unknown[]) => recordHeartbeatMock(...args),
  },
}));

import { GET, POST } from '@/app/api/whatsapp/heartbeat/route';

describe('/api/whatsapp/heartbeat route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET returns endpoint status payload', async () => {
    const req = new Request('http://localhost:3000/api/whatsapp/heartbeat');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 'heartbeat endpoint active' });
  });

  test('POST records active heartbeat and returns ok payload', async () => {
    recordHeartbeatMock.mockResolvedValue(undefined);

    const req = new Request('http://localhost:3000/api/whatsapp/heartbeat', { method: 'POST' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(recordHeartbeatMock).toHaveBeenCalledWith('active');
    expect(body.ok).toBe(true);
    expect(typeof body.ts).toBe('string');
  });
});
