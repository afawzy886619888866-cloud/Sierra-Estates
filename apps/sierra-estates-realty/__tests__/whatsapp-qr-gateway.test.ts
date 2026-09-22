import { GET } from '@/app/api/whatsapp/qr/route';

/**
 * /api/whatsapp/qr contract:
 *   - The gateway is env-configured only (OPENWA_HOST + OPENWA_ADMIN_API_KEY).
 *     With no configuration the route fails closed with 503 not_configured —
 *     it never guesses at a host, and it never leaks the internal gateway
 *     host/IP or serverUrl to the caller.
 *   - When configured: QR data is proxied as-is (200 qr_ready), an
 *     authenticated session reports "connected", and a network failure is a
 *     502 with the gateway's error message.
 */

const GATEWAY_ENV = {
  OPENWA_HOST: process.env.OPENWA_HOST,
  OPENWA_ADMIN_API_KEY: process.env.OPENWA_ADMIN_API_KEY,
};

describe('/api/whatsapp/qr Route', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.OPENWA_HOST = 'openwa-gateway.internal';
    process.env.OPENWA_ADMIN_API_KEY = 'test-gateway-api-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(GATEWAY_ENV)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    jest.clearAllMocks();
  });

  it('fails closed with 503 not_configured when the gateway env is absent', async () => {
    delete process.env.OPENWA_HOST;
    delete process.env.OPENWA_ADMIN_API_KEY;

    const response = await GET();
    expect(response.status).toBe(503);

    const data = await response.json();
    expect(data.status).toBe('not_configured');
    expect(data.qrCode).toBeNull();
    // No internal infrastructure details may leak in the refusal.
    expect(data.serverUrl).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('openwa-gateway.internal');
  });

  it('returns qrCode and status when OpenWA returns valid QR data', async () => {
    const mockQrData = {
      status: 'qr_ready',
      qrCode: 'data:image/png;base64,mockValidBase64QrCodeString',
    };

    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('/qr')) {
        return {
          ok: true,
          json: async () => mockQrData,
        } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => [{ id: '3e5c5f78-da22-4793-bd51-d648b552cd17' }],
      } as unknown as Response;
    });

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('qr_ready');
    expect(data.qrCode).toBe(mockQrData.qrCode);
    expect(typeof data.sessionId).toBe('string');
    // The internal gateway URL is no longer echoed back to the client.
    expect(data.serverUrl).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('openwa-gateway.internal');
  });

  it('returns connected status payload when session is already authenticated', async () => {
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('/qr')) {
        return {
          ok: false,
          status: 404,
        } as unknown as Response;
      }
      if (typeof url === 'string' && (url.endsWith('/sessions') || url.includes('/sessions?'))) {
        return {
          ok: true,
          json: async () => [{ id: '3e5c5f78-da22-4793-bd51-d648b552cd17' }],
        } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({ status: 'connected' }),
      } as unknown as Response;
    });

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('connected');
    expect(data.message).toBe('WhatsApp Connected!');
    expect(data.qrCode).toBeNull();
  });

  it('returns 502 Bad Gateway when fetch throws network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused to OpenWA'));

    const response = await GET();
    expect(response.status).toBe(502);

    const data = await response.json();
    expect(data.error).toBe('Connection refused to OpenWA');
  });
});
