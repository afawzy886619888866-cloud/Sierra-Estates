/**
 * Partner-scoped admin reads — the three workspaces a partner sees
 * (Inventory OS, Ad Listing, CRM) must filter to the partner's own portfolio
 * while staff keep the full view.
 */
jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: jest.fn(),
  verifyPortalRequest: jest.fn(),
}));

jest.mock('@sierra-estates/db', () => ({
  listRecords: jest.fn(),
  getRecord: jest.fn(),
  updateRecord: jest.fn(),
  insertRecord: jest.fn(),
  deleteRecord: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET as inventoryOsGet, POST as inventoryOsPost } from '../app/api/admin/inventory-os/route';
import { GET as listingsGet } from '../app/api/admin/listings/route';
import { GET as leadsGet } from '../app/api/admin/leads/route';
import { PATCH as leadPatch } from '../app/api/admin/leads/[id]/route';
import { verifyPortalRequest, verifyAdminRequest } from '@/lib/server/auth-guard';
import { listRecords, getRecord, updateRecord } from '@sierra-estates/db';

const verifyPortalRequestMock = verifyPortalRequest as jest.MockedFunction<typeof verifyPortalRequest>;
const verifyAdminRequestMock = verifyAdminRequest as jest.MockedFunction<typeof verifyAdminRequest>;
const listRecordsMock = listRecords as jest.Mock;
const getRecordMock = getRecord as jest.Mock;
const updateRecordMock = updateRecord as jest.Mock;

const admin = { authenticated: true, access: 'admin' as const, role: 'admin', scope: null };
const partner = {
  authenticated: true,
  access: 'partner' as const,
  uid: 'partner-1',
  email: 'p1@example.com',
  role: 'partner',
  scope: { developers: ['mountain view'], compounds: ['icity'] },
};

const UNITS = [
  { id: 'u1', compound: 'iCity', developer: 'Mountain View', unitCode: 'MV-1' },   // in scope
  { id: 'u2', compound: 'Mivida', developer: 'Emaar', unitCode: 'EM-1' },          // out of scope
  { id: 'u3', compound: 'Mountain View iCity', developerName: 'Mountain View' },   // view row, in scope
];
const LEADS = [
  { id: 'lead-1', fullName: 'In-Scope Client', targetCompound: 'Mountain View iCity' },
  { id: 'lead-2', fullName: 'Out-Of-Scope Client', targetCompound: 'Mivida' },
];

const req = (url: string) => new NextRequest(`http://localhost:3000${url}`);

describe('GET /api/admin/inventory-os — partner scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyPortalRequestMock.mockResolvedValue(admin);
    listRecordsMock.mockResolvedValue(UNITS);
  });

  it('returns every unit for staff', async () => {
    const res = await inventoryOsGet(req('/api/admin/inventory-os'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.units).toHaveLength(3);
  });

  it('filters a partner down to their own units only', async () => {
    verifyPortalRequestMock.mockResolvedValue(partner);

    const res = await inventoryOsGet(req('/api/admin/inventory-os'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.units).toHaveLength(2);
    expect(body.units.map((u: any) => u.id).sort()).toEqual(['u1', 'u3']);
  });

  it('403s a partner opening a unit drawer outside their portfolio', async () => {
    verifyPortalRequestMock.mockResolvedValue(partner);
    getRecordMock.mockResolvedValue({ id: 'u2', compound: 'Mivida', developer: 'Emaar' });

    const res = await inventoryOsGet(req('/api/admin/inventory-os?id=u2'));

    expect(res.status).toBe(403);
  });

  it('lets a partner open their own unit drawer', async () => {
    verifyPortalRequestMock.mockResolvedValue(partner);
    getRecordMock.mockResolvedValue({ id: 'u1', compound: 'iCity', developer: 'Mountain View' });

    const res = await inventoryOsGet(req('/api/admin/inventory-os?id=u1'));

    expect(res.status).toBe(200);
  });

  it('keeps lifecycle mutations (POST) staff-only — partner rejected', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: false, method: 'none' });

    const res = await inventoryOsPost(
      new NextRequest('http://localhost:3000/api/admin/inventory-os', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'transition', id: 'u1', to: 'verified' }),
      })
    );

    expect(res.status).toBe(401);
    expect(updateRecordMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/listings — partner scope (Ad Listing)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyPortalRequestMock.mockResolvedValue(admin);
    listRecordsMock.mockResolvedValue(UNITS);
  });

  it('returns every listing for staff', async () => {
    const res = await listingsGet(req('/api/admin/listings'));
    const body = await res.json();

    expect(body.listings).toHaveLength(3);
  });

  it('filters a partner to their own portfolio — their numbers, their units', async () => {
    verifyPortalRequestMock.mockResolvedValue(partner);

    const res = await listingsGet(req('/api/admin/listings'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(2);
    expect(body.listings).toHaveLength(2);
  });
});

describe('GET /api/admin/leads — partner scope (CRM)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyPortalRequestMock.mockResolvedValue(admin);
    listRecordsMock.mockResolvedValue(LEADS);
  });

  it('returns every lead for staff', async () => {
    const res = await leadsGet(req('/api/admin/leads'));
    const body = await res.json();

    expect(body.leads).toHaveLength(2);
  });

  it('filters a partner to leads targeting their compounds', async () => {
    verifyPortalRequestMock.mockResolvedValue(partner);

    const res = await leadsGet(req('/api/admin/leads'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.leads).toHaveLength(1);
    expect(body.leads[0].name).toBe('In-Scope Client');
  });
});

describe('PATCH /api/admin/leads/[id] — partner may advance their OWN leads only', () => {
  const patch = (id: string, body: unknown) =>
    new NextRequest(`http://localhost:3000/api/admin/leads/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    verifyPortalRequestMock.mockResolvedValue(admin);
    updateRecordMock.mockResolvedValue({ id: 'lead-1', fullName: 'X', pipelineStage: 'ai-matched' });
  });

  it('allows a partner to advance the stage of their own lead', async () => {
    verifyPortalRequestMock.mockResolvedValue(partner);
    getRecordMock.mockResolvedValue({ id: 'lead-1', targetCompound: 'Mountain View iCity' });

    const res = await leadPatch(patch('lead-1', { stage: 'AI Matched' }), {
      params: Promise.resolve({ id: 'lead-1' }),
    } as any);

    expect(res.status).toBe(200);
    expect(updateRecordMock).toHaveBeenCalled();
  });

  it('403s a partner touching a lead outside their portfolio', async () => {
    verifyPortalRequestMock.mockResolvedValue(partner);
    getRecordMock.mockResolvedValue({ id: 'lead-2', targetCompound: 'Mivida' });

    const res = await leadPatch(patch('lead-2', { stage: 'AI Matched' }), {
      params: Promise.resolve({ id: 'lead-2' }),
    } as any);

    expect(res.status).toBe(403);
    expect(updateRecordMock).not.toHaveBeenCalled();
  });

  it('403s a partner trying to rewrite lead fields beyond stage/hot', async () => {
    verifyPortalRequestMock.mockResolvedValue(partner);
    getRecordMock.mockResolvedValue({ id: 'lead-1', targetCompound: 'Mountain View iCity' });

    const res = await leadPatch(patch('lead-1', { name: 'Renamed', phone: '+2012' }), {
      params: Promise.resolve({ id: 'lead-1' }),
    } as any);

    expect(res.status).toBe(403);
    expect(updateRecordMock).not.toHaveBeenCalled();
  });
});
