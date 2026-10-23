/**
 * Tests: Phase 12 — Data Integrity Control Center.
 *
 *   · /api/admin/dashboard computes inventoryHealth (freshness buckets,
 *     publish cascade, verification queue, dupe bookkeeping) and
 *     automationHealth (per-job last run + open DLQ) from REAL table rows.
 *   · Degradation contract: when the 013 projection or the 017 ledger is
 *     unavailable, the endpoint still returns the core KPIs and reports the
 *     section as null — the control center must never fabricate zeros, and
 *     a pending migration must never take the dashboard down.
 *   · DashboardView renders the four control-center widgets with honest
 *     empty / not-available states before any data arrives.
 */
import React from 'react';

const mockListRecords = jest.fn();
const mockCountRecords = jest.fn();
const mockRequireRole = jest.fn();

jest.mock('@sierra-estates/db', () => ({
    listRecords: (...a: unknown[]) => mockListRecords(...a),
    countRecords: (...a: unknown[]) => mockCountRecords(...a),
}));

jest.mock('@/lib/auth', () => ({
    requireRole: (...a: unknown[]) => mockRequireRole(...a),
}));

import { GET as dashboardGET } from '../app/api/admin/dashboard/route';
import DashboardView from '../app/admin/views/DashboardView';
import { renderToStaticMarkup } from 'react-dom/server';

// DashboardView fetches several endpoints; return inert failures for all
// until a test overrides this with real payloads.
const mockFetch = jest.fn();
(globalThis as { fetch: unknown }).fetch = mockFetch;

function daysAgo(n: number): string {
    return new Date(Date.now() - n * 86_400_000).toISOString();
}

function callDashboard(): Promise<Response> {
    return dashboardGET(new Request('https://sierra-estates.net/api/admin/dashboard'));
}

/** Route tables by name — mirrors the projections the route asks for. */
function stubTables(tables: Record<string, unknown[]>, counts: Record<string, number> = {}): void {
    mockListRecords.mockImplementation(async (table: string) => tables[table] ?? []);
    mockCountRecords.mockImplementation(async (table: string) => counts[table] ?? 0);
}

beforeEach(() => {
    jest.clearAllMocks();
    mockRequireRole.mockResolvedValue(true);
    mockFetch.mockReset().mockResolvedValue({
        ok: false,
        json: async () => null,
    });
});

describe('/api/admin/dashboard inventoryHealth + automationHealth', () => {
    it('computes freshness buckets, publish cascade, verification and dupe counts from real rows', async () => {
        stubTables(
            {
                listings: [
                    {
                        id: 'l1',
                        status: 'available',
                        agent_name: 'A',
                        valuation_status: null,
                        price: 1,
                        sourceVerifiedAt: daysAgo(5),
                        publishStatus: 'PUBLISHABLE',
                        verified: true,
                        dupeCheckHash: 'h1',
                    },
                    {
                        id: 'l2',
                        status: 'draft',
                        agent_name: 'A',
                        valuation_status: null,
                        price: 2,
                        sourceVerifiedAt: daysAgo(45),
                        publishStatus: 'REVIEW_REQUIRED',
                        verified: false,
                        dupeCheckHash: null,
                    },
                    {
                        id: 'l3',
                        status: 'draft',
                        agent_name: 'A',
                        valuation_status: null,
                        price: 3,
                        sourceVerifiedAt: daysAgo(200),
                        publishStatus: 'STALE',
                        verified: false,
                        dupeCheckHash: 'h3',
                    },
                    {
                        id: 'l4',
                        status: 'archived',
                        agent_name: 'A',
                        valuation_status: null,
                        price: 4,
                        sourceVerifiedAt: null,
                        publishStatus: 'DUPLICATE',
                        verified: false,
                        dupeCheckHash: null,
                    },
                ],
                inquiries: [],
                leads: [],
                automation_runs: [
                    // Ordered newest-first, as the real started_at DESC query returns.
                    { job: 'sync-leads', status: 'success', finishedAt: daysAgo(0.1), durationMs: 1200, triggerSource: 'github-actions' },
                    { job: 'sync-leads', status: 'failed', finishedAt: daysAgo(0.2), durationMs: null, triggerSource: 'scheduled' },
                    { job: 'maintenance', status: 'success', finishedAt: daysAgo(1), durationMs: 800, triggerSource: 'vercel-cron' },
                ],
            },
            { profiles: 3, compounds: 2, failed_orchestrations: 2 },
        );

        const res = await callDashboard();
        expect(res.status).toBe(200);
        const body = await res.json();

        expect(body.inventoryHealth).toEqual({
            freshness: { fresh: 1, aging: 1, stale: 1, never: 1 },
            publishStatusCounts: { PUBLISHABLE: 1, REVIEW_REQUIRED: 1, STALE: 1, DUPLICATE: 1 },
            needsVerification: 3,
            unfingerprinted: 2,
            totalListings: 4,
        });

        // Automation health folds to the NEWEST run per job (runs arrive
        // newest-first) and reports the open DLQ count.
        const byJob = Object.fromEntries(body.automationHealth.jobs.map((j: { job: string }) => [j.job, j]));
        expect(byJob['sync-leads'].status).toBe('success');
        expect(byJob['sync-leads'].triggerSource).toBe('github-actions');
        expect(byJob['maintenance'].status).toBe('success');
        expect(body.automationHealth.openDeadLetterQueue).toBe(2);
    });

    it('reports an empty database honestly (zeros are the truth when there is no data)', async () => {
        stubTables(
            {
                listings: [],
                inquiries: [],
                leads: [],
                automation_runs: [],
            },
            { profiles: 0, compounds: 0, failed_orchestrations: 0 },
        );

        const res = await callDashboard();
        const body = await res.json();
        expect(body.inventoryHealth).toEqual({
            freshness: { fresh: 0, aging: 0, stale: 0, never: 0 },
            publishStatusCounts: {},
            needsVerification: 0,
            unfingerprinted: 0,
            totalListings: 0,
        });
        expect(body.automationHealth).toEqual({ jobs: [], openDeadLetterQueue: 0 });
        // Core KPIs still present.
        expect(body.totalListings).toBe(0);
    });

    it('degrades to core KPIs with inventoryHealth:null when the 013 projection fails', async () => {
        // The 013 projection rejects (columns missing); the fallback read
        // (core columns only) succeeds — mirroring a database without 013.
        mockListRecords.mockImplementation(async (table: string, options: { select?: string } = {}) => {
            if (table === 'listings' && options.select?.includes('source_verified_at')) {
                throw new Error('column listings.source_verified_at does not exist');
            }
            if (table === 'listings') {
                return [
                    { id: 'l1', status: 'available', agent_name: 'A', valuation_status: null, price: 1 },
                    { id: 'l2', status: 'active', agent_name: 'B', valuation_status: null, price: 2 },
                ];
            }
            // automation_runs is readable here — 017 IS applied on this database.
            if (table === 'automation_runs') {
                return [{ job: 'maintenance', status: 'success', finishedAt: daysAgo(1), durationMs: 10, triggerSource: 'vercel-cron' }];
            }
            return [];
        });
        mockCountRecords.mockResolvedValue(4);

        const res = await callDashboard();
        expect(res.status).toBe(200);
        const body = await res.json();

        // Core KPIs survived the degradation…
        expect(body.totalListings).toBe(2);
        expect(body.activeListings).toBe(2);
        // …the unavailable section reports null, never fake zeros…
        expect(body.inventoryHealth).toBeNull();
        // …and the automation section still works (017 applied).
        expect(body.automationHealth).toEqual({
            jobs: [expect.objectContaining({ job: 'maintenance', status: 'success' })],
            openDeadLetterQueue: 4,
        });
    });

    it('keeps automationHealth null when migration 017 is not applied', async () => {
        mockListRecords.mockImplementation(async (table: string, options: { select?: string } = {}) => {
            if (table === 'automation_runs') throw new Error('relation "automation_runs" does not exist');
            if (table === 'listings') {
                if (options.select?.includes('source_verified_at')) {
                    // 013 projection row (013 applied on this database).
                    return [{ id: 'l1', sourceVerifiedAt: null, publishStatus: null, verified: false, dupeCheckHash: null }];
                }
                return [{ id: 'l1', status: 'available', agent_name: 'A', valuation_status: null, price: 1 }];
            }
            return [];
        });
        mockCountRecords.mockResolvedValue(1);

        const res = await callDashboard();
        const body = await res.json();
        expect(body.automationHealth).toBeNull();
        // The inventory projection itself still worked (013 applied).
        expect(body.inventoryHealth).toEqual({
            freshness: { fresh: 0, aging: 0, stale: 0, never: 1 },
            publishStatusCounts: { UNCLASSIFIED: 1 },
            needsVerification: 1,
            unfingerprinted: 1,
            totalListings: 1,
        });
    });
});

describe('DashboardView control center (honest render)', () => {
    it('renders the four control-center widget headers before any data loads', () => {
        const out = renderToStaticMarkup(React.createElement(DashboardView, { lang: 'en' }));
        expect(out).toContain('Inventory Freshness');
        expect(out).toContain('Publish Readiness');
        expect(out).toContain('Verification Queue');
        expect(out).toContain('Automation Health');
    });

    it('shows the not-available state (not fake zeros) when migrations are pending', () => {
        const out = renderToStaticMarkup(React.createElement(DashboardView, { lang: 'en' }));
        expect(out).toContain('Not available');
    });
});
