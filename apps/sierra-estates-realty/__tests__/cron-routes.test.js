/**
 * Tests: the scheduled cron routes.
 *
 *   /api/cron/sync-leads          /api/cron/sync-listings
 *   /api/cron/maintenance         /api/cron/sync-master-sheet
 *
 * These are now driven on a schedule by
 * .github/workflows/vercel-cron-bridge.yml, so their auth contract and their
 * failure handling are load-bearing: a route that throws on a transient
 * upstream error must return a 5xx (so the workflow retries and reports)
 * rather than a misleading 200.
 *
 * ⚠️ All four are FAIL-OPEN when CRON_SECRET is unset — pinned below, because
 * it means an unconfigured deployment leaves them publicly triggerable.
 *
 * CRON_SECRET is read inside the handler (not at module load), so these tests
 * set the env var directly without re-importing.
 */
import { NextRequest } from 'next/server';

const syncIncomingLeads = jest.fn();
const syncIncomingListings = jest.fn();
const flagStaleListings = jest.fn();
const syncMasterOwnerSheet = jest.fn();
const activitiesAdd = jest.fn();

jest.mock('@/lib/services/PFIntegrationService', () => ({
  PFIntegrationService: {
    get syncIncomingLeads() {
      return syncIncomingLeads;
    },
    get syncIncomingListings() {
      return syncIncomingListings;
    },
  },
}));

jest.mock('@/lib/services/MaintenanceMonitor', () => ({
  MaintenanceMonitor: {
    get flagStaleListings() {
      return flagStaleListings;
    },
  },
}));

jest.mock('@/lib/services/master-sheet-sync', () => ({
  syncMasterOwnerSheet: (...args) => syncMasterOwnerSheet(...args),
}));

jest.mock('@sierra-estates/db', () => ({
  // The cron routes log an activity row after each run.
  insertRecord: (...a) => activitiesAdd(...a),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { GET as syncLeads } from '../app/api/cron/sync-leads/route';
import { GET as syncListings } from '../app/api/cron/sync-listings/route';
import { GET as maintenance } from '../app/api/cron/maintenance/route';
import { GET as syncMasterSheet } from '../app/api/cron/sync-master-sheet/route';

const ORIGINAL_SECRET = process.env.CRON_SECRET;
const SECRET = 'cron-s3cret';

function request(headers = {}) {
  return new NextRequest('https://sierra-estates.net/api/cron/x', { headers } );
}

/** The bearer header the cron bridge workflow actually sends. */
const authed = () => request({ authorization: `Bearer ${SECRET}` });

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CRON_SECRET = SECRET;

  // Default happy-path returns; individual tests override.
  syncIncomingLeads.mockResolvedValue({ created: 0, updated: 0, skipped: 0 });
  syncIncomingListings.mockResolvedValue({ imported: 0, updated: 0 });
  flagStaleListings.mockResolvedValue(0);
  syncMasterOwnerSheet.mockResolvedValue({ success: true, count: 0 });
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_SECRET;
});

const routes = [
  ['sync-leads', syncLeads ],
  ['sync-listings', syncListings ],
  ['maintenance', maintenance ],
  ['sync-master-sheet', syncMasterSheet ],
];

describe.each(routes)('/api/cron/%s — auth', (_name, handler) => {
  it('accepts the Bearer token the cron bridge sends', async () => {
    const res = await handler(authed());

    expect(res.status).toBe(200);
  });

  it('rejects a missing Authorization header with 401', async () => {
    const res = await handler(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('rejects a wrong secret with 401', async () => {
    const res = await handler(request({ authorization: 'Bearer wrong' }));

    expect(res.status).toBe(401);
  });

  it('rejects a bare token without the Bearer prefix', async () => {
    const res = await handler(request({ authorization: SECRET }));

    expect(res.status).toBe(401);
  });

  // Regression guard for the fail-open fix. These routes kick off Sheets
  // syncs, PF imports and portfolio writes, so an unconfigured production
  // deployment must not leave them anonymously triggerable.
  it('returns 503 in production when CRON_SECRET is unset, rather than running', async () => {
    delete process.env.CRON_SECRET;
    const originalEnv = process.env.NODE_ENV;
    // NODE_ENV is typed read-only (Next augments ProcessEnv); assign via a widened cast.
    (process.env ).NODE_ENV = 'production';

    try {
      const res = await handler(request());

      expect(res.status).toBe(503);
      await expect(res.json()).resolves.toEqual({ error: 'Cron is not configured' });
    } finally {
      (process.env ).NODE_ENV = originalEnv;
    }
  });

  it('still runs unauthenticated outside production, for local dev', async () => {
    delete process.env.CRON_SECRET;

    const res = await handler(request());

    expect(res.status).toBe(200);
  });
});

describe('/api/cron/sync-leads', () => {
  it('returns the sync summary and a timestamp', async () => {
    syncIncomingLeads.mockResolvedValueOnce({ created: 3, updated: 2, skipped: 1 });

    const res = await syncLeads(authed());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.summary).toEqual({ created: 3, updated: 2, skipped: 1 });
    expect(Date.parse(body.timestamp)).not.toBeNaN();
  });

  it('writes an activity record when leads were created or updated', async () => {
    syncIncomingLeads.mockResolvedValueOnce({ created: 3, updated: 0, skipped: 0 });

    await syncLeads(authed());

    expect(activitiesAdd).toHaveBeenCalledTimes(1);
    expect(activitiesAdd).toHaveBeenCalledWith(
      'activities',
      expect.objectContaining({ type: 'sync_completed', actorId: 'system' }),
    );
  });

  it('skips the activity record when nothing changed', async () => {
    syncIncomingLeads.mockResolvedValueOnce({ created: 0, updated: 0, skipped: 5 });

    await syncLeads(authed());

    expect(activitiesAdd).not.toHaveBeenCalled();
  });

  it('returns 500 with the error message when the sync throws', async () => {
    syncIncomingLeads.mockRejectedValueOnce(new Error('PF gateway timeout'));

    const res = await syncLeads(authed());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toMatchObject({ success: false, error: 'PF gateway timeout' });
  });

  it('falls back to a generic message when the error has none', async () => {
    syncIncomingLeads.mockRejectedValueOnce(new Error(''));

    const body = await (await syncLeads(authed())).json();

    expect(body.error).toBe('Sync pipeline interrupted');
  });

  it('does not run the sync at all when unauthorised', async () => {
    await syncLeads(request());

    expect(syncIncomingLeads).not.toHaveBeenCalled();
  });
});

describe('/api/cron/sync-listings', () => {
  it('returns the import summary', async () => {
    syncIncomingListings.mockResolvedValueOnce({ imported: 4, updated: 1 });

    const body = await (await syncListings(authed())).json();

    expect(body).toMatchObject({ success: true, summary: { imported: 4, updated: 1 } });
  });

  it('logs an activity when listings were imported or updated', async () => {
    syncIncomingListings.mockResolvedValueOnce({ imported: 0, updated: 2 });

    await syncListings(authed());

    expect(activitiesAdd).toHaveBeenCalledWith(
      'activities',
      expect.objectContaining({ type: 'sync_completed' }),
    );
  });

  it('skips the activity when nothing was imported or updated', async () => {
    syncIncomingListings.mockResolvedValueOnce({ imported: 0, updated: 0 });

    await syncListings(authed());

    expect(activitiesAdd).not.toHaveBeenCalled();
  });

  it('returns 500 when the listing sync throws', async () => {
    syncIncomingListings.mockRejectedValueOnce(new Error('rate limited'));

    const res = await syncListings(authed());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: 'rate limited' });
  });

  it('falls back to a generic message when the error has none', async () => {
    syncIncomingListings.mockRejectedValueOnce(new Error(''));

    const body = await (await syncListings(authed())).json();

    expect(body.error).toBe('Listing sync failed');
  });
});

describe('/api/cron/maintenance', () => {
  it('returns the flagged count', async () => {
    flagStaleListings.mockResolvedValueOnce(7);

    const body = await (await maintenance(authed())).json();

    expect(body).toMatchObject({ success: true, flaggedCount: 7 });
  });

  it('logs an activity when assets were flagged', async () => {
    flagStaleListings.mockResolvedValueOnce(7);

    await maintenance(authed());

    expect(activitiesAdd).toHaveBeenCalledWith(
      'activities',
      expect.objectContaining({ type: 'maintenance_completed' }),
    );
  });

  it('skips the activity when nothing was flagged', async () => {
    flagStaleListings.mockResolvedValueOnce(0);

    await maintenance(authed());

    expect(activitiesAdd).not.toHaveBeenCalled();
  });

  it('returns 500 when the audit throws', async () => {
    flagStaleListings.mockRejectedValueOnce(new Error('firestore unavailable'));

    const res = await maintenance(authed());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: 'firestore unavailable' });
  });

  it('falls back to a generic message when the error has none', async () => {
    flagStaleListings.mockRejectedValueOnce(new Error(''));

    const body = await (await maintenance(authed())).json();

    expect(body.error).toBe('Maintenance pipeline interrupted');
  });
});

describe('/api/cron/sync-master-sheet', () => {
  it('returns the synced unit count', async () => {
    syncMasterOwnerSheet.mockResolvedValueOnce({ success: true, count: 128 });

    const res = await syncMasterSheet(authed());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, count: 128 });
    expect(Date.parse(body.timestamp)).not.toBeNaN();
  });

  it('returns 502 when the sheet sync reports failure', async () => {
    // 502 rather than 500: the failure is upstream (Google Sheets), and the
    // cron bridge retries 5xx.
    syncMasterOwnerSheet.mockResolvedValueOnce({ success: false, error: 'sheet not found' });

    const res = await syncMasterSheet(authed());

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ success: false, error: 'sheet not found' });
  });

  it('does not call the sync when unauthorised', async () => {
    await syncMasterSheet(request());

    expect(syncMasterOwnerSheet).not.toHaveBeenCalled();
  });

  it('declares the nodejs runtime and a 60s budget for the long sync', async () => {
    const mod = await import('../app/api/cron/sync-master-sheet/route');

    expect(mod.runtime).toBe('nodejs');
    expect(mod.dynamic).toBe('force-dynamic');
    expect(mod.maxDuration).toBe(60);
  });
});
