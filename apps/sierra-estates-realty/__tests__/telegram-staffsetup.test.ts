/**
 * /staffsetup + /staffstatus in the Telegram webhook — staff role chat
 * self-registration (migration 044).
 *
 * Contract under test:
 *  - when TELEGRAM_STAFF_USER_IDS is UNSET the command is locked for
 *    everyone (fail-closed) and registers nothing;
 *  - a sender NOT on the staff list is refused and registers nothing;
 *  - an authorized sender with a valid role registers THIS chat via
 *    upsertRecord on telegram_role_chats (role key) and gets the
 *    confirmation that doubles as verification;
 *  - a bad role gets usage help and registers nothing;
 *  - a failed registration send is reported honestly, row still kept.
 */
const insertMock = jest.fn();
const listMock = jest.fn();
const countMock = jest.fn();
const upsertMock = jest.fn();
const adminMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  insertRecord: (...args: unknown[]) => insertMock(...args),
  listRecords: (...args: unknown[]) => listMock(...args),
  countRecords: (...args: unknown[]) => countMock(...args),
  upsertRecord: (...args: unknown[]) => upsertMock(...args),
  getSupabaseAdmin: (...args: unknown[]) => adminMock(...args),
}));

import { POST } from '@/app/api/telegram/webhook/route';

const fetchMock = jest.fn();

beforeEach(() => {
  jest.resetModules();
  insertMock.mockReset();
  listMock.mockReset();
  countMock.mockReset();
  upsertMock.mockReset();
  adminMock.mockImplementation(() => ({})); // DB configured
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as unknown as Response);
  global.fetch = fetchMock as unknown as typeof fetch;
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  process.env.TELEGRAM_WEBHOOK_SECRET = 'whsec';
  delete process.env.TELEGRAM_STAFF_USER_IDS;
  delete process.env.TELEGRAM_CEO_CHAT_ID;
  delete process.env.TELEGRAM_TEAM_LEADER_CHAT_ID;
  delete process.env.TELEGRAM_SALES_ADVISOR_CHAT_ID;
});

afterEach(() => {
  delete process.env.TELEGRAM_STAFF_USER_IDS;
});

/** Sends a Telegram update through the webhook with the right secret. */
function makeUpdate(text: string, fromId: number, chatId = -100200) {
  return new Request('http://localhost:3000/api/telegram/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': 'whsec',
    },
    body: JSON.stringify({
      update_id: Math.floor(Math.random() * 1e9),
      message: { text, chat: { id: chatId }, from: { id: fromId, username: 'tester' } },
    }),
  });
}

/** The bot's reply to `chatId`, if any send happened. */
async function botReply(chatId = -100200): Promise<string> {
  const calls = fetchMock.mock.calls.filter(
    (c) => String(c[0]).includes('/sendMessage') &&
      JSON.parse((c[1] as RequestInit).body as string).chat_id === chatId
  );
  return calls.length ? JSON.parse((calls.at(-1)![1] as RequestInit).body as string).text : '';
}

describe('/staffsetup — fail-closed gates', () => {
  it('locks the command for everyone when TELEGRAM_STAFF_USER_IDS is unset', async () => {
    const res = await POST(makeUpdate('/staffsetup ceo', 42) as never);
    expect(res.status).toBe(200);
    expect(await botReply()).toContain('locked');
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('refuses a sender who is not on the staff list', async () => {
    process.env.TELEGRAM_STAFF_USER_IDS = '111, 222';
    const res = await POST(makeUpdate('/staffsetup ceo', 42) as never);
    expect(res.status).toBe(200);
    expect(await botReply()).toContain('Not authorized');
    expect(upsertMock).not.toHaveBeenCalled();
  });
});

describe('/staffsetup — authorized registration', () => {
  it('registers this chat for the role and confirms', async () => {
    process.env.TELEGRAM_STAFF_USER_IDS = '111';
    upsertMock.mockResolvedValue({ role: 'ceo', chatId: '-100200' });

    const res = await POST(makeUpdate('/staffsetup ceo', 111) as never);
    expect(res.status).toBe(200);

    expect(upsertMock).toHaveBeenCalledWith(
      'telegram_role_chats',
      expect.objectContaining({ role: 'ceo', chatId: '-100200', verified: true }),
      'role',
    );
    const reply = await botReply();
    expect(reply).toContain('CEO');
    expect(reply).toContain('registered');
  });

  it('gives usage help for an unknown role and registers nothing', async () => {
    process.env.TELEGRAM_STAFF_USER_IDS = '111';
    const res = await POST(makeUpdate('/staffsetup president', 111) as never);
    expect(res.status).toBe(200);
    expect(await botReply()).toContain('Usage');
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('reports a failed confirmation send honestly (row still registered)', async () => {
    process.env.TELEGRAM_STAFF_USER_IDS = '111';
    upsertMock.mockResolvedValue({ role: 'team_leader', chatId: '-100200' });
    // Call order: 1) the verification send itself → fails;
    //             2) the bot's in-chat reply → succeeds.
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ description: 'Bad Request: chat not found' }),
      } as unknown as Response)
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as unknown as Response);

    const res = await POST(makeUpdate('/staffsetup team_leader', 111) as never);
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalled();
    expect(await botReply()).toContain('failed');
  });
});

describe('/staffstatus', () => {
  it('lists lane status for authorized staff', async () => {
    process.env.TELEGRAM_STAFF_USER_IDS = '111';
    listMock.mockResolvedValue([
      { role: 'ceo', chatId: '-100200' },
    ]);
    const res = await POST(makeUpdate('/staffstatus', 111) as never);
    expect(res.status).toBe(200);
    const reply = await botReply();
    expect(reply).toContain('dispatch lanes');
    expect(reply).toContain('registered');
    expect(reply).toContain('NOT configured');
  });

  it('refuses unauthorized callers', async () => {
    process.env.TELEGRAM_STAFF_USER_IDS = '111';
    await POST(makeUpdate('/staffstatus', 999) as never);
    expect(await botReply()).toContain('Not authorized');
  });
});
