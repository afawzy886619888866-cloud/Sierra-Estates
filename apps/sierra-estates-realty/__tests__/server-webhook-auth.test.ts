/**
 * Tests: lib/server/webhook-auth.ts
 *
 * The shared guard behind the WhatsApp / Telegram / Property Finder webhooks.
 * It exists because each of those routes used to inline
 *
 *     if (SECRET) { ...check... }
 *
 * which is FAIL-OPEN: with the secret unset the authentication vanished
 * entirely — precisely the state of a half-configured deployment. The guard
 * now mirrors `verifyCronRequest`: missing secret is a MISCONFIGURATION (503
 * in production), never an open door.
 *
 * NOTE: the module captures IS_PROD at import time, so any production-mode
 * assertion must set NODE_ENV and then re-import via `jest.resetModules()`.
 */
export {};
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

/** NODE_ENV is typed read-only (Next augments ProcessEnv); assign via a widened cast. */
function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

/** Import the module fresh so the module-level IS_PROD picks up NODE_ENV. */
async function loadGuard(nodeEnv: string) {
  setNodeEnv(nodeEnv);
  jest.resetModules();
  return import('../lib/server/webhook-auth');
}

function request(headers: Record<string, string> = {}): Request {
  return new Request('https://sierra-estates.net/api/ingest/whatsapp', {
    method: 'POST',
    headers,
  });
}

afterEach(() => {
  setNodeEnv(ORIGINAL_NODE_ENV);
});

describe('verifySharedSecret — secret not configured', () => {
  it('fails closed with 503 in production', async () => {
    const { verifySharedSecret } = await loadGuard('production');

    const denied = verifySharedSecret(request({ 'x-sbr-secret-key': 'anything' }), {
      header: 'x-sbr-secret-key',
      secret: undefined,
      name: 'SBR_SECRET_KEY',
    });

    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(503);
    await expect(denied!.json()).resolves.toEqual({
      error: 'Webhook is not configured (SBR_SECRET_KEY is unset)',
    });
  });

  it('treats an empty-string secret as unconfigured rather than matching an empty header', async () => {
    const { verifySharedSecret } = await loadGuard('production');

    const denied = verifySharedSecret(request({ 'x-sbr-secret-key': '' }), {
      header: 'x-sbr-secret-key',
      secret: '',
      name: 'SBR_SECRET_KEY',
    });

    expect(denied!.status).toBe(503);
  });

  it('allows the call through outside production so local dev works', async () => {
    const { verifySharedSecret } = await loadGuard('development');

    const denied = verifySharedSecret(request(), {
      header: 'x-sbr-secret-key',
      secret: undefined,
      name: 'SBR_SECRET_KEY',
    });

    expect(denied).toBeNull();
  });
});

describe('verifySharedSecret — secret configured', () => {
  const opts = { header: 'x-sbr-secret-key', secret: 'wh-s3cret', name: 'SBR_SECRET_KEY' };

  it('allows a request whose header matches', async () => {
    const { verifySharedSecret } = await loadGuard('production');

    expect(verifySharedSecret(request({ 'x-sbr-secret-key': 'wh-s3cret' }), opts)).toBeNull();
  });

  it('rejects a mismatched header with 401', async () => {
    const { verifySharedSecret } = await loadGuard('production');

    const denied = verifySharedSecret(request({ 'x-sbr-secret-key': 'nope' }), opts);

    expect(denied!.status).toBe(401);
    await expect(denied!.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('rejects a same-length-but-different header (not just a length check)', async () => {
    const { verifySharedSecret } = await loadGuard('production');

    expect(verifySharedSecret(request({ 'x-sbr-secret-key': 'wh-s3crea' }), opts)!.status).toBe(401);
  });

  it('rejects a missing header with 401 rather than throwing', async () => {
    const { verifySharedSecret } = await loadGuard('production');

    expect(verifySharedSecret(request(), opts)!.status).toBe(401);
  });

  it('enforces the secret outside production too', async () => {
    const { verifySharedSecret } = await loadGuard('test');

    expect(verifySharedSecret(request({ 'x-sbr-secret-key': 'nope' }), opts)!.status).toBe(401);
    expect(verifySharedSecret(request({ 'x-sbr-secret-key': 'wh-s3cret' }), opts)).toBeNull();
  });

  it('reads the header name it was given', async () => {
    const { verifySharedSecret } = await loadGuard('production');

    const tgOpts = {
      header: 'x-telegram-bot-api-secret-token',
      secret: 'tg-s3cret',
      name: 'TELEGRAM_WEBHOOK_SECRET',
    };

    expect(verifySharedSecret(request({ 'x-telegram-bot-api-secret-token': 'tg-s3cret' }), tgOpts)).toBeNull();
    // The right value in the wrong header is not authentication.
    expect(verifySharedSecret(request({ 'x-sbr-secret-key': 'tg-s3cret' }), tgOpts)!.status).toBe(401);
  });
});

describe('verifyHmacSignature', () => {
  const crypto = require('crypto') as typeof import('crypto');
  const secret = 'hmac-s3cret';
  const body = '{"hello":"world"}';
  const good = crypto.createHmac('sha256', secret).update(body).digest('hex');

  it('accepts a correct signature', async () => {
    const { verifyHmacSignature } = await loadGuard('production');

    expect(verifyHmacSignature(body, good, { secret, name: 'X' })).toBeNull();
  });

  it('rejects a signature over a different body', async () => {
    const { verifyHmacSignature } = await loadGuard('production');

    const denied = verifyHmacSignature('{"hello":"tampered"}', good, { secret, name: 'X' });

    expect(denied!.status).toBe(401);
    await expect(denied!.json()).resolves.toEqual({ error: 'Invalid signature' });
  });

  it('rejects a signature made with a different key', async () => {
    const { verifyHmacSignature } = await loadGuard('production');

    const forged = crypto.createHmac('sha256', 'other-key').update(body).digest('hex');

    expect(verifyHmacSignature(body, forged, { secret, name: 'X' })!.status).toBe(401);
  });

  it('rejects a missing signature with 401', async () => {
    const { verifyHmacSignature } = await loadGuard('production');

    const denied = verifyHmacSignature(body, null, { secret, name: 'X' });

    expect(denied!.status).toBe(401);
    await expect(denied!.json()).resolves.toEqual({ error: 'Missing signature' });
  });

  it('rejects a truncated signature without throwing on the length mismatch', async () => {
    const { verifyHmacSignature } = await loadGuard('production');

    expect(verifyHmacSignature(body, good.slice(0, 10), { secret, name: 'X' })!.status).toBe(401);
  });

  it('fails closed with 503 in production when the secret is unset', async () => {
    const { verifyHmacSignature } = await loadGuard('production');

    const denied = verifyHmacSignature(body, good, { secret: undefined, name: 'PF_SECRET' });

    expect(denied!.status).toBe(503);
    await expect(denied!.json()).resolves.toEqual({
      error: 'Webhook is not configured (PF_SECRET is unset)',
    });
  });

  it('allows an unconfigured secret through outside production', async () => {
    const { verifyHmacSignature } = await loadGuard('development');

    expect(verifyHmacSignature(body, null, { secret: undefined, name: 'PF_SECRET' })).toBeNull();
  });
});
