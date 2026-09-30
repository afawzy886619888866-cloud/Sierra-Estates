/**
 * POST /api/admin/listings/photos/request — ask the unit's owner/broker for
 * photos over WhatsApp (outbound queue). The bot accepts text but never
 * images, so the team re-requests from the admin portal.
 */
jest.mock('@/lib/server/auth-guard', () => ({
  verifyPortalRequest: jest.fn(),
}));

jest.mock('@/lib/server/whatsapp-queue', () => ({
  enqueueWhatsAppJob: jest.fn(),
}));

jest.mock('@sierra-estates/db', () => ({
  listRecords: jest.fn(),
}));

import { POST } from '../app/api/admin/listings/photos/request/route';
import { NextRequest } from 'next/server';
import { verifyPortalRequest } from '@/lib/server/auth-guard';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { listRecords } from '@sierra-estates/db';

const verifyPortalRequestMock = verifyPortalRequest as jest.MockedFunction<typeof verifyPortalRequest>;
const enqueueMock = enqueueWhatsAppJob as jest.Mock;
const listRecordsMock = listRecords as jest.Mock;

const admin = { authenticated: true, access: 'admin' as const, role: 'admin', scope: null };
const partner = {
  authenticated: true,
  access: 'partner' as const,
  uid: 'partner-1',
  email: 'p1@example.com',
  role: 'partner',
  scope: { developers: ['mountain view'], compounds: [] },
};

const req = (body: unknown) =>
  new NextRequest('http://localhost:3000/api/admin/listings/photos/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/admin/listings/photos/request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyPortalRequestMock.mockResolvedValue(admin);
    enqueueMock.mockResolvedValue('job-1');
  });

  it('rejects unauthenticated callers with 401', async () => {
    verifyPortalRequestMock.mockResolvedValue({ authenticated: false, method: 'none' });

    const res = await POST(req({ code: 'X' }));

    expect(res.status).toBe(401);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('queues a WhatsApp photo request to the owner phone when present', async () => {
    listRecordsMock.mockResolvedValue([
      { id: 'l1', code: 'NC-MIV-APT-F2-175M', compound: 'Mivida', developer: 'Emaar', ownerPhone: '+201000000001', ownerName: 'Owner One' },
    ]);

    const res = await POST(req({ code: 'NC-MIV-APT-F2-175M' }));

    expect(res.status).toBe(200);
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock.mock.calls[0][0].toPhone).toBe('+201000000001');
    expect(enqueueMock.mock.calls[0][0].purpose).toBe('general-outreach');
    expect(enqueueMock.mock.calls[0][0].body).toContain('NC-MIV-APT-F2-175M');
  });

  it('falls back to the broker phone when no owner phone is on file', async () => {
    listRecordsMock.mockResolvedValue([
      { id: 'l1', code: 'B-1', brokerPhone: '+201000000002', brokerName: 'Broker Two' },
    ]);

    const res = await POST(req({ code: 'B-1' }));

    expect(res.status).toBe(200);
    expect(enqueueMock.mock.calls[0][0].toPhone).toBe('+201000000002');
  });

  it('422s when neither owner nor broker has a phone on file', async () => {
    listRecordsMock.mockResolvedValue([{ id: 'l1', code: 'B-2', compound: 'Mivida' }]);

    const res = await POST(req({ code: 'B-2' }));

    expect(res.status).toBe(422);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('404s an unknown code', async () => {
    listRecordsMock.mockResolvedValue([]);

    const res = await POST(req({ code: 'NOPE' }));

    expect(res.status).toBe(404);
  });

  it('403s a partner requesting photos for a unit outside their portfolio', async () => {
    verifyPortalRequestMock.mockResolvedValue(partner);
    listRecordsMock.mockResolvedValue([
      { id: 'l1', code: 'NC-MIV-APT-F2-175M', developer: 'Emaar', ownerPhone: '+201000000001' },
    ]);

    const res = await POST(req({ code: 'NC-MIV-APT-F2-175M' }));

    expect(res.status).toBe(403);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('allows a partner to request photos for their OWN unit', async () => {
    verifyPortalRequestMock.mockResolvedValue(partner);
    listRecordsMock.mockResolvedValue([
      { id: 'l1', code: 'MV-1', developer: 'Mountain View', ownerPhone: '+201000000001', ownerName: 'Owner One' },
    ]);

    const res = await POST(req({ code: 'MV-1' }));

    expect(res.status).toBe(200);
    expect(enqueueMock).toHaveBeenCalled();
  });
});
