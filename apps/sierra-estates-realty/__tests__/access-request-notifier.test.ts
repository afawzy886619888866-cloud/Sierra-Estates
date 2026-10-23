/**
 * lib/server/access-request-notifier — approval notification contract
 * (Sierra Estates 3.0, Phase 1 extension).
 *
 * Contract under test:
 *  - targets TELEGRAM_ADMIN_CHAT_ID ONLY — never TELEGRAM_CHAT_ID /
 *    @SierraEstatesNewCairo (staff PII must never reach the public channel);
 *  - no token / no admin chat → honest log-only skip, zero network calls;
 *  - HTML message via sendMessage, with a plain-text retry on a 400;
 *  - network / API failures report ok:false with the exact error — never
 *    throw, never fabricate delivery;
 *  - formatters escape user-controlled values (email / name / note).
 */
import {
  notifyAccessRequestCreated,
  notifyAccessRequestDecided,
  formatAccessRequestNotification,
  formatAccessDecisionNotification,
  resolveTelegramAdminChat,
} from '../lib/server/access-request-notifier';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
  process.env.TELEGRAM_ADMIN_CHAT_ID = '-1001999888777';
});

afterEach(() => {
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_ADMIN_CHAT_ID;
  delete process.env.TELEGRAM_CHAT_ID;
});

function okResponse(body: Record<string, unknown>) {
  return { ok: true, json: async () => body } as unknown as Response;
}

function apiError(description: string, status = 400) {
  return { ok: false, status, json: async () => ({ ok: false, description }) } as unknown as Response;
}

describe('resolveTelegramAdminChat', () => {
  it('never falls back to TELEGRAM_CHAT_ID or the public channel', () => {
    process.env.TELEGRAM_CHAT_ID = '@SierraEstatesNewCairo';
    delete process.env.TELEGRAM_ADMIN_CHAT_ID;
    const { chatId } = resolveTelegramAdminChat();
    expect(chatId).toBe('');
  });
});

describe('notifyAccessRequestCreated — honest degradation', () => {
  it('skips with zero network calls when the bot token is absent', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const result = await notifyAccessRequestCreated({
      email: 'someone@example.com',
      fullName: 'Someone',
      provider: 'google',
    });
    expect(result).toMatchObject({ attempted: false, channel: 'log-only', ok: false });
    expect(result.error).toContain('TELEGRAM_BOT_TOKEN');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips when only the admin chat id is absent (token present)', async () => {
    delete process.env.TELEGRAM_ADMIN_CHAT_ID;
    const result = await notifyAccessRequestCreated({
      email: 'someone@example.com',
      fullName: 'Someone',
      provider: 'google',
    });
    expect(result.attempted).toBe(false);
    expect(result.channel).toBe('log-only');
    expect(result.error).toContain('TELEGRAM_ADMIN_CHAT_ID');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('notifyAccessRequestCreated — live send', () => {
  it('sends an HTML message to the admin chat with the request details', async () => {
    fetchMock.mockResolvedValue(okResponse({ ok: true, result: { message_id: 42 } }));

    const result = await notifyAccessRequestCreated({
      email: 'requester@sierra-estates.net',
      fullName: 'Mona Adel',
      provider: 'google',
      requestedAt: '2026-10-17T09:30:00.000Z',
    });

    expect(result).toMatchObject({ attempted: true, channel: 'telegram-admin-chat', ok: true, messageId: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.telegram.org/bottest-bot-token/sendMessage');
    expect(init.method).toBe('POST');
    const payload = JSON.parse(String(init.body));
    expect(payload.chat_id).toBe('-1001999888777');
    expect(payload.parse_mode).toBe('HTML');
    expect(payload.text).toContain('NEW PORTAL ACCESS REQUEST');
    expect(payload.text).toContain('requester@sierra-estates.net');
    expect(payload.text).toContain('Mona Adel');
    expect(payload.text).toContain('google');
    // The target is the admin chat — never the public listings channel.
    expect(String(payload.chat_id)).not.toContain('SierraEstatesNewCairo');
  });

  it('retries once in plain text when Telegram rejects the HTML markup', async () => {
    fetchMock
      .mockResolvedValueOnce(apiError("Bad Request: can't parse entities"))
      .mockResolvedValueOnce(okResponse({ ok: true, result: { message_id: 43 } }));

    const result = await notifyAccessRequestCreated({
      email: 'x@example.com',
      fullName: 'X',
      provider: 'magic-link',
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryPayload = JSON.parse(((fetchMock.mock.calls[1] as unknown[])[1] as { body: string }).body);
    expect(retryPayload.parse_mode).toBeUndefined();
    expect(retryPayload.text).toContain('x@example.com');
  });

  it('reports ok:false honestly when Telegram answers a hard error', async () => {
    fetchMock.mockResolvedValue(apiError('Unauthorized', 401));

    const result = await notifyAccessRequestCreated({
      email: 'x@example.com',
      fullName: 'X',
      provider: 'google',
    });

    expect(result).toMatchObject({ attempted: true, ok: false });
    expect(result.error).toContain('Unauthorized');
    // No fabricated delivery: exactly the HTML attempt (plain retry is for 400s only).
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports ok:false when the network call itself throws', async () => {
    fetchMock.mockRejectedValue(new Error('fetch failed'));

    const result = await notifyAccessRequestCreated({
      email: 'x@example.com',
      fullName: 'X',
      provider: 'google',
    });

    expect(result.attempted).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('fetch failed');
  });
});

describe('notifyAccessRequestDecided', () => {
  it('alerts the admin chat with the granted role on approval', async () => {
    fetchMock.mockResolvedValue(okResponse({ ok: true, result: { message_id: 7 } }));

    const result = await notifyAccessRequestDecided({
      email: 'requester@sierra-estates.net',
      decision: 'approved',
      grantedRole: 'sales_agent',
      decidedBy: 'owner@sierra-estates.net',
      note: 'verified in person',
    });

    expect(result.ok).toBe(true);
    const payload = JSON.parse(((fetchMock.mock.calls[0] as unknown[])[1] as { body: string }).body);
    expect(payload.text).toContain('ACCESS REQUEST APPROVED');
    expect(payload.text).toContain('sales_agent');
    expect(payload.text).toContain('owner@sierra-estates.net');
  });

  it('alerts with a denial header (no role) on denial', async () => {
    fetchMock.mockResolvedValue(okResponse({ ok: true, result: { message_id: 8 } }));

    const result = await notifyAccessRequestDecided({
      email: 'requester@sierra-estates.net',
      decision: 'denied',
      decidedBy: 'owner@sierra-estates.net',
    });

    expect(result.ok).toBe(true);
    const payload = JSON.parse(((fetchMock.mock.calls[0] as unknown[])[1] as { body: string }).body);
    expect(payload.text).toContain('ACCESS REQUEST DENIED');
    expect(payload.text).not.toContain('Granted role');
  });

  it('never throws — even when completely unconfigured', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_ADMIN_CHAT_ID;
    await expect(
      notifyAccessRequestDecided({ email: 'x@example.com', decision: 'denied' }),
    ).resolves.toMatchObject({ attempted: false, ok: false });
  });
});

describe('formatters — HTML escaping (§21 + XSS hygiene)', () => {
  it('escapes user-controlled values in the request notification', () => {
    const text = formatAccessRequestNotification({
      email: 'a<b>&c@example.com',
      fullName: 'Name <img src=x onerror=alert(1)>',
      provider: 'google',
    });
    expect(text).not.toContain('<img');
    expect(text).not.toContain('<b>&c@');
    expect(text).toContain('a&lt;b&gt;&amp;c@example.com');
  });

  it('escapes the note in the decision notification and truncates it', () => {
    const text = formatAccessDecisionNotification({
      email: 'x@example.com',
      decision: 'approved',
      grantedRole: 'viewer',
      decidedBy: 'admin@sierra-estates.net',
      note: `${'<script>'.repeat(80)}alert(1)`,
    });
    expect(text).not.toContain('<script>');
    // The note is truncated to 300 source chars before escaping — bounded output.
    expect(text.length).toBeLessThan(2000);
  });
});
