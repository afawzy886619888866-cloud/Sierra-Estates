const seedHouyezPortalMock = jest.fn();

jest.mock('@/lib/houyez/firestore', () => ({
  seedHouyezPortal: (...args: unknown[]) => seedHouyezPortalMock(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { POST } from '@/app/api/houyez/seed/route';
import type { NextRequest } from 'next/server';

function makeReq(headers: Record<string, string> = {}, body: unknown = {}): NextRequest {
  return new Request('http://localhost:3000/api/houyez/seed', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

// NODE_ENV is typed read-only (Next augments ProcessEnv); assign via a widened cast.
function setNodeEnv(value: string): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe('POST /api/houyez/seed — fail-closed auth', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    seedHouyezPortalMock.mockResolvedValue({
      slides: 5, compounds: 3, rooms: 4, listings: 6, skipped: [], errors: [],
    });
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('production + ADMIN_API_KEY unset → 503 and does not seed', async () => {
    setNodeEnv('production');
    delete process.env.ADMIN_API_KEY;

    const res = await POST(makeReq());

    expect(res.status).toBe(503);
    expect(seedHouyezPortalMock).not.toHaveBeenCalled();
  });

  test('ADMIN_API_KEY set + wrong header → 401 and does not seed', async () => {
    setNodeEnv('production');
    process.env.ADMIN_API_KEY = 'the-secret';

    const res = await POST(makeReq({ 'x-admin-key': 'wrong' }));

    expect(res.status).toBe(401);
    expect(seedHouyezPortalMock).not.toHaveBeenCalled();
  });

  test('ADMIN_API_KEY set + correct header → 200 and seeds', async () => {
    setNodeEnv('production');
    process.env.ADMIN_API_KEY = 'the-secret';

    const res = await POST(makeReq({ 'x-admin-key': 'the-secret' }, { overwrite: true }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(seedHouyezPortalMock).toHaveBeenCalledWith({ overwrite: true });
  });

  test('development + no key → stays open (seeds) for convenience', async () => {
    setNodeEnv('development');
    delete process.env.ADMIN_API_KEY;

    const res = await POST(makeReq());

    expect(res.status).toBe(200);
    expect(seedHouyezPortalMock).toHaveBeenCalledTimes(1);
  });
});
