/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const verifyAdminRequestMock = jest.fn();
jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: (...args: unknown[]) => verifyAdminRequestMock(...args),
  unauthorizedResponse: (msg?: string) =>
    new Response(JSON.stringify({ error: msg || 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
}));

const insertRecordMock = jest.fn().mockResolvedValue({ id: 'act-1' });
jest.mock('@sierra-estates/db', () => ({
  insertRecord: (...args: unknown[]) => insertRecordMock(...args),
}));

// Mock global fetch for gateway calls
const originalFetch = global.fetch;

describe('POST /api/admin/whatsapp/direct-send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const loadRoute = async () => {
    const mod = await import('../app/api/admin/whatsapp/direct-send/route');
    return mod.POST;
  };

  it('rejects unauthenticated caller with 401', async () => {
    verifyAdminRequestMock.mockResolvedValueOnce({ authenticated: false });
    const POST = await loadRoute();

    const req = new NextRequest('http://localhost:3000/api/admin/whatsapp/direct-send', {
      method: 'POST',
      body: JSON.stringify({ recipients: ['+201001534224'], body: 'Hello' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects missing body or recipients with 400', async () => {
    verifyAdminRequestMock.mockResolvedValueOnce({ authenticated: true, uid: 'admin-1', role: 'admin' });
    const POST = await loadRoute();

    const req = new NextRequest('http://localhost:3000/api/admin/whatsapp/direct-send', {
      method: 'POST',
      body: JSON.stringify({ recipients: [], body: '' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('blocks group recipient safety guardrail', async () => {
    verifyAdminRequestMock.mockResolvedValueOnce({ authenticated: true, uid: 'admin-1', role: 'admin' });
    const POST = await loadRoute();

    const req = new NextRequest('http://localhost:3000/api/admin/whatsapp/direct-send', {
      method: 'POST',
      body: JSON.stringify({
        recipients: ['12036302488888@g.us'],
        body: 'Group blast test',
      }),
    });

    const res = await POST(req);
    const json = await res.json();
    expect(json.sentCount).toBe(0);
    expect(json.results[0].ok).toBe(false);
    expect(json.results[0].error).toContain('Group messaging blocked');
  });

  it('forwards valid direct send to gateway with stealth human emulation', async () => {
    verifyAdminRequestMock.mockResolvedValueOnce({
      authenticated: true,
      uid: 'admin-1',
      email: 'admin@sierra-estates.net',
      role: 'admin',
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: { messageId: 'msg_test_123', status: 'sent', session: 'line-1' },
      }),
    });

    const POST = await loadRoute();

    const req = new NextRequest('http://localhost:3000/api/admin/whatsapp/direct-send', {
      method: 'POST',
      body: JSON.stringify({
        recipients: [{ phone: '+201001534224', name: 'Karim' }],
        body: 'Hello {{name}}, we have a unit for you.',
        sessionId: 'line-1',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.sentCount).toBe(1);
    expect(json.results[0].messageId).toBe('msg_test_123');
    expect(json.results[0].session).toBe('line-1');

    // Verify gateway fetch call target
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sessions/line-1/messages/send-text'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          chatId: '201001534224@c.us',
          text: 'Hello Karim, we have a unit for you.',
        }),
      })
    );

    // Verify activity record insert
    expect(insertRecordMock).toHaveBeenCalledWith(
      'activities',
      expect.objectContaining({
        type: 'whatsapp_direct_sent',
        actorId: 'admin-1',
      })
    );
  });
});
