/**
 * /api/auth — account provisioning policy.
 *
 * The route used to mint a `users/{uid}` document for any uid it had never
 * seen (admin for the first/approved account, viewer for everyone else). That
 * made whoever registered first in Firebase Auth the owner of the console.
 * Provisioning now happens only out-of-band via scripts/seed-admin.mjs, so an
 * unknown uid must be rejected with 403 and nothing may be written.
 */

const verifyIdTokenMock = jest.fn();
const userGetMock = jest.fn();
const userSetMock = jest.fn();
const docMock = jest.fn(() => ({ get: userGetMock, set: userSetMock }));
const collectionMock = jest.fn(() => ({ doc: docMock }));

jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args) }),
}));

jest.mock('@/lib/firebase-admin', () => ({
  adminEnabled: () => true,
  getAdminApp: async () => ({}),
  getAdminDb: async () => ({ collection: (...args: any[]) => collectionMock(...args) }),
}));

import { POST } from '@/app/api/auth/route';

const signinRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost:3000/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'signin', ...body }),
  });

describe('POST /api/auth — provisioning is out-of-band only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userSetMock.mockResolvedValue(undefined);
  });

  it('rejects a verified token whose uid has no users/ document', async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: 'brand-new-uid', email: 'stranger@example.com' });
    userGetMock.mockResolvedValue({ exists: false, data: () => undefined });

    const res = await POST(signinRequest({ token: 'valid-id-token', email: 'stranger@example.com' }));

    expect(res.status).toBe(403);
    expect(userSetMock).not.toHaveBeenCalled();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('does not mint an admin for the first user when the users collection is empty', async () => {
    // Empty collection: every lookup misses. The old bootstrap turned this into
    // `role: "admin"`; it must now be an unconditional rejection.
    verifyIdTokenMock.mockResolvedValue({ uid: 'first-ever-uid', email: 'attacker@gmail.com' });
    userGetMock.mockResolvedValue({ exists: false, data: () => undefined });

    const res = await POST(signinRequest({ token: 'valid-id-token', email: 'attacker@gmail.com' }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.role).toBeUndefined();
    expect(body.ok).toBeUndefined();
    expect(userSetMock).not.toHaveBeenCalled();
  });

  it('does not auto-provision even for an allow-listed admin email or google provider', async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: 'unseeded-uid', email: 'a.fawzy8866@gmail.com' });
    userGetMock.mockResolvedValue({ exists: false, data: () => undefined });

    const res = await POST(
      signinRequest({ token: 'valid-id-token', email: 'a.fawzy8866@gmail.com', provider: 'google' }),
    );

    expect(res.status).toBe(403);
    expect(userSetMock).not.toHaveBeenCalled();
  });

  it('does not promote an existing non-portal role at sign-in', async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: 'viewer-uid', email: 'a.fawzy8866@gmail.com' });
    userGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'viewer', email: 'a.fawzy8866@gmail.com', name: 'Viewer' }),
    });

    const res = await POST(
      signinRequest({ token: 'valid-id-token', email: 'a.fawzy8866@gmail.com', provider: 'google' }),
    );

    expect(res.status).toBe(403);
    // The role write is what escalated the account before; only lastLogin may
    // ever be written from this path, and not for a rejected sign-in.
    expect(userSetMock).not.toHaveBeenCalled();
  });

  it('authenticates a pre-seeded admin and records the login', async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: 'seeded-admin', email: 'ops@sierra-estates.net' });
    userGetMock.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: 'seeded-admin',
        email: 'ops@sierra-estates.net',
        name: 'Seeded Admin',
        role: 'admin',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    });

    const res = await POST(signinRequest({ token: 'valid-id-token', email: 'ops@sierra-estates.net' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, role: 'admin' });
    expect(res.headers.get('set-cookie')).toContain('sierra_sess=');
    expect(collectionMock).toHaveBeenCalledWith('users');
    expect(userSetMock).toHaveBeenCalledTimes(1);
    const [written, opts] = userSetMock.mock.calls[0];
    expect(Object.keys(written)).toEqual(['lastLogin']);
    expect(opts).toEqual({ merge: true });
  });

  it('honours a seeded non-admin portal role without upgrading it', async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: 'seeded-manager', email: 'manager@sierra-estates.net' });
    userGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'manager', email: 'manager@sierra-estates.net', name: 'Manager' }),
    });

    const res = await POST(signinRequest({ token: 'valid-id-token', email: 'manager@sierra-estates.net' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.role).toBe('manager');
  });
});
