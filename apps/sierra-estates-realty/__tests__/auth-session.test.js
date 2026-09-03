













const SECRET_VARS = [
  'SESSION_SECRET',
  'ADMIN_SESSION_SECRET',
  'NEXTAUTH_SECRET',
  'SBR_SECRET_KEY',
  'FIREBASE_PROJECT_ID',
] ;

const ORIGINAL = {};
for (const key of SECRET_VARS) ORIGINAL[key] = process.env[key];
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

/** NODE_ENV is typed read-only (Next augments ProcessEnv); assign via a widened cast. */
function setNodeEnv(value) {
  (process.env ).NODE_ENV = value;
}

function clearSecrets() {
  for (const key of SECRET_VARS) delete process.env[key];
}

/** Import fresh so module-level IS_PROD picks up NODE_ENV. */
async function loadAuth(nodeEnv = 'test') {
  setNodeEnv(nodeEnv);
  jest.resetModules();
  return import('../lib/auth');
}

const SESSION = {
  uid: 'u-1',
  email: 'admin@sierra-estates.net',
  name: 'Admin',
  role: 'admin' ,
};

function cookieRequest(token) {
  return new Request('https://admin.sierra-estates.net/api/admin/users', {
    headers: token === null ? {} : { cookie: `sierra_sess=${token}` },
  });
}

afterEach(() => {
  for (const key of SECRET_VARS) {
    if (ORIGINAL[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL[key] ;
  }
  setNodeEnv(ORIGINAL_NODE_ENV);
});

describe('signSession / verifySession', () => {
  it('round-trips a session signed with the current SESSION_SECRET', async () => {
    clearSecrets();
    process.env.SESSION_SECRET = 'session-key-1';
    const { signSession, verifySession } = await loadAuth();

    const token = await signSession(SESSION);
    const verified = await verifySession(token);

    expect(verified).toMatchObject(SESSION);
    expect(verified.exp).toBeGreaterThan(Date.now());
  });

  it('rejects a token whose payload was tampered with', async () => {
    clearSecrets();
    process.env.SESSION_SECRET = 'session-key-1';
    const { signSession, verifySession } = await loadAuth();

    const token = await signSession({ ...SESSION, role: 'viewer'  });
    const [body, sig] = token.split('.');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    payload.role = 'admin';
    const forgedBody = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // Privilege escalation attempt: same signature, edited claims.
    expect(await verifySession(`${forgedBody}.${sig}`)).toBeNull();
  });

  it('rejects a token whose signature was tampered with', async () => {
    clearSecrets();
    process.env.SESSION_SECRET = 'session-key-1';
    const { signSession, verifySession } = await loadAuth();

    const token = await signSession(SESSION);
    const [body, sig] = token.split('.');
    const flipped = sig.slice(0, -1) + (sig.endsWith('A') ? 'B' : 'A');

    expect(await verifySession(`${body}.${flipped}`)).toBeNull();
  });

  it('rejects a token signed with a different key (secret rotation invalidates old cookies)', async () => {
    clearSecrets();
    process.env.SESSION_SECRET = 'old-key';
    const first = await loadAuth();
    const token = await first.signSession(SESSION);

    process.env.SESSION_SECRET = 'rotated-key';
    const second = await loadAuth();

    expect(await second.verifySession(token)).toBeNull();
  });

  it('rejects malformed, empty and missing tokens', async () => {
    clearSecrets();
    process.env.SESSION_SECRET = 'session-key-1';
    const { verifySession } = await loadAuth();

    expect(await verifySession(null)).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession('')).toBeNull();
    expect(await verifySession('not-a-token')).toBeNull();
    expect(await verifySession('only-one-half.')).toBeNull();
    expect(await verifySession('.sig-only')).toBeNull();
  });

  it('rejects a correctly signed but expired session', async () => {
    clearSecrets();
    process.env.SESSION_SECRET = 'session-key-1';
    const { verifySession } = await loadAuth();

    // Mint a properly signed token whose exp is in the past, the way an old
    // cookie replayed after 12h would look.
    const crypto = require('crypto') ;
    const body = Buffer.from(
      JSON.stringify({ ...SESSION, exp: Date.now() - 1000 }),
    ).toString('base64url');
    const sig = crypto
      .createHmac('sha256', 'session-key-1')
      .update(body)
      .digest('base64url');

    // Sanity: the signature itself is valid — only the expiry rejects it.
    expect(await verifySession(`${body}.${sig}`)).toBeNull();
  });
});

describe('getKey — signing-key configuration', () => {
  it('throws in production when no session secret is configured', async () => {
    clearSecrets();
    const { signSession } = await loadAuth('production');

    // Regression guard: the fallback chain used to end at FIREBASE_PROJECT_ID
    // (published as NEXT_PUBLIC_FIREBASE_PROJECT_ID) and then a committed
    // dev key, either of which lets anyone forge an admin session cookie.
    await expect(signSession(SESSION)).rejects.toThrow(/SESSION_SECRET is not configured/);
  });

  it('throws on verification too, rather than silently trusting a forgeable key', async () => {
    clearSecrets();
    const { verifySession } = await loadAuth('production');

    await expect(verifySession('body.sig')).rejects.toThrow(/SESSION_SECRET is not configured/);
  });

  it('never uses FIREBASE_PROJECT_ID as the signing key', async () => {
    clearSecrets();
    process.env.FIREBASE_PROJECT_ID = 'sierra-blu';
    const { signSession } = await loadAuth('production');

    await expect(signSession(SESSION)).rejects.toThrow(/SESSION_SECRET is not configured/);
  });

  it('accepts any of the explicit secret env vars in production', async () => {
    for (const key of ['SESSION_SECRET', 'ADMIN_SESSION_SECRET', 'NEXTAUTH_SECRET', 'SBR_SECRET_KEY']) {
      clearSecrets();
      process.env[key] = `configured-via-${key}`;
      const { signSession, verifySession } = await loadAuth('production');

      const token = await signSession(SESSION);
      expect(await verifySession(token)).toMatchObject(SESSION);
    }
  });

  it('still works outside production with nothing configured, for local dev', async () => {
    clearSecrets();
    const { signSession, verifySession } = await loadAuth('development');

    const token = await signSession(SESSION);
    expect(await verifySession(token)).toMatchObject(SESSION);
  });
});

describe('parseCookies / getSessionFromRequest', () => {
  it('reads the sierra_sess cookie out of a Request', async () => {
    clearSecrets();
    process.env.SESSION_SECRET = 'session-key-1';
    const { signSession, getSessionFromRequest } = await loadAuth();

    const token = await signSession(SESSION);

    expect(await getSessionFromRequest(cookieRequest(token))).toMatchObject(SESSION);
  });

  it('returns null when the cookie is absent', async () => {
    clearSecrets();
    process.env.SESSION_SECRET = 'session-key-1';
    const { getSessionFromRequest } = await loadAuth();

    expect(await getSessionFromRequest(cookieRequest(null))).toBeNull();
  });

  it('parses a multi-cookie header and ignores malformed pairs', async () => {
    clearSecrets();
    const { parseCookies } = await loadAuth();

    expect(parseCookies('a=1; sierra_sess=tok; junk; b=2')).toEqual({
      a: '1',
      sierra_sess: 'tok',
      b: '2',
    });
    expect(parseCookies(null)).toEqual({});
  });
});

describe('requireRole', () => {
  async function tokenFor(role) {
    const { signSession } = await loadAuth();
    return signSession({ ...SESSION, role });
  }

  /** requireRole throws a Response; return its status. */
  async function statusFor(role, min) {
    const token = await tokenFor(role);
    const { requireRole } = await loadAuth();
    try {
      await requireRole(cookieRequest(token), min);
      return 'ok';
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(Response);
      return (thrown ).status;
    }
  }

  beforeEach(() => {
    clearSecrets();
    process.env.SESSION_SECRET = 'session-key-1';
  });

  it('throws a 401 Response when there is no session at all', async () => {
    const { requireRole } = await loadAuth();

    try {
      await requireRole(cookieRequest(null), 'admin');
      throw new Error('requireRole should have thrown');
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(Response);
      expect((thrown ).status).toBe(401);
      await expect((thrown ).json()).resolves.toEqual({ error: 'Unauthorized' });
    }
  });

  it('throws a 401 when the cookie fails signature verification', async () => {
    const { requireRole } = await loadAuth();

    try {
      await requireRole(cookieRequest('forged.token'), 'agent');
      throw new Error('requireRole should have thrown');
    } catch (thrown) {
      expect((thrown ).status).toBe(401);
    }
  });

  it('allows a role equal to the minimum', async () => {
    await expect(statusFor('admin', 'admin')).resolves.toBe('ok');
    await expect(statusFor('agent', 'agent')).resolves.toBe('ok');
  });

  it('allows a role above the minimum', async () => {
    await expect(statusFor('superadmin', 'admin')).resolves.toBe('ok');
    await expect(statusFor('admin', 'agent')).resolves.toBe('ok');
    await expect(statusFor('manager', 'owner')).resolves.toBe('ok');
  });

  it('rejects a role below the minimum with 403', async () => {
    await expect(statusFor('agent', 'admin')).resolves.toBe(403);
    await expect(statusFor('manager', 'admin')).resolves.toBe(403);
    await expect(statusFor('viewer', 'agent')).resolves.toBe(403);
    await expect(statusFor('owner', 'manager')).resolves.toBe(403);
  });

  it('rejects a session whose role is not a known role at all', async () => {
    await expect(statusFor('root' , 'viewer')).resolves.toBe(403);
    await expect(statusFor('' , 'admin')).resolves.toBe(403);
  });

  it('returns the session itself when authorised', async () => {
    const token = await tokenFor('admin');
    const { requireRole } = await loadAuth();

    const sess = await requireRole(cookieRequest(token), 'manager');

    expect(sess).toMatchObject({ uid: 'u-1', role: 'admin' });
  });
});

describe('safeEqual', () => {
  it('accepts identical strings', async () => {
    const { safeEqual } = await loadAuth();

    expect(safeEqual('', '')).toBe(true);
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('Bearer s3cret', 'Bearer s3cret')).toBe(true);
  });

  it('rejects same-length strings that differ', async () => {
    const { safeEqual } = await loadAuth();

    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'Abc')).toBe(false);
    expect(safeEqual('s3cret-a', 's3cret-b')).toBe(false);
  });

  it('rejects strings of differing length', async () => {
    const { safeEqual } = await loadAuth();

    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('abcd', 'abc')).toBe(false);
    expect(safeEqual('', 'a')).toBe(false);
    expect(safeEqual('secret', '')).toBe(false);
  });

  it('does not treat a prefix as a match', async () => {
    const { safeEqual } = await loadAuth();

    expect(safeEqual('s3cret', 's3cret-extra')).toBe(false);
    expect(safeEqual('s3cret-extra', 's3cret')).toBe(false);
  });
});
