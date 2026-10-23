/**
 * /api/auth — unverified provider claims have no path in.
 *
 * There used to be a "Path B" that ran when Firebase Admin verification failed
 * or was unconfigured. Everything it trusted — `provider`, `email`, `uid` —
 * came straight from the request body and none of it was verified, so a POST
 * carrying {provider:'google', email:'<anything>@sierra-estates.net'} was
 * issued a signed admin cookie. It was closed in production first; under
 * Supabase Auth a Google sign-in returns a real access token that Path A
 * verifies, so the unverified path is gone entirely.
 *
 * These tests pin that: a body-only claim must never mint a session, in any
 * environment.
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

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

/** NODE_ENV is typed read-only (Next augments ProcessEnv); assign via a widened cast. */
function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

const signinRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost:3000/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'signin', ...body }),
  });

describe.each(['production', 'development'])(
  'POST /api/auth — unverified google claims in %s',
  (env) => {
    beforeEach(() => {
      jest.clearAllMocks();
      setNodeEnv(env);
    });
    afterEach(() => setNodeEnv(ORIGINAL_NODE_ENV));

    it('never mints a session from a body-only google claim', async () => {
      const res = await POST(
        signinRequest({ provider: 'google', email: 'attacker@sierra-estates.net' })
      );

      expect(res.headers.get('set-cookie')).toBeNull();
      expect(res.status).not.toBe(200);
    });

    it('never mints a session for a claim carrying an allowlisted email and a uid', async () => {
      const res = await POST(
        signinRequest({
          provider: 'google',
          email: 'admin@sierra-estates.net',
          uid: 'attacker-chosen-uid',
          name: 'Totally The Admin',
        })
      );

      expect(res.headers.get('set-cookie')).toBeNull();
      expect(res.status).not.toBe(200);
    });

    it('does not consult the profiles table for an unverified claim', async () => {
      // Nothing about a body-only claim should reach the database: there is no
      // identity to look up.
      await POST(signinRequest({ provider: 'google', email: 'admin@sierra-estates.net' }));

      expect(getUserMock).not.toHaveBeenCalled();
      expect(getRecordMock).not.toHaveBeenCalled();
      expect(updateRecordMock).not.toHaveBeenCalled();
    });
  }
);
