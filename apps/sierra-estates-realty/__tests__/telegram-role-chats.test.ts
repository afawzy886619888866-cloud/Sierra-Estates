/**
 * lib/server/telegram-role-chats — role chat resolution for the 3-way
 * viewing dispatch and the inquiries sales lane (migration 044).
 *
 * Contract under test:
 *  - resolution order per role: env override → database row → honest miss;
 *  - env overrides are trimmed and empty strings count as unset;
 *  - database failures (missing table, no credentials) degrade to env-only,
 *    NEVER throw — the dispatch can never break the visitor's 201;
 *  - sendRoleTestMessage: no token → honest failure with zero network calls;
 *    Telegram API error surfaces its description.
 */
const listMock = jest.fn();
const adminMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  listRecords: (...args: unknown[]) => listMock(...args),
  getSupabaseAdmin: (...args: unknown[]) => adminMock(...args),
}));

import {
  envChatIdFor,
  resolveRoleChats,
  resolveRoleChat,
  sendRoleTestMessage,
} from '../lib/server/telegram-role-chats';

const fetchMock = jest.fn();

beforeEach(() => {
  jest.resetModules();
  listMock.mockReset();
  adminMock.mockReset();
  adminMock.mockImplementation(() => ({})); // DB configured by default
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  delete process.env.TELEGRAM_CEO_CHAT_ID;
  delete process.env.TELEGRAM_TEAM_LEADER_CHAT_ID;
  delete process.env.TELEGRAM_SALES_ADVISOR_CHAT_ID;
  delete process.env.TELEGRAM_BOT_TOKEN;
});

describe('envChatIdFor', () => {
  it('returns a trimmed env value', () => {
    process.env.TELEGRAM_CEO_CHAT_ID = '  12345  ';
    expect(envChatIdFor('ceo')).toBe('12345');
  });

  it('treats empty/whitespace env as unset', () => {
    process.env.TELEGRAM_CEO_CHAT_ID = '   ';
    expect(envChatIdFor('ceo')).toBeNull();
  });
});

describe('resolveRoleChats — order and sources', () => {
  it('resolves env overrides first, then database rows, then misses', async () => {
    process.env.TELEGRAM_CEO_CHAT_ID = '111';
    listMock.mockResolvedValue([
      { role: 'ceo', chatId: '999' },      // env must WIN over this
      { role: 'team_leader', chatId: '222' }, // db-sourced
      // sales_advisor: nowhere → miss
    ]);

    const result = await resolveRoleChats();

    expect(result).toEqual([
      { role: 'ceo', chatId: '111', source: 'env' },
      { role: 'team_leader', chatId: '222', source: 'database' },
      { role: 'sales_advisor', chatId: null, source: 'none' },
    ]);
  });

  it('ignores unknown roles and blank chat ids from the table', async () => {
    listMock.mockResolvedValue([
      { role: 'intruder', chatId: '666' },
      { role: 'ceo', chatId: '   ' },
    ]);
    const result = await resolveRoleChats();
    expect(result.find((r) => r.role === 'ceo')?.chatId).toBeNull();
  });

  it('degrades to env-only when the DB is unconfigured (never throws)', async () => {
    adminMock.mockImplementation(() => {
      throw new Error('getSupabaseAdmin: SUPABASE_SERVICE_ROLE_KEY missing');
    });
    process.env.TELEGRAM_SALES_ADVISOR_CHAT_ID = '333';

    const result = await resolveRoleChats();

    expect(listMock).not.toHaveBeenCalled();
    expect(result.find((r) => r.role === 'sales_advisor')).toEqual({
      role: 'sales_advisor',
      chatId: '333',
      source: 'env',
    });
    expect(result.find((r) => r.role === 'ceo')?.source).toBe('none');
  });

  it('degrades to env-only when the table read fails (migration not applied)', async () => {
    listMock.mockRejectedValue(new Error('PGRST205: telegram_role_chats not found'));
    process.env.TELEGRAM_TEAM_LEADER_CHAT_ID = '222';

    const result = await resolveRoleChats();

    expect(result.find((r) => r.role === 'team_leader')?.source).toBe('env');
    expect(result.find((r) => r.role === 'ceo')?.source).toBe('none');
  });
});

describe('resolveRoleChat — single role (inquiries sales lane)', () => {
  it('resolves one role from the database with a filtered query', async () => {
    listMock.mockResolvedValue([{ role: 'sales_advisor', chatId: '444' }]);
    const result = await resolveRoleChat('sales_advisor');
    expect(result).toEqual({ role: 'sales_advisor', chatId: '444', source: 'database' });
    expect(listMock).toHaveBeenCalledWith(
      'telegram_role_chats',
      expect.objectContaining({
        where: [{ column: 'role', value: 'sales_advisor' }],
        limit: 1,
      }),
    );
  });

  it('misses honestly when nowhere is configured', async () => {
    listMock.mockResolvedValue([]);
    expect(await resolveRoleChat('ceo')).toEqual({ role: 'ceo', chatId: null, source: 'none' });
  });
});

describe('sendRoleTestMessage', () => {
  it('fails honestly with zero network calls when no bot token', async () => {
    const result = await sendRoleTestMessage('123', 'CEO');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('TELEGRAM_BOT_TOKEN');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces the Telegram API error description on failure', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ description: 'Bad Request: chat not found' }),
    } as unknown as Response);
    const result = await sendRoleTestMessage('123', 'CEO');
    expect(result).toEqual({ ok: false, error: 'Bad Request: chat not found' });
  });

  it('succeeds when Telegram accepts the message', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as unknown as Response);
    const result = await sendRoleTestMessage('123', 'Team Leader');
    expect(result.ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.chat_id).toBe('123');
    expect(body.text).toContain('Team Leader');
  });
});
