import { GET } from '../app/api/webhooks/whatsapp/route';
import { NextRequest } from 'next/server';

describe('WhatsApp Webhook API Endpoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, WHATSAPP_VERIFY_TOKEN: 'sierra_webhook_token_123' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('verifies webhook subscription challenge correctly', async () => {
    const url = 'http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=sierra_webhook_token_123&hub.challenge=11223344';
    const req = new NextRequest(url, { method: 'GET' });

    const response = await GET(req);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe('11223344');
  });

  it('rejects invalid verify token on GET', async () => {
    const url = 'http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=11223344';
    const req = new NextRequest(url, { method: 'GET' });

    const response = await GET(req);
    const data = await response.json();
    expect(data.status).toBe('Sierra Estates Webhook Active');
  });
});
