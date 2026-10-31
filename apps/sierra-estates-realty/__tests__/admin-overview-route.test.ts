/**
 * Tests: /api/admin/overview — the Unified Command Center's KPI endpoint.
 *
 *   · Rejects unauthenticated callers (401, no reads).
 *   · Computes the five headline KPIs from REAL rows:
 *       total deals value (non-closed), active leads, verified properties,
 *       inventory freshness %, bot fleet roll-up.
 *   · Degradation contract: when a table read fails (pending migration), the
 *     endpoint still returns the other widgets — never a 500, never zeros
 *     pretending to be data that was read.
 */
const listRecordsMock = jest.fn();
const verifyAdminRequestMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  listRecords: (...args: unknown[]) => listRecordsMock(...args),
}));

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: (...args: unknown[]) => verifyAdminRequestMock(...args),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}));

import { GET } from '@/app/api/admin/overview/route';
import { NextRequest } from 'next/server';

const makeReq = () => new NextRequest('http://localhost:3000/api/admin/overview');

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

/** Route-shaped fixture: resolve the table name from the mocked calls. */
function mockTables(tables: Record<string, Record<string, unknown>[]>): void {
  listRecordsMock.mockImplementation((table: string) =>
    Promise.resolve(tables[table] ?? []),
  );
}

describe('GET /api/admin/overview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'admin-1' });
    mockTables({});
  });

  test('rejects unauthenticated requests', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: false });

    const res = await GET(makeReq());

    expect(res.status).toBe(401);
    expect(listRecordsMock).not.toHaveBeenCalled();
  });

  test('computes the five headline KPIs from real rows', async () => {
    mockTables({
      deals: [
        { id: 'd1', stage: 'proposal', dealValue: '1000000', updatedAt: daysAgo(1) },
        { id: 'd2', stage: 'viewing', dealValue: 2_500_000, updatedAt: daysAgo(2) },
        { id: 'd3', stage: 'closed_won', dealValue: '9000000', updatedAt: daysAgo(3) },
        { id: 'd4', stage: 'closed_lost', dealValue: '500000', updatedAt: daysAgo(4) },
      ],
      leads: [
        { id: 'l1', status: 'new', archived: false, leadScore: 85, createdAt: daysAgo(1) },
        { id: 'l2', status: 'contacted', archived: false, leadScore: 60, createdAt: daysAgo(2) },
        { id: 'l3', status: 'won', archived: false, leadScore: 90, createdAt: daysAgo(3) },
        { id: 'l4', status: 'new', archived: true, leadScore: 40, createdAt: daysAgo(4) },
        { id: 'l5', status: 'new', archived: false, leadScore: 50, createdAt: daysAgo(20) },
      ],
      listings: [
        { id: 'p1', status: 'active', publishStatus: 'PUBLISHABLE', stale: false, freshnessScore: 95 },
        { id: 'p2', status: 'active', publishStatus: 'PUBLISHABLE', stale: false, freshnessScore: 85 },
        { id: 'p3', status: 'active', publishStatus: 'STALE', stale: true, freshnessScore: 40 },
        { id: 'p4', status: 'pending', publishStatus: 'REVIEW_REQUIRED', stale: false, freshnessScore: 100 },
        { id: 'p5', status: 'available', publishStatus: 'PUBLISHABLE', stale: null, freshnessScore: null },
      ],
      system_status: [
        { id: 'whatsapp-agent', status: 'active', enabled: true, lastPulse: daysAgo(0) },
        { id: 'scribe-agent', status: 'idle', enabled: true, lastPulse: daysAgo(1) },
        { id: 'old-bot', status: 'error', enabled: false, lastPulse: daysAgo(9) },
      ],
      activities: [],
      webhook_logs: [],
    });

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    // KPI 1 — active pipeline excludes closed_won + closed_lost.
    expect(body.kpis.totalDealsValue).toBe(3_500_000);
    expect(body.kpis.closedWonValue).toBe(9_000_000);
    expect(body.kpis.activeDealsCount).toBe(2);
    // KPI 2 — archived and won/lost leads are not active.
    expect(body.kpis.activeLeads).toBe(3);
    expect(body.kpis.newLeads7d).toBe(2);
    // Hot counts score >= 80 among ACTIVE leads only — the 90-score lead is
    // status 'won', so it is excluded.
    expect(body.kpis.hotLeads).toBe(1);
    // KPI 3 — only PUBLISHABLE, non-stale, live-status rows (p1, p2, p5;
    // null stale counts as not-stale — pre-011 rows never set the flag).
    expect(body.kpis.verifiedProperties).toBe(3);
    // KPI 4 — average over scored rows only (95 + 85 + 40 + 100) / 4 = 80.
    expect(body.kpis.inventoryFreshnessScore).toBe(80);
    expect(body.kpis.freshOver90).toBe(2);
    // KPI 5 — disabled bots are excluded from the active count.
    expect(body.kpis.bots).toEqual({ total: 3, enabled: 2, active: 1, erroring: 0 });
    // Pipeline strip values.
    const proposal = body.pipelineByStage.find((s: { stage: string }) => s.stage === 'proposal');
    expect(proposal).toEqual({ stage: 'proposal', value: 1_000_000, count: 1 });
  });

  test('degrades honestly when a section table fails to read', async () => {
    listRecordsMock.mockImplementation((table: string) => {
      if (table === 'listings') return Promise.reject(new Error('relation "freshness_score" does not exist'));
      if (table === 'webhook_logs') return Promise.reject(new Error('relation "webhook_logs" does not exist'));
      if (table === 'deals') {
        return Promise.resolve([
          { id: 'd1', stage: 'viewing', dealValue: 750_000, updatedAt: daysAgo(1) },
        ]);
      }
      return Promise.resolve([]);
    });

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.kpis.totalDealsValue).toBe(750_000);
    // The unreadable sections degrade to honest zeros, the endpoint survives.
    expect(body.kpis.verifiedProperties).toBe(0);
    expect(body.kpis.inventoryFreshnessScore).toBe(0);
    expect(body.webhookStats.last24h.total).toBe(0);
  });

  test('renders honest zeros on an empty deployment', async () => {
    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.kpis).toMatchObject({
      totalDealsValue: 0,
      activeLeads: 0,
      verifiedProperties: 0,
      inventoryFreshnessScore: 0,
    });
    expect(body.kpis.bots).toEqual({ total: 0, enabled: 0, active: 0, erroring: 0 });
  });
});
