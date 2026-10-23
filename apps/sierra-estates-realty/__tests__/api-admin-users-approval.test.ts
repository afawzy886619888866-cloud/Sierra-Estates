/**
 * POST /api/admin/users — access approval decision + notification contract
 * (Sierra Estates 3.0, Phase 1 extension).
 *
 * Contract under test:
 *  - super-admin only (default-deny for plain admins);
 *  - approving activates the profile with the granted role, records the
 *    decision durably, audits it, and notifies the admin chat;
 *  - denying records the decision without provisioning;
 *  - the adminNotification result is reported HONESTLY in the response —
 *    ok:false when the Telegram admin chat is unconfigured, never faked;
 *  - access_requests.notified stays false (no requester-facing delivery
 *    channel is wired; the requester sees the state at their next sign-in).
 */
const requireRoleMock = jest.fn();
const listRecordsMock = jest.fn();
const updateRecordMock = jest.fn();
const insertRecordMock = jest.fn();
const notifyDecidedMock = jest.fn();

jest.mock('@/lib/auth', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

jest.mock('@sierra-estates/db', () => ({
  listRecords: (...args: unknown[]) => listRecordsMock(...args),
  updateRecord: (...args: unknown[]) => updateRecordMock(...args),
  insertRecord: (...args: unknown[]) => insertRecordMock(...args),
}));

jest.mock('@/lib/server/access-request-notifier', () => ({
  notifyAccessRequestDecided: (...args: unknown[]) => notifyDecidedMock(...args),
}));

import { POST } from '@/app/api/admin/users/route';

const SUPERADMIN_SESSION = {
  uid: 'super-uid',
  email: 'owner@sierra-estates.net',
  name: 'Owner',
  role: 'superadmin',
  exp: Date.now() / 1000 + 600,
};

const ADMIN_SESSION = { ...SUPERADMIN_SESSION, uid: 'admin-uid', role: 'admin' };

const request = (body: unknown) =>
  new Request('http://localhost:3000/api/admin/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  jest.clearAllMocks();
  requireRoleMock.mockResolvedValue(SUPERADMIN_SESSION);
  updateRecordMock.mockResolvedValue({});
  insertRecordMock.mockResolvedValue({});
  listRecordsMock.mockResolvedValue([]);
  notifyDecidedMock.mockResolvedValue({
    attempted: false,
    channel: 'log-only',
    ok: false,
    error: 'TELEGRAM_ADMIN_CHAT_ID not configured',
  });
});

describe('POST /api/admin/users — authorization', () => {
  it('rejects a plain admin (only a super admin may decide)', async () => {
    requireRoleMock.mockResolvedValue(ADMIN_SESSION);
    const res = await POST(request({ email: 'x@example.com', decision: 'approved' }));
    expect(res.status).toBe(403);
    expect(notifyDecidedMock).not.toHaveBeenCalled();
  });

  it('rejects a missing decision payload', async () => {
    const res = await POST(request({ email: 'x@example.com' }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/users — approval', () => {
  it('activates the profile, records + audits the decision, and notifies', async () => {
    listRecordsMock.mockResolvedValue([
      { id: 'req-1', email: 'new.agent@example.com', authUid: 'uid-agent' },
    ]);

    const res = await POST(
      request({ email: 'new.agent@example.com', decision: 'approved', role: 'sales_agent' }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.grantedRole).toBe('sales_agent');

    // Profile activated with the granted role.
    const profileUpdate = updateRecordMock.mock.calls.find((c) => c[0] === 'profiles');
    expect(profileUpdate?.[1]).toBe('uid-agent');
    expect(profileUpdate?.[2]).toMatchObject({ role: 'sales_agent', status: 'active' });

    // Decision recorded on the request row — notified stays FALSE (honest).
    const reqUpdate = updateRecordMock.mock.calls.find((c) => c[0] === 'access_requests');
    expect(reqUpdate?.[1]).toBe('req-1');
    expect(reqUpdate?.[2]).toMatchObject({
      state: 'approved',
      decidedBy: 'owner@sierra-estates.net',
      grantedRole: 'sales_agent',
      notified: false,
    });

    // Audit trail.
    const audit = insertRecordMock.mock.calls.find((c) => c[0] === 'audit_logs');
    expect(audit?.[1]).toMatchObject({ action: 'access_request.approved' });

    // Admin chat notified with the decision facts.
    expect(notifyDecidedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new.agent@example.com',
        decision: 'approved',
        grantedRole: 'sales_agent',
        decidedBy: 'owner@sierra-estates.net',
      }),
    );
  });

  it('reports the notification outcome honestly when the admin chat is unconfigured', async () => {
    listRecordsMock.mockResolvedValue([
      { id: 'req-2', email: 'quiet@example.com', authUid: 'uid-quiet' },
    ]);

    const res = await POST(request({ email: 'quiet@example.com', decision: 'approved' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.adminNotification).toMatchObject({
      attempted: false,
      channel: 'log-only',
      ok: false,
    });
    expect(body.adminNotification.error).toContain('TELEGRAM_ADMIN_CHAT_ID');
  });

  it('reports a live notification delivery in the response', async () => {
    listRecordsMock.mockResolvedValue([
      { id: 'req-3', email: 'armed@example.com', authUid: 'uid-armed' },
    ]);
    notifyDecidedMock.mockResolvedValue({
      attempted: true,
      channel: 'telegram-admin-chat',
      ok: true,
      messageId: 55,
    });

    const res = await POST(request({ email: 'armed@example.com', decision: 'approved' }));
    const body = await res.json();

    expect(body.adminNotification).toMatchObject({
      attempted: true,
      channel: 'telegram-admin-chat',
      ok: true,
    });
  });
});

describe('POST /api/admin/users — denial', () => {
  it('records the denial without provisioning and notifies without a role', async () => {
    listRecordsMock.mockResolvedValue([
      { id: 'req-4', email: 'rejected@example.com', authUid: 'uid-rej' },
    ]);

    const res = await POST(request({ email: 'rejected@example.com', decision: 'denied', note: 'no relationship' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.grantedRole).toBeUndefined();

    // No profile activation on denial.
    const profileUpdate = updateRecordMock.mock.calls.find((c) => c[0] === 'profiles');
    expect(profileUpdate).toBeUndefined();

    const reqUpdate = updateRecordMock.mock.calls.find((c) => c[0] === 'access_requests');
    expect(reqUpdate?.[2]).toMatchObject({ state: 'denied', grantedRole: null, notified: false });

    expect(notifyDecidedMock).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'denied', grantedRole: null, note: 'no relationship' }),
    );
  });
});
