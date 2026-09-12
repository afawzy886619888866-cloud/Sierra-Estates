import { GET } from '@/app/api/whatsapp/qr/route';

describe('/api/whatsapp/qr Route', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
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
    expect(data.serverUrl).toContain(':3000');
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
