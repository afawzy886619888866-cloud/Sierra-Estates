import { NextRequest } from 'next/server';
import { GET, POST } from '../app/api/webhooks/telegram/route';
import * as telegramController from '../lib/services/telegram-controller';

jest.mock('../lib/services/telegram-controller', () => ({
  handleTelegramCommand: jest.fn().mockResolvedValue(undefined),
  sendTelegramMessage: jest.fn().mockResolvedValue(undefined),
}));

describe('Telegram Webhook Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
  });

  it('responds with 200 and service health on GET', async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('active');
    expect(body.service).toContain('Telegram Command OS');
  });

  it('rejects POST with 401 if secret header does not match', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'super-secret-token';

    const req = new NextRequest('http://localhost:3000/api/webhooks/telegram', {
      method: 'POST',
      headers: {
        'x-telegram-bot-api-secret-token': 'wrong-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ message: { text: '/start', chat: { id: 12345 } } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('processes slash command when payload is valid', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/telegram', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          text: '/score SE-MV-101',
          chat: { id: 987654 },
          from: { username: 'testuser' },
        },
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(telegramController.handleTelegramCommand).toHaveBeenCalledWith(
      '/score',
      ['SE-MV-101'],
      '987654'
    );
  });

  it('routes natural language inquiry for leads to /leads command', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/telegram', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          text: 'Show me the latest leads please',
          chat: { id: 987654 },
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(telegramController.handleTelegramCommand).toHaveBeenCalledWith(
      '/leads',
      [],
      '987654'
    );
  });
});
