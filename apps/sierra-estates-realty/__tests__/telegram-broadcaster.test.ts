/**
 * lib/server/telegram-broadcaster — Telegram channel broadcast worker
 * (Sierra Estates 3.0, Phase 2).
 *
 * Contract under test:
 *  - photo album via sendMediaGroup with the caption on the FIRST photo;
 *  - single photo → sendPhoto; no photos → sendMessage;
 *  - caption truncation to Telegram's 1024-char media limit;
 *  - malformed-markup 400 → one plain retry;
 *  - no TELEGRAM_BOT_TOKEN → honest skip, zero network calls.
 */
import { sendListingToTelegramChannel, resolveTelegramChannel } from '../lib/server/telegram-broadcaster';

const UNIT = { compound: 'Hyde Park', dealType: 'rent', code: 'SE-RNT-HYD-0014' };

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
  process.env.TELEGRAM_CHAT_ID = '@SierraEstatesNewCairo';
});

afterEach(() => {
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
});

function okResponse(body: Record<string, unknown>) {
  return {
    ok: true,
    json: async () => body,
  } as unknown as Response;
}

function badRequest(description = "Bad Request: can't parse entities") {
  return {
    ok: false,
    status: 400,
    json: async () => ({ ok: false, description }),
  } as unknown as Response;
}

describe('resolveTelegramChannel', () => {
  it('defaults the channel to @SierraEstatesNewCairo when unset', () => {
    delete process.env.TELEGRAM_CHAT_ID;
    const { chatId } = resolveTelegramChannel();
    expect(chatId).toBe('@SierraEstatesNewCairo');
  });
});

describe('sendListingToTelegramChannel — no token (honest skip)', () => {
  it('reports skipped without any network call', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const result = await sendListingToTelegramChannel(UNIT, 'caption', ['https://cdn.example/p1.jpg']);
    expect(result.skipped).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.mode).toBe('none');
    expect(result.error).toContain('TELEGRAM_BOT_TOKEN');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('sendListingToTelegramChannel — photo album (sendMediaGroup)', () => {
  it('sends the album with the caption riding the first photo', async () => {
    fetchMock.mockResolvedValueOnce(
      okResponse({ ok: true, result: [{ message_id: 11 }, { message_id: 12 }] }),
    );
    const result = await sendListingToTelegramChannel(UNIT, 'شقة فاخرة في هايد بارك', [
      'https://cdn.example/p1.jpg',
      'https://cdn.example/p2.jpg',
      'https://cdn.example/p3.jpg',
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bottest-bot-token/sendMediaGroup');
    const body = JSON.parse(init.body);
    expect(body.chat_id).toBe('@SierraEstatesNewCairo');
    expect(body.media).toHaveLength(3);
    expect(body.media[0].caption).toContain('شقة فاخرة');
    expect(body.media[0].parse_mode).toBe('HTML');
    expect(body.media[1].caption).toBeUndefined();
    expect(result.mode).toBe('media-group');
    expect(result.ok).toBe(true);
    expect(result.messageId).toBe(11);
    expect(result.mediaMessageIds).toEqual([11, 12]);
  });

  it('caps the album at 10 photos and drops non-http URLs', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ ok: true, result: [{ message_id: 1 }] }));
    const urls = Array.from({ length: 14 }, (_, i) =>
      i === 5 ? 'not-a-url' : `https://cdn.example/p${i}.jpg`,
    );
    await sendListingToTelegramChannel(UNIT, 'caption', urls);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.media).toHaveLength(10);
    expect(body.media.every((m: { media: string }) => m.media.startsWith('https://'))).toBe(true);
  });

  it('truncates captions beyond the 1024 media limit', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ ok: true, result: [{ message_id: 9 }] }));
    const longCaption = 'x'.repeat(3000);
    const result = await sendListingToTelegramChannel(UNIT, longCaption, [
      'https://cdn.example/a.jpg',
      'https://cdn.example/b.jpg',
    ]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.media[0].caption.length).toBeLessThanOrEqual(1024);
    expect(body.media[0].caption.endsWith('…')).toBe(true);
    expect(result.captionTruncated).toBe(true);
  });

  it('retries once without parse_mode when Telegram rejects the markup', async () => {
    fetchMock
      .mockResolvedValueOnce(badRequest("Bad Request: can't parse entities"))
      .mockResolvedValueOnce(okResponse({ ok: true, result: [{ message_id: 21 }] }));
    const result = await sendListingToTelegramChannel(UNIT, 'caption <weird> & stuff', [
      'https://cdn.example/a.jpg',
      'https://cdn.example/b.jpg',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(retryBody.media[0].parse_mode).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('media-group');
  });

  it('falls back to a text message when the album fails entirely', async () => {
    fetchMock
      .mockResolvedValueOnce(badRequest('Bad Request: wrong file identifier'))
      .mockResolvedValueOnce(badRequest('Bad Request: wrong file identifier'))
      .mockResolvedValueOnce(okResponse({ ok: true, result: { message_id: 31 } }));
    const result = await sendListingToTelegramChannel(UNIT, 'fallback caption', [
      'https://cdn.example/a.jpg',
      'https://cdn.example/b.jpg',
    ]);
    const lastCall = fetchMock.mock.calls[2];
    expect(lastCall[0]).toContain('/sendMessage');
    expect(result.mode).toBe('text');
    expect(result.ok).toBe(true);
  });
});

describe('sendListingToTelegramChannel — single photo', () => {
  it('uses sendPhoto with the caption', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ ok: true, result: { message_id: 41 } }));
    const result = await sendListingToTelegramChannel(UNIT, 'caption', ['https://cdn.example/only.jpg']);
    expect(fetchMock.mock.calls[0][0]).toContain('/sendPhoto');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.photo).toBe('https://cdn.example/only.jpg');
    expect(body.caption).toBe('caption');
    expect(result.mode).toBe('photo');
    expect(result.ok).toBe(true);
  });
});

describe('sendListingToTelegramChannel — no photos', () => {
  it('falls back to sendMessage with the full text (4096 limit)', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ ok: true, result: { message_id: 51 } }));
    const result = await sendListingToTelegramChannel(UNIT, 'إعلان نصي كامل', []);
    expect(fetchMock.mock.calls[0][0]).toContain('/sendMessage');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toBe('إعلان نصي كامل');
    expect(result.mode).toBe('text');
    expect(result.ok).toBe(true);
  });
});

describe('sendListingToTelegramChannel — hard failures are honest', () => {
  it('reports the Telegram error description on 403 (bot kicked from channel)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ ok: false, description: 'Forbidden: bot is not a member of the channel chat' }),
    } as unknown as Response);
    const result = await sendListingToTelegramChannel(UNIT, 'caption', []);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Forbidden');
  });
});
