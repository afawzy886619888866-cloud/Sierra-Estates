/**
 * POST /api/telegram/broadcast — Phase 2 end-to-end pipeline route test.
 *
 * Covers: permission gate (403 for roles without inventory:write), payload
 * validation, dryRun (no channel send, no writes, no audit), honest skip
 * when TELEGRAM_BOT_TOKEN is absent, canonical unit-code minting, and the
 * audit trail on a live run.
 */
import fs from 'fs';

const requireRoleMock = jest.fn();
const insertRecordMock = jest.fn();

jest.mock('@/lib/auth', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

jest.mock('@sierra-estates/db', () => ({
  getSupabaseAdmin: () => ({ from: jest.fn() }),
  isSupabaseAdminConfigured: () => true,
  insertRecord: (...args: unknown[]) => insertRecordMock(...args),
}));

import { POST } from '@/app/api/telegram/broadcast/route';

const ADMIN_SESSION = {
  uid: 'admin-uid-1',
  email: 'admin@sierra-estates.net',
  name: 'Admin',
  role: 'admin',
  exp: Date.now() / 1000 + 600,
};

const request = (body: unknown) =>
  new Request('http://localhost:3000/api/telegram/broadcast', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const UNIT = {
  compound: 'Hyde Park',
  dealType: 'rent',
  unitType: 'Apartment',
  areaSqm: 165,
  bedrooms: 3,
  bathrooms: 3,
  price: 25000,
  finishing: 'Fully Finished',
  contactPhone: '+201001234567',
};

beforeEach(() => {
  requireRoleMock.mockReset();
  insertRecordMock.mockReset();
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  delete process.env.GOOGLE_GENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/telegram/broadcast — access control', () => {
  it('rejects an unauthenticated caller (401 propagated from requireRole)', async () => {
    requireRoleMock.mockRejectedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );
    const res = await POST(request({ unit: UNIT }));
    expect(res.status).toBe(401);
  });

  it('rejects an authenticated role without inventory:write (403)', async () => {
    requireRoleMock.mockResolvedValue({ ...ADMIN_SESSION, role: 'sales_agent' });
    const res = await POST(request({ unit: UNIT }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('inventory:write');
  });
});

describe('POST /api/telegram/broadcast — validation', () => {
  it('rejects a payload without a unit/compound (400)', async () => {
    requireRoleMock.mockResolvedValue(ADMIN_SESSION);
    const res = await POST(request({ photoUrls: [] }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/telegram/broadcast — dry run (honest, zero side effects)', () => {
  it('formats, mints the canonical code and suppresses every destination', async () => {
    requireRoleMock.mockResolvedValue(ADMIN_SESSION);
    const res = await POST(request({ unit: UNIT, photoUrls: ['https://cdn.example/a.jpg'], dryRun: true }));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.unitCode).toMatch(/^SE-RNT-HYD-\d{3,6}$/);
    expect(body.formatted.source).toBe('template'); // no Gemini key in tests
    expect(body.formatted.caption).toContain('Hyde Park');
    expect(body.broadcast.skipped).toBe(true);
    expect(body.broadcast.error).toContain('dryRun');
    expect(body.syndication.supabase.action).toBe('unavailable');
    expect(body.syndication.masterCsv.action).toBe('skipped');
    expect(insertRecordMock).not.toHaveBeenCalled(); // no audit on dry run
  });
});

describe('POST /api/telegram/broadcast — live run honesty', () => {
  it('reports the channel skip honestly when the bot token is absent, still syndicates and audits', async () => {
    requireRoleMock.mockResolvedValue(ADMIN_SESSION);
    // Master CSV absent on this runtime → honest unavailable.
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    const res = await POST(request({ unit: UNIT, photoUrls: [] }));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(false);
    expect(body.broadcast.skipped).toBe(true);
    expect(body.broadcast.error).toContain('TELEGRAM_BOT_TOKEN');
    expect(body.syndication.unitCode).toMatch(/^SE-RNT-HYD-\d{3,6}$/);
    expect(body.syndication.masterCsv.action).toBe('unavailable');

    expect(insertRecordMock).toHaveBeenCalledTimes(1);
    const audit = insertRecordMock.mock.calls[0][1] as Record<string, unknown>;
    expect(audit.action).toBe('listing.telegram_broadcast');
    expect((audit.after as Record<string, unknown>).unitCode).toBe(body.unitCode);
  });
});
