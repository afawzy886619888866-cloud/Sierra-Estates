/**
 * API smoke tests — auth boundary checks for key routes.
 * All Firebase/external services are mocked so no real credentials needed.
 */

// Mock firebase-admin before any app code is imported
jest.mock('firebase-admin/app', () => ({ initializeApp: jest.fn(), getApps: jest.fn(() => []) }));
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  Timestamp: { now: jest.fn(() => ({ toDate: () => new Date() })) },
}));
jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn(() => ({ verifyIdToken: jest.fn().mockRejectedValue(new Error('No token')) })) }));

// Mock heavy service modules so tests don't need their dependencies
jest.mock('@/lib/services/orchestrator', () => ({ OrchestratorService: { runPipeline: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('@/lib/services/WhatsAppParserService', () => ({ WhatsAppParserService: { parse: jest.fn() } }));
jest.mock('@/lib/services/sheets-sync', () => ({ GoogleSheetsSync: jest.fn() }));
jest.mock('@/lib/services/coding-algorithm', () => ({ buildSierraCodeMetadata: jest.fn(() => ({})) }));
jest.mock('@/lib/server/firebase-admin', () => ({
  adminDb: new Proxy({}, { get: () => jest.fn() }),
  adminAuth: { verifyIdToken: jest.fn().mockRejectedValue(new Error('No token')) },
  isAdminInitialized: false,
}));
jest.mock('googleapis', () => ({ google: { auth: { GoogleAuth: jest.fn() }, sheets: jest.fn(() => ({ spreadsheets: { values: { get: jest.fn(), update: jest.fn() } } })) } }));

import { NextRequest } from 'next/server';

// --------------------------------------------------------------------------
// Helper: build a NextRequest-like object
// --------------------------------------------------------------------------
function makeReq(method: string, url: string, headers: Record<string, string> = {}, body?: unknown): NextRequest {
  const init: RequestInit = {
    method,
    headers: new Headers(headers),
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  return new NextRequest(new Request(`http://localhost:3000${url}`, init));
}

// --------------------------------------------------------------------------
// POST /api/orchestrate — requires X-SBR-SECRET-KEY
// --------------------------------------------------------------------------
describe('POST /api/orchestrate', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/orchestrate/route'));
  });

  test('returns 401 when X-SBR-SECRET-KEY is missing', async () => {
    const req = makeReq('POST', '/api/orchestrate', {}, { docId: 'abc', collection: 'listings' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('returns 401 when X-SBR-SECRET-KEY is wrong', async () => {
    const req = makeReq('POST', '/api/orchestrate', { 'X-SBR-SECRET-KEY': 'wrong-key' }, { docId: 'abc', collection: 'listings' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// --------------------------------------------------------------------------
// GET /api/cron/ingest-from-sheets — requires Bearer CRON_SECRET
// --------------------------------------------------------------------------
describe('GET /api/cron/ingest-from-sheets', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    ({ GET } = await import('@/app/api/cron/ingest-from-sheets/route'));
  });

  test('returns 401 when Authorization header is missing', async () => {
    // CRON_SECRET must be set so the route enforces the check
    process.env.CRON_SECRET = 'sierra_estates_dev_secret_2026';
    const req = makeReq('GET', '/api/cron/ingest-from-sheets');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  test('returns 401 when Bearer token is wrong', async () => {
    process.env.CRON_SECRET = 'sierra_estates_dev_secret_2026';
    const req = makeReq('GET', '/api/cron/ingest-from-sheets', { authorization: 'Bearer wrong-secret' });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
