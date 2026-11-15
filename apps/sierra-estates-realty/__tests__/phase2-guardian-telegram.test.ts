/**
 * Phase 2 Gate Tests — WhatsApp Session Guardian, Outreach Dead-Letter Backoff,
 * Group-Only Guard, Telegram Inbound Audit Log & UNASSIGNED_DISPATCH_FALLBACK.
 */

const mockInsertRecord = jest.fn();
const mockListRecords = jest.fn();
const mockGetSupabaseAdmin = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  __esModule: true,
  insertRecord: (...args: unknown[]) => mockInsertRecord(...args),
  listRecords: (...args: unknown[]) => mockListRecords(...args),
  getSupabaseAdmin: () => mockGetSupabaseAdmin(),
}));

import {
  shouldForwardGroupListing,
  computeBackoffIso,
  handleSocketStateChange,
  enqueueOutreachDeadLetter,
} from '@/lib/server/session-guardian';
import {
  resolveRoleChat,
  resolveRoleChats,
  getUnassignedDispatchFallback,
} from '@/lib/server/telegram-role-chats';
import { POST as telegramWebhookPost } from '@/app/api/telegram/webhook/route';

describe('Phase 2: Session Guardian & Telegram Fallback', () => {
  const savedEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...savedEnv };
    delete process.env.TELEGRAM_CEO_CHAT_ID;
    delete process.env.TELEGRAM_TEAM_LEADER_CHAT_ID;
    delete process.env.TELEGRAM_SALES_ADVISOR_CHAT_ID;
    delete process.env.UNASSIGNED_DISPATCH_FALLBACK;
    delete process.env.TELEGRAM_GENERAL_CHAT_ID;
    delete process.env.TELEGRAM_ADMIN_CHAT_ID;
    delete process.env.TELEGRAM_CHAT_ID;
    mockInsertRecord.mockResolvedValue({ id: 'row-1' });
    mockListRecords.mockResolvedValue([]);
  });

  afterAll(() => {
    process.env = savedEnv;
    global.fetch = originalFetch;
  });

  test('shouldForwardGroupListing enforces group-only chat guard (!chat.isGroup -> false)', () => {
    expect(shouldForwardGroupListing(null)).toBe(false);
    expect(shouldForwardGroupListing(undefined)).toBe(false);
    expect(shouldForwardGroupListing({ id: '201092048333@c.us', isGroup: false })).toBe(false);
    expect(shouldForwardGroupListing({ id: '120363000001@g.us', isGroup: true })).toBe(true);
  });

  test('handleSocketStateChange sends urgent Telegram QR/pairing alert on disconnected or loggedOut', async () => {
    process.env.ROLE_MANAGEMENT_CHAT_ID = '-100999888777';
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';

    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const readyOutcome = await handleSocketStateChange({
      lineId: 'line-1',
      state: 'READY',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(readyOutcome.alertSent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    const downOutcome = await handleSocketStateChange({
      lineId: 'line-4',
      state: 'loggedOut',
      pairingCode: 'ABCD-1234',
      qrCode: 'https://runner.local/pair?line=line-4',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(downOutcome.alertSent).toBe(true);
    expect(downOutcome.recipientChatId).toBe('-100999888777');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.chat_id).toBe('-100999888777');
    expect(body.text).toContain('line-4');
    expect(body.text).toContain('loggedOut');
    expect(body.text).toContain('ABCD-1234');
  });

  test('enqueueOutreachDeadLetter writes to outreach_dead_letter_queue with 1h, 4h, 24h backoff tiers', async () => {
    const baseMs = Date.UTC(2026, 10, 15, 12, 0, 0);

    expect(computeBackoffIso(1, baseMs)).toBe(new Date(baseMs + 1 * 3600 * 1000).toISOString());
    expect(computeBackoffIso(2, baseMs)).toBe(new Date(baseMs + 4 * 3600 * 1000).toISOString());
    expect(computeBackoffIso(3, baseMs)).toBe(new Date(baseMs + 24 * 3600 * 1000).toISOString());

    const res = await enqueueOutreachDeadLetter({
      phone: '+201012345678',
      listingCode: 'SE-MV-S-200-111',
      sessionName: 'line-3',
      errorMessage: 'ECONNREFUSED gateway :2785',
      attempts: 2,
      nowMs: baseMs,
    });

    expect(res.enqueued).toBe(true);
    expect(res.storage).toBe('supabase');
    expect(mockInsertRecord).toHaveBeenCalledWith(
      'outreach_dead_letter_queue',
      expect.objectContaining({
        phone: '+201012345678',
        listing_code: 'SE-MV-S-200-111',
        attempts: 2,
        next_retry_at: new Date(baseMs + 4 * 3600 * 1000).toISOString(),
      }),
    );
  });

  test('resolveRoleChats falls back to UNASSIGNED_DISPATCH_FALLBACK when role chats are unset', async () => {
    process.env.UNASSIGNED_DISPATCH_FALLBACK = '-100555444333';
    expect(getUnassignedDispatchFallback()).toBe('-100555444333');

    const ceo = await resolveRoleChat('ceo');
    expect(ceo).toEqual({
      role: 'ceo',
      chatId: '-100555444333',
      source: 'fallback',
    });

    const all = await resolveRoleChats();
    expect(all.every((r) => r.chatId === '-100555444333' && r.source === 'fallback')).toBe(true);
  });

  test('POST /api/telegram/webhook persists raw payload to inbound_telegram_audit_log and forwards unassigned inquiry', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'sec-123';
    process.env.TELEGRAM_BOT_TOKEN = 'bot-xyz';
    process.env.UNASSIGNED_DISPATCH_FALLBACK = '-100777666555';

    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const payload = {
      update_id: 998877,
      message: {
        chat: { id: 123456, type: 'private' },
        from: { id: 654321 },
        text: 'Need 3br apartment in Mivida',
      },
    };

    const req = new Request('http://localhost/api/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-bot-api-secret-token': 'sec-123',
      },
      body: JSON.stringify(payload),
    });

    const res = await telegramWebhookPost(req as any);
    expect(res.status).toBe(200);
    expect(mockInsertRecord).toHaveBeenCalledWith(
      'inbound_telegram_audit_log',
      expect.objectContaining({
        update_id: 998877,
        chat_id: '123456',
        payload,
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botbot-xyz/sendMessage',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('-100777666555'),
      }),
    );
  });
});
