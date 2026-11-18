const recordHeartbeatMock = jest.fn();

jest.mock('@/lib/services/WhatsAppStatusService', () => ({
  WhatsAppStatusService: {
    recordHeartbeat: (...args: unknown[]) => recordHeartbeatMock(...args),
  },
}));

import { GET, POST } from '@/app/api/whatsapp/heartbeat/route';

// M1 hardening: these suites call guarded route handlers directly. The
// real verifyRequest requires Supabase or the module-load SBR_SECRET_KEY,
// neither available in unit tests — mock it to authenticate exactly the
// test-secret header (unauth-expectation cases still see 401).
jest.mock('@/lib/server/auth-guard', () => {
  const actual = jest.requireActual('@/lib/server/auth-guard');
  const authFrom = (req) => {
    const h = req?.headers?.get?.('x-sbr-secret-key');
    return h && h === 'test-sbr-secret'
      ? { authenticated: true, method: 'secret-key' }
      : { authenticated: false, method: 'none' };
  };
  return {
    ...actual,
    verifyRequest: jest.fn(async (req) => authFrom(req)),
    verifyAdminRequest: jest.fn(async (req) => {
      const a = authFrom(req);
      return a.authenticated ? { ...a, role: 'admin', email: 'test@example.com' } : a;
    }),
  };
});


describe('/api/whatsapp/heartbeat route', () => {
  beforeEach(() => {
    process.env.RUNNER_API_KEY = 'test-runner-key';
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

    const req = new Request('http://localhost:3000/api/whatsapp/heartbeat', {
      method: 'POST',
     headers: { 'x-sbr-secret-key': 'test-sbr-secret' },
      headers: { 'x-sbr-secret-key': 'test-sbr-secret', 'x-runner-key': 'test-runner-key' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(recordHeartbeatMock).toHaveBeenCalledWith('active');
    expect(body.ok).toBe(true);
    expect(typeof body.ts).toBe('string');
  });
});
