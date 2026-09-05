/**
 * Tests: lib/server/cron-auth.ts
 *
 * `verifyCronRequest` is the reference fail-closed pattern the webhook guards
 * (`lib/server/webhook-auth.ts`) were modelled on, so its contract is pinned
 * exactly here:
 *
 *   CRON_SECRET unset + production  → 503 (misconfigured, NOT open)
 *   CRON_SECRET unset + non-prod    → allowed through (local `pnpm dev`)
 *   CRON_SECRET set + match         → allowed through
 *   CRON_SECRET set + mismatch      → 401
 *
 * The historic bug was `if (secret && header !== ...)` — fail-OPEN, which left
 * every /api/cron/* route publicly triggerable on an unconfigured deployment.
 *
 * Both CRON_SECRET and NODE_ENV are read inside the function, so these tests
 * mutate the env directly rather than re-importing the module.
 */
import { verifyCronRequest } from '../lib/server/cron-auth';

const ORIGINAL_SECRET = process.env.CRON_SECRET;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

/** NODE_ENV is typed read-only (Next augments ProcessEnv); assign via a widened cast. */
function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

function request(headers: Record<string, string> = {}): Request {
  return new Request('https://sierra-estates.net/api/cron/sync-leads', { headers });
}

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_SECRET;
  setNodeEnv(ORIGINAL_NODE_ENV);
});

describe('verifyCronRequest — CRON_SECRET unset', () => {
  beforeEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('fails closed with 503 in production', async () => {
    setNodeEnv('production');

    const denied = verifyCronRequest(request());

    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(503);
    await expect(denied!.json()).resolves.toEqual({ error: 'Cron is not configured' });
  });

  it('still fails closed in production even when a Bearer header is supplied', () => {
    setNodeEnv('production');

    // No secret is configured, so there is nothing to match against: a caller
    // cannot talk its way past the misconfiguration by guessing a token.
    expect(verifyCronRequest(request({ authorization: 'Bearer anything' }))!.status).toBe(503);
  });

  it('allows the request through outside production', () => {
    setNodeEnv('development');

    expect(verifyCronRequest(request())).toBeNull();
  });

  it('allows the request through when NODE_ENV is test', () => {
    setNodeEnv('test');

    expect(verifyCronRequest(request())).toBeNull();
  });

  it('treats an empty-string CRON_SECRET as unset (no empty-header match)', () => {
    process.env.CRON_SECRET = '';
    setNodeEnv('production');

    expect(verifyCronRequest(request({ authorization: 'Bearer ' }))!.status).toBe(503);
  });
});

describe('verifyCronRequest — CRON_SECRET set', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'cron-s3cret';
  });

  it('allows a request carrying the matching Bearer token', () => {
    expect(verifyCronRequest(request({ authorization: 'Bearer cron-s3cret' }))).toBeNull();
  });

  it('allows the matching token in production too', () => {
    setNodeEnv('production');

    expect(verifyCronRequest(request({ authorization: 'Bearer cron-s3cret' }))).toBeNull();
  });

  it('rejects a mismatched token with 401', async () => {
    const denied = verifyCronRequest(request({ authorization: 'Bearer wrong-secret' }));

    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(401);
    await expect(denied!.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('rejects a same-length-but-different token', () => {
    // Same byte length as `Bearer cron-s3cret`, so only a real comparison
    // (not a length check) can tell them apart.
    expect(verifyCronRequest(request({ authorization: 'Bearer cron-s3crea' }))!.status).toBe(401);
  });

  it('rejects a missing Authorization header with 401', () => {
    expect(verifyCronRequest(request())!.status).toBe(401);
  });

  it('rejects the bare secret without the Bearer prefix', () => {
    expect(verifyCronRequest(request({ authorization: 'cron-s3cret' }))!.status).toBe(401);
  });

  it('rejects a different auth scheme carrying the secret', () => {
    expect(verifyCronRequest(request({ authorization: 'Basic cron-s3cret' }))!.status).toBe(401);
  });

  it('rejects garbage in the Authorization header', () => {
    expect(verifyCronRequest(request({ authorization: '???' }))!.status).toBe(401);
  });

  it('is case-sensitive on the token', () => {
    expect(verifyCronRequest(request({ authorization: 'Bearer CRON-S3CRET' }))!.status).toBe(401);
  });
});
