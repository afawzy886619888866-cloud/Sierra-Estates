/**
 * WhatsApp QR Gateway Route — Unit & Integration Tests
 * File: apps/sierra-estates-realty/__tests__/whatsapp-qr-gateway.test.ts
 */

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

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockQrData,
    } as Response);

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('qr_ready');
    expect(data.qrCode).toBe(mockQrData.qrCode);
    expect(data.sessionId).toBe('bfd8dee0-8047-4a9b-9bca-f99909f2ea1e');
    expect(data.serverUrl).toContain(':3000');
  });

  it('returns connected status payload when session is already authenticated', async () => {
    // 1st call to /qr fails (e.g. 404 because device is already linked)
    // 2nd call to session details returns connected
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'connected' }),
      } as Response);

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('connected');
    expect(data.message).toBe('WhatsApp Connected!');
    expect(data.qrCode).toBeNull();
  });

  it('returns 502 Bad Gateway when fetch throws network error', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Connection refused to OpenWA'));

    const response = await GET();
    expect(response.status).toBe(502);

    const data = await response.json();
    expect(data.error).toBe('Connection refused to OpenWA');
  });
});
