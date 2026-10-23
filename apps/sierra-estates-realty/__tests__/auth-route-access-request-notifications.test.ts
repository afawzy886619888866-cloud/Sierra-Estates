/**
 * /api/auth — access-request notification lifecycle (Sierra Estates 3.0).
 *
 * Contract under test:
 *  - an unprovisioned Google identity creates the durable pending request AND
 *    fires the admin-chat notification (notifyAccessRequestCreated);
 *  - a notification failure never breaks the login response (403, request
 *    still recorded);
 *  - a PENDING profile whose request was DENIED gets the honest denial
 *    message on their next sign-in attempt (never an eternal "pending");
 *  - a genuinely pending request still shows the pending message.
 */
const getUserMock = jest.fn();
const getRecordMock = jest.fn();
const updateRecordMock = jest.fn();
const insertRecordMock = jest.fn();
const listRecordsMock = jest.fn();
const notifyCreatedMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  getSupabaseAdmin: () => ({ auth: { getUser: getUserMock } }),
  getRecord: (...args: unknown[]) => getRecordMock(...args),
  updateRecord: (...args: unknown[]) => updateRecordMock(...args),
  insertRecord: (...args: unknown[]) => insertRecordMock(...args),
  listRecords: (...args: unknown[]) => listRecordsMock(...args),
}));

jest.mock('@/lib/server/access-request-notifier', () => ({
  notifyAccessRequestCreated: (...args: unknown[]) => notifyCreatedMock(...args),
}));

import { POST } from '@/app/api/auth/route';

const signinRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost:3000/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'signin', ...body }),
  });

const verifiedTokenFor = (id: string, email: string) =>
  getUserMock.mockResolvedValue({ data: { user: { id, email, user_metadata: {} } }, error: null });

beforeEach(() => {
  jest.clearAllMocks();
  updateRecordMock.mockResolvedValue(undefined);
  insertRecordMock.mockResolvedValue(undefined);
  // Default: empty tables — every lookup misses.
  getRecordMock.mockResolvedValue(null);
  listRecordsMock.mockResolvedValue([]);
  notifyCreatedMock.mockResolvedValue({
    attempted: false,
    channel: 'log-only',
    ok: false,
    error: 'TELEGRAM_ADMIN_CHAT_ID not configured',
  });
});

describe('POST /api/auth — new access request notifies the admin channel', () => {
  it('records the durable request and fires notifyAccessRequestCreated', async () => {
    verifiedTokenFor('uid-1', 'new.staff@sierra-estates.net');
    getRecordMock.mockResolvedValue(null); // no profile
    listRecordsMock.mockResolvedValue([]); // no existing rows

    const res = await POST(
      signinRequest({ token: 'valid-token', email: 'new.staff@sierra-estates.net' }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.accessRequest).toBe('pending');
    expect(notifyCreatedMock).toHaveBeenCalledTimes(1);
    expect(notifyCreatedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new.staff@sierra-estates.net',
        provider: 'google',
      }),
    );
    // Durable writes happened: pending profile + access_requests row.
    const insertedTables = insertRecordMock.mock.calls.map((c) => c[0]);
    expect(insertedTables).toContain('profiles');
    expect(insertedTables).toContain('access_requests');
  });

  it('keeps the 403 + durable request even when the notification fails', async () => {
    verifiedTokenFor('uid-2', 'quiet.staff@sierra-estates.net');
    notifyCreatedMock.mockRejectedValue(new Error('notifier exploded'));

    const res = await POST(
      signinRequest({ token: 'valid-token', email: 'quiet.staff@sierra-estates.net' }),
    );

    // The notifier contract says it never throws — but even if it did, the
    // login response must stay intact (403, request recorded).
    expect(res.status).toBe(403);
    const insertedTables = insertRecordMock.mock.calls.map((c) => c[0]);
    expect(insertedTables).toContain('access_requests');
  });
});

describe('POST /api/auth — pending profile reads the real ledger state', () => {
  const pendingProfile = { status: 'pending', role: 'viewer', fullName: 'Waiting Staff' };

  it('tells a denied requester the truth on their next sign-in attempt', async () => {
    verifiedTokenFor('uid-3', 'denied.staff@example.com');
    getRecordMock.mockResolvedValue(pendingProfile);
    listRecordsMock.mockResolvedValue([
      { state: 'denied', requestedAt: '2026-10-01T00:00:00Z', decidedAt: '2026-10-02T00:00:00Z' },
    ]);

    const res = await POST(
      signinRequest({ token: 'valid-token', email: 'denied.staff@example.com' }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('denied');
    expect(body.error).not.toContain('pending super-admin approval');
    // No session cookie is ever set for a denied account.
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('still shows the pending message for a genuinely pending request', async () => {
    verifiedTokenFor('uid-4', 'waiting.staff@example.com');
    getRecordMock.mockResolvedValue(pendingProfile);
    listRecordsMock.mockResolvedValue([
      { state: 'pending', requestedAt: '2026-10-16T00:00:00Z', decidedAt: null },
    ]);

    const res = await POST(
      signinRequest({ token: 'valid-token', email: 'waiting.staff@example.com' }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('pending super-admin approval');
  });

  it('shows the pending message when the ledger lookup itself fails (cautious default)', async () => {
    verifiedTokenFor('uid-5', 'opaque.staff@example.com');
    getRecordMock.mockResolvedValue(pendingProfile);
    listRecordsMock.mockRejectedValue(new Error('supabase down'));

    const res = await POST(
      signinRequest({ token: 'valid-token', email: 'opaque.staff@example.com' }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    // Never fabricates a denial when the evidence is unreadable.
    expect(body.error).toContain('pending super-admin approval');
  });

  it('a re-request after an old denial outranks the denial (pending wins)', async () => {
    verifiedTokenFor('uid-6', 'retry.staff@example.com');
    getRecordMock.mockResolvedValue(pendingProfile);
    listRecordsMock.mockResolvedValue([
      { state: 'denied', requestedAt: '2026-09-01T00:00:00Z', decidedAt: '2026-09-02T00:00:00Z' },
      { state: 'pending', requestedAt: '2026-10-15T00:00:00Z', decidedAt: null },
    ]);

    const res = await POST(signinRequest({ token: 'valid-token', email: 'retry.staff@example.com' }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('pending super-admin approval');
  });
});
