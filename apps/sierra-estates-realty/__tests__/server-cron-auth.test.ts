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
const ORIGINAL_OWNER = process.env.CRON_OWNER_PROJECT_ID;
const ORIGINAL_PROJECT = process.env.VERCEL_PROJECT_ID;

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
  if (ORIGINAL_OWNER === undefined) delete process.env.CRON_OWNER_PROJECT_ID;
  else process.env.CRON_OWNER_PROJECT_ID = ORIGINAL_OWNER;
  if (ORIGINAL_PROJECT === undefined) delete process.env.VERCEL_PROJECT_ID;
  else process.env.VERCEL_PROJECT_ID = ORIGINAL_PROJECT;
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

describe('verifyCronRequest — mirrored-project ownership guard', () => {
  // The client and admin Vercel projects build from the same directory and
  // both register the vercel.json crons; only the client may execute them.
  const CLIENT = 'prj_client11111111111111111111';
  const ADMIN = 'prj_admin11111111111111111111';

  beforeEach(() => {
    process.env.CRON_SECRET = 'cron-s3cret';
    process.env.CRON_OWNER_PROJECT_ID = CLIENT;
  });

  afterEach(() => {
    delete process.env.VERCEL_PROJECT_ID;
    delete process.env.CRON_OWNER_PROJECT_ID;
  });

  it('runs on the owner project', () => {
    process.env.VERCEL_PROJECT_ID = CLIENT;

    expect(verifyCronRequest(request({ authorization: 'Bearer cron-s3cret' }))).toBeNull();
  });

  it('skips mirrored projects with an idempotent 200 after the secret check', async () => {
    process.env.VERCEL_PROJECT_ID = ADMIN;

    const denied = verifyCronRequest(request({ authorization: 'Bearer cron-s3cret' }));

    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(200);
    await expect(denied!.json()).resolves.toEqual({
      skipped: true,
      reason: 'cron-owner-mismatch',
      project: ADMIN,
    });
  });

  it('never lets the ownership guard bypass the secret check', () => {
    process.env.VERCEL_PROJECT_ID = ADMIN;

    // Wrong secret on a mirrored project is still a hard 401, not a soft skip.
    expect(verifyCronRequest(request({ authorization: 'Bearer wrong' }))!.status).toBe(401);
  });

  it('is inert locally where VERCEL_PROJECT_ID is absent', () => {
    delete process.env.VERCEL_PROJECT_ID;

    expect(verifyCronRequest(request({ authorization: 'Bearer cron-s3cret' }))).toBeNull();
  });

  it('is inert when CRON_OWNER_PROJECT_ID is not configured', () => {
    delete process.env.CRON_OWNER_PROJECT_ID;
    process.env.VERCEL_PROJECT_ID = ADMIN;

    expect(verifyCronRequest(request({ authorization: 'Bearer cron-s3cret' }))).toBeNull();
  });
});
