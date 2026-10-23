/**
 * Tests: the fail-closed contract of the inbound webhooks.
 *
 *   POST /api/webhooks/whatsapp   (SBR_SECRET_KEY)
 *   POST /api/ingest/whatsapp     (SBR_SECRET_KEY)
 *   POST /api/telegram/webhook    (TELEGRAM_WEBHOOK_SECRET)
 *
 * All three were once guarded by `if (SECRET) { ...check... }`, which is
 * FAIL-OPEN: with the secret unset the check disappeared and anyone could post
 * into the listing parser / the bot. Each must now behave identically:
 *
 *   secret unset + production → 503   (misconfigured, not open)
 *   wrong secret              → 401
 *   correct secret            → handler runs
 *
 * `lib/server/webhook-auth.ts` captures IS_PROD at import time, so every case
 * sets NODE_ENV and then imports the route through `jest.resetModules()`.
 */
import { NextRequest } from 'next/server';

const parseMessage = jest.fn().mockResolvedValue({ isListing: false });
const processIncomingMessage = jest.fn().mockResolvedValue({ id: 'listing-1' });
const processDirectMessage = jest.fn().mockResolvedValue('reply');
const recordHeartbeat = jest.fn().mockResolvedValue(true);
const insertRecordMock = jest.fn().mockResolvedValue({ id: 'doc-1' });
// No existing row, so the dedupe lookup misses and the handler inserts.
const listRecordsMock = jest.fn().mockResolvedValue([]);

jest.mock('@sierra-estates/db', () => ({
  insertRecord: (...a: unknown[]) => insertRecordMock(...a),
  listRecords: (...a: unknown[]) => listRecordsMock(...a),
}));

jest.mock('@/lib/services/WhatsAppStatusService', () => ({
  WhatsAppStatusService: { recordHeartbeat: (...a: unknown[]) => recordHeartbeat(...a) },
}));

jest.mock('@/lib/services/WhatsAppParserService', () => ({
  WhatsAppParserService: {
    parseMessage: (...a: unknown[]) => parseMessage(...a),
    processIncomingMessage: (...a: unknown[]) => processIncomingMessage(...a),
  },
}));

jest.mock('@/lib/services/WhatsAppConversationalService', () => ({
  WhatsAppConversationalService: {
    processDirectMessage: (...a: unknown[]) => processDirectMessage(...a),
  },
}));

// setup.ts auto-mocks the orchestrator, whose auto-mocked runPipeline returns
// undefined rather than a promise — the route chains .then() on it.
jest.mock('@/lib/services/orchestrator', () => ({
  OrchestratorService: { runPipeline: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/lib/services/sheets-sync', () => ({
  GoogleSheetsSync: { appendRow: jest.fn().mockResolvedValue(true) },
}));

jest.mock('@/lib/server/google-ai', () => ({
  GoogleAIService: { generateContent: jest.fn().mockResolvedValue('') },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_SBR = process.env.SBR_SECRET_KEY;
const ORIGINAL_TG = process.env.TELEGRAM_WEBHOOK_SECRET;

/** NODE_ENV is typed read-only (Next augments ProcessEnv); assign via a widened cast. */
function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

function setEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function post(path: string, headers: Record<string, string>, body: unknown = {}): NextRequest {
  return new NextRequest(`https://sierra-estates.net${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  } as any);
}

/**
 * Each case is: the route module, its secret env var, the header the secret
 * travels in, and a request the handler would accept once past the guard.
 */
const CASES = [
  {
    name: '/api/webhooks/whatsapp',
    module: '../app/api/webhooks/whatsapp/route',
    envVar: 'SBR_SECRET_KEY',
    header: 'x-sbr-secret-key',
    path: '/api/webhooks/whatsapp',
  },
  {
    name: '/api/ingest/whatsapp',
    module: '../app/api/ingest/whatsapp/route',
    envVar: 'SBR_SECRET_KEY',
    header: 'x-sbr-secret-key',
    path: '/api/ingest/whatsapp',
  },
  {
    name: '/api/telegram/webhook',
    module: '../app/api/telegram/webhook/route',
    envVar: 'TELEGRAM_WEBHOOK_SECRET',
    header: 'x-telegram-bot-api-secret-token',
    path: '/api/telegram/webhook',
  },
] as const;

async function loadRoute(modulePath: string, nodeEnv: string) {
  setNodeEnv(nodeEnv);
  jest.resetModules();
  const mod = await import(modulePath);
  return mod.POST as (req: NextRequest) => Promise<Response>;
}

beforeEach(() => {
  jest.clearAllMocks();
  parseMessage.mockResolvedValue({ isListing: false });
  listRecordsMock.mockResolvedValue({ empty: true, docs: [] });
  recordHeartbeat.mockResolvedValue(true);
});

afterEach(() => {
  setNodeEnv(ORIGINAL_NODE_ENV);
  setEnv('SBR_SECRET_KEY', ORIGINAL_SBR);
  setEnv('TELEGRAM_WEBHOOK_SECRET', ORIGINAL_TG);
});

describe.each(CASES)('$name — fail-closed shared-secret guard', (c) => {
  it('returns 503 in production when the secret is not configured', async () => {
    setEnv(c.envVar, undefined);
    const POST = await loadRoute(c.module, 'production');

    const res = await POST(post(c.path, {}));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      error: `Webhook is not configured (${c.envVar} is unset)`,
    });
  });

  it('returns 503 in production even when the caller sends a guessed secret', async () => {
    setEnv(c.envVar, undefined);
    const POST = await loadRoute(c.module, 'production');

    const res = await POST(post(c.path, { [c.header]: 'guess' }));

    expect(res.status).toBe(503);
  });

  it('does not run the handler when the secret is unconfigured in production', async () => {
    setEnv(c.envVar, undefined);
    const POST = await loadRoute(c.module, 'production');

    await POST(post(c.path, {}, { message: 'شقة للايجار في ايستاون', from: '+201000000000' }));

    expect(parseMessage).not.toHaveBeenCalled();
    expect(processIncomingMessage).not.toHaveBeenCalled();
    expect(insertRecordMock).not.toHaveBeenCalled();
    expect(recordHeartbeat).not.toHaveBeenCalled();
  });

  it('returns 401 for a wrong secret', async () => {
    setEnv(c.envVar, 'right-secret');
    const POST = await loadRoute(c.module, 'production');

    const res = await POST(post(c.path, { [c.header]: 'wrong-secret' }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 for a same-length-but-different secret', async () => {
    setEnv(c.envVar, 'right-secret');
    const POST = await loadRoute(c.module, 'production');

    expect((await POST(post(c.path, { [c.header]: 'right-secreT' }))).status).toBe(401);
  });

  it('returns 401 when the secret is configured but no header is sent', async () => {
    setEnv(c.envVar, 'right-secret');
    const POST = await loadRoute(c.module, 'production');

    expect((await POST(post(c.path, {}))).status).toBe(401);
  });

  it('does not run the handler when the secret is wrong', async () => {
    setEnv(c.envVar, 'right-secret');
    const POST = await loadRoute(c.module, 'production');

    await POST(post(c.path, { [c.header]: 'wrong-secret' }, { message: 'hello' }));

    expect(parseMessage).not.toHaveBeenCalled();
    expect(processIncomingMessage).not.toHaveBeenCalled();
    expect(insertRecordMock).not.toHaveBeenCalled();
    expect(recordHeartbeat).not.toHaveBeenCalled();
  });

  it('proceeds past the guard with the correct secret', async () => {
    setEnv(c.envVar, 'right-secret');
    const POST = await loadRoute(c.module, 'production');

    const res = await POST(post(c.path, { [c.header]: 'right-secret' }, {}));

    // The handler ran: whatever it decides about an empty payload, it is not
    // one of the guard's own rejections.
    expect([401, 503]).not.toContain(res.status);
  });

  it('allows an unconfigured secret through outside production, for local dev', async () => {
    setEnv(c.envVar, undefined);
    const POST = await loadRoute(c.module, 'development');

    const res = await POST(post(c.path, {}, {}));

    expect([401, 503]).not.toContain(res.status);
  });
});

describe('/api/ingest/whatsapp — handler reached with a valid secret', () => {
  it('parses and stores a listing once past the guard', async () => {
    setEnv('SBR_SECRET_KEY', 'right-secret');
    parseMessage.mockResolvedValue({ isListing: true, price: 45000, compound: 'Eastown' });
    const POST = await loadRoute('../app/api/ingest/whatsapp/route', 'production');

    const res = await POST(
      post(
        '/api/ingest/whatsapp',
        { 'x-sbr-secret-key': 'right-secret' },
        { message: 'Apartment in Eastown for 45000', sender: '+201000000000' },
      ),
    );

    expect(res.status).toBe(200);
    expect(parseMessage).toHaveBeenCalledWith('Apartment in Eastown for 45000');
    expect(insertRecordMock).toHaveBeenCalled();
  });

  it('rejects an authenticated request with no message content as 400, not 401', async () => {
    setEnv('SBR_SECRET_KEY', 'right-secret');
    const POST = await loadRoute('../app/api/ingest/whatsapp/route', 'production');

    const res = await POST(post('/api/ingest/whatsapp', { 'x-sbr-secret-key': 'right-secret' }, {}));

    expect(res.status).toBe(400);
  });
});

describe('/api/webhooks/whatsapp — handler reached with a valid secret', () => {
  it('records a heartbeat and routes a group message to the parser', async () => {
    setEnv('SBR_SECRET_KEY', 'right-secret');
    const POST = await loadRoute('../app/api/webhooks/whatsapp/route', 'production');

    const res = await POST(
      post(
        '/api/webhooks/whatsapp',
        { 'x-sbr-secret-key': 'right-secret' },
        { message: { text: 'Villa in Katameya' }, isGroup: true, from: 'broker-1' },
      ),
    );

    expect(res.status).toBe(200);
    expect(recordHeartbeat).toHaveBeenCalled();
    expect(processIncomingMessage).toHaveBeenCalled();
  });
});
