/**
 * Tests: lib/auth.ts `tryDemoLogin` — the email + password fallback behind
 * POST /api/auth Path C, and the `isAdminEmail` allowlist it depends on.
 *
 * This path used to accept a committed list of passwords ("sierra2026",
 * "admin", "password", "123456", "12345678", …) and its final condition was
 * `... || isKnownStaffPass`, which made the email check irrelevant. Path C is
 * not environment-gated, so any POST /api/auth carrying ANY email and one of
 * those passwords was issued a signed session cookie with role "admin" — in
 * production. That was a live authentication bypass.
 *
 * The contract pinned below is the replacement:
 *   - no operator password configured        → null (closed by default)
 *   - empty email or password                → null
 *   - email not on the admin allowlist       → null
 *   - password mismatch (constant-time)      → null
 *   - otherwise                              → Session with role "admin"
 *
 * `tryDemoLogin` reads its env vars on every call, so no re-import is needed.
 */
import { tryDemoLogin, isAdminEmail } from '../lib/auth';

const PASSWORD_VARS = ['ADMIN_BOOTSTRAP_PASSWORD', 'ADMIN_PASSWORD', 'ADMIN_SECRET'] as const;
const TOUCHED = [...PASSWORD_VARS, 'ADMIN_BOOTSTRAP_EMAIL', 'ADMIN_EMAILS'] as const;

const ORIGINAL: Record<string, string | undefined> = {};
for (const key of TOUCHED) ORIGINAL[key] = process.env[key];

const ADMIN_EMAIL = 'admin@sierra-estates.net';
const CONFIGURED = 'operator-configured-pass';

function clearPasswords() {
  for (const key of TOUCHED) delete process.env[key];
}

beforeEach(() => {
  clearPasswords();
});

afterEach(() => {
  for (const key of TOUCHED) {
    if (ORIGINAL[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL[key] as string;
  }
});

describe('tryDemoLogin — closed by default', () => {
  it('returns null when no operator password is configured', () => {
    expect(tryDemoLogin(ADMIN_EMAIL, 'anything')).toBeNull();
    expect(tryDemoLogin(ADMIN_EMAIL, '')).toBeNull();
  });

  it('returns null with no password configured even for the bootstrap email', () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = 'boss@sierra-estates.net';

    expect(tryDemoLogin('boss@sierra-estates.net', 'boss')).toBeNull();
  });

  it('treats an empty-string password env var as unconfigured', () => {
    process.env.ADMIN_BOOTSTRAP_PASSWORD = '';

    expect(tryDemoLogin(ADMIN_EMAIL, '')).toBeNull();
  });
});

describe('tryDemoLogin — retired hardcoded passwords (regression guard)', () => {
  const RETIRED = [
    'admin',
    'password',
    '123456',
    '12345678',
    'sierra2026',
    'sierra-admin-2026',
    'sierra2026!',
    'sierra@123',
    'adminsierra2026',
    'admin123',
    'fawzy2026',
    'fawzy',
  ];

  it.each(RETIRED)('rejects the retired password %p with a password configured', (pass) => {
    process.env.ADMIN_BOOTSTRAP_PASSWORD = CONFIGURED;

    expect(tryDemoLogin(ADMIN_EMAIL, pass)).toBeNull();
  });

  it.each(RETIRED)('rejects the retired password %p with nothing configured', (pass) => {
    expect(tryDemoLogin(ADMIN_EMAIL, pass)).toBeNull();
  });

  it('rejects a retired password paired with an arbitrary attacker email', () => {
    process.env.ADMIN_BOOTSTRAP_PASSWORD = CONFIGURED;

    // The old final `|| isKnownStaffPass` made the email irrelevant.
    expect(tryDemoLogin('attacker@evil.com', 'admin')).toBeNull();
    expect(tryDemoLogin('attacker@evil.com', 'password')).toBeNull();
    expect(tryDemoLogin('attacker@evil.com', '123456')).toBeNull();
  });
});

describe.each(PASSWORD_VARS)('tryDemoLogin — configured via %s', (envVar) => {
  beforeEach(() => {
    process.env[envVar] = CONFIGURED;
  });

  it('returns an admin session for an allowlisted email and the exact password', () => {
    const session = tryDemoLogin(ADMIN_EMAIL, CONFIGURED);

    expect(session).not.toBeNull();
    expect(session!.role).toBe('admin');
    expect(session!.email).toBe(ADMIN_EMAIL);
    expect(session!.uid).toBe('staff-admin-sierra-estates-net');
    expect(session!.exp).toBeGreaterThan(Date.now());
  });

  it('normalises a mixed-case, padded email', () => {
    const session = tryDemoLogin('  Admin@Sierra-Estates.NET  ', CONFIGURED);

    expect(session).not.toBeNull();
    expect(session!.email).toBe(ADMIN_EMAIL);
  });

  it('returns null for an email that is not an admin email', () => {
    expect(tryDemoLogin('buyer@gmail.com', CONFIGURED)).toBeNull();
    expect(tryDemoLogin('attacker@evil.com', CONFIGURED)).toBeNull();
  });

  it('returns null for an empty email', () => {
    expect(tryDemoLogin('', CONFIGURED)).toBeNull();
    expect(tryDemoLogin('   ', CONFIGURED)).toBeNull();
  });

  it('returns null for an empty password', () => {
    expect(tryDemoLogin(ADMIN_EMAIL, '')).toBeNull();
    expect(tryDemoLogin(ADMIN_EMAIL, '   ')).toBeNull();
  });

  it('returns null for a wrong password', () => {
    expect(tryDemoLogin(ADMIN_EMAIL, 'wrong-pass')).toBeNull();
  });

  it('returns null for a same-length near-miss password', () => {
    const near = CONFIGURED.slice(0, -1) + 'X';
    expect(near).toHaveLength(CONFIGURED.length);

    expect(tryDemoLogin(ADMIN_EMAIL, near)).toBeNull();
  });

  it('returns null for a password that merely contains the configured one', () => {
    expect(tryDemoLogin(ADMIN_EMAIL, `${CONFIGURED}-extra`)).toBeNull();
    expect(tryDemoLogin(ADMIN_EMAIL, CONFIGURED.slice(0, 4))).toBeNull();
  });

  it('is case-sensitive on the password', () => {
    expect(tryDemoLogin(ADMIN_EMAIL, CONFIGURED.toUpperCase())).toBeNull();
  });
});

describe('tryDemoLogin — allowlist sources', () => {
  beforeEach(() => {
    process.env.ADMIN_BOOTSTRAP_PASSWORD = CONFIGURED;
  });

  it('accepts an address added through ADMIN_EMAILS', () => {
    process.env.ADMIN_EMAILS = 'ops@partner.example, other@partner.example';

    expect(tryDemoLogin('ops@partner.example', CONFIGURED)).not.toBeNull();
    expect(tryDemoLogin('nobody@partner.example', CONFIGURED)).toBeNull();
  });

  it('accepts the configured ADMIN_BOOTSTRAP_EMAIL', () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = 'boss@example.com';

    expect(tryDemoLogin('boss@example.com', CONFIGURED)).not.toBeNull();
  });
});

describe('isAdminEmail', () => {
  beforeEach(() => {
    clearPasswords();
  });

  it('accepts the owned sierra-estates.net domain and rejects lookalike domains', () => {
    expect(isAdminEmail('anyone@sierra-estates.net')).toBe(true);
    // "sierra.com" is not a domain we own — trusting it by default let anyone
    // register a sierra.com mailbox and reach the admin portal. It is now
    // rejected unless the operator opts in via ADMIN_EMAILS.
    expect(isAdminEmail('anyone@sierra.com')).toBe(false);

    const originalAdminEmails = process.env.ADMIN_EMAILS;
    try {
      process.env.ADMIN_EMAILS = '@sierra.com';
      expect(isAdminEmail('anyone@sierra.com')).toBe(true);
    } finally {
      if (originalAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
      else process.env.ADMIN_EMAILS = originalAdminEmails;
    }
  });

  it('rejects arbitrary outside addresses', () => {
    expect(isAdminEmail('buyer@gmail.com')).toBe(false);
    expect(isAdminEmail('attacker@evil.com')).toBe(false);
    expect(isAdminEmail('')).toBe(false);
  });

  it('is not fooled by a lookalike domain suffix', () => {
    expect(isAdminEmail('a@sierra-estates.net.evil.com')).toBe(false);
    expect(isAdminEmail('a@notsierra.com.evil.io')).toBe(false);
  });

  it('reads the comma-separated ADMIN_EMAILS allowlist, trimmed and lowercased', () => {
    process.env.ADMIN_EMAILS = ' Ops@Partner.Example , second@partner.example ';

    expect(isAdminEmail('ops@partner.example')).toBe(true);
    expect(isAdminEmail('OPS@PARTNER.EXAMPLE')).toBe(true);
    expect(isAdminEmail('second@partner.example')).toBe(true);
    expect(isAdminEmail('third@partner.example')).toBe(false);
  });
});
