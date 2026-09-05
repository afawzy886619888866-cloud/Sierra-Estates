/**
 * /api/auth — account provisioning policy, under Supabase Auth.
 *
 * The route used to mint a user record for any uid it had never seen (admin
 * for the first/approved account, viewer for everyone else), which made
 * whoever registered first the owner of the console. Provisioning happens
 * out-of-band only, so an unknown uid must be rejected with 403 and nothing
 * may be written.
 *
 * These are the same guarantees the Firebase version was held to; only the
 * identity provider underneath has changed.
 */
const getUserMock = jest.fn();
const getRecordMock = jest.fn();
const updateRecordMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  getSupabaseAdmin: () => ({ auth: { getUser: getUserMock } }),
  getRecord: (...args: unknown[]) => getRecordMock(...args),
  updateRecord: (...args: unknown[]) => updateRecordMock(...args),
}));

import { POST } from '@/app/api/auth/route';

const signinRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost:3000/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'signin', ...body }),
  });

/** A token that Supabase accepts, for the uid given. */
const verifiedTokenFor = (id: string, email: string) =>
  getUserMock.mockResolvedValue({ data: { user: { id, email, user_metadata: {} } }, error: null });

describe('POST /api/auth — provisioning is out-of-band only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateRecordMock.mockResolvedValue(undefined);
  });

  it('rejects a verified token whose uid has no profiles row', async () => {
    verifiedTokenFor('brand-new-uid', 'stranger@example.com');
    getRecordMock.mockResolvedValue(null);

    const res = await POST(signinRequest({ token: 'valid-token', email: 'stranger@example.com' }));

    expect(res.status).toBe(403);
    expect(updateRecordMock).not.toHaveBeenCalled();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('does not mint an admin for the first user when profiles is empty', async () => {
    // Empty table: every lookup misses. The old bootstrap turned this into
    // `role: "admin"`; it must now be an unconditional rejection.
    verifiedTokenFor('first-ever-uid', 'attacker@gmail.com');
    getRecordMock.mockResolvedValue(null);

    const res = await POST(signinRequest({ token: 'valid-token', email: 'attacker@gmail.com' }));

    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('does not auto-provision even for an allow-listed admin email', async () => {
    // The email domain used to be enough to self-provision. The stored role is
    // now the only source of truth.
    verifiedTokenFor('unprovisioned-uid', 'someone@sierra-estates.net');
    getRecordMock.mockResolvedValue(null);

    const res = await POST(
      signinRequest({ token: 'valid-token', email: 'someone@sierra-estates.net', provider: 'google' })
    );

    expect(res.status).toBe(403);
    expect(updateRecordMock).not.toHaveBeenCalled();
  });

  it('does not promote an existing non-portal role at sign-in', async () => {
    verifiedTokenFor('client-uid', 'customer@example.com');
    getRecordMock.mockResolvedValue({ role: 'client', fullName: 'A Customer' });

    const res = await POST(signinRequest({ token: 'valid-token', email: 'customer@example.com' }));

    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('authenticates a pre-seeded admin and records the login', async () => {
    verifiedTokenFor('seeded-admin-uid', 'admin@sierra-estates.net');
    getRecordMock.mockResolvedValue({ role: 'admin', fullName: 'Seeded Admin' });

    const res = await POST(signinRequest({ token: 'valid-token' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, role: 'admin' });
    expect(res.headers.get('set-cookie')).toContain('sierra_sess');
    expect(updateRecordMock).toHaveBeenCalledWith(
      'profiles',
      'seeded-admin-uid',
      expect.objectContaining({ lastLogin: expect.any(String) })
    );
  });

  it('honours a seeded non-admin portal role without upgrading it', async () => {
    verifiedTokenFor('agent-uid', 'agent@sierra-estates.net');
    getRecordMock.mockResolvedValue({ role: 'agent', fullName: 'An Agent' });

    const res = await POST(signinRequest({ token: 'valid-token' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.role).toBe('agent');
  });

  it('refuses when the token does not verify, rather than trying a password path', async () => {
    // Falling through to credentials here would let a caller skip token
    // verification by sending a bad token alongside a password.
    getUserMock.mockResolvedValue({ data: null, error: { message: 'invalid JWT' } });

    const res = await POST(
      signinRequest({ token: 'forged-token', email: 'admin@sierra-estates.net', password: 'whatever' })
    );

    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(getRecordMock).not.toHaveBeenCalled();
  });
});
