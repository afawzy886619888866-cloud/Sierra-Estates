/**
 * Tests: Phase 11 — automation unification.
 *
 *   · lib/server/automation-jobs.ts registry invariants (incl. on-disk
 *     route existence and the dispatcher's handler-map completeness)
 *   · /api/cron/dispatch/[job] behaviour (window fan-out, dedupe guard,
 *     failure isolation, DLQ recording, retry signal)
 *   · Scheduling contracts: exactly TWO Vercel cron slots (Hobby cap) that
 *     point at dispatcher windows, plus the canonical GitHub Actions
 *     workflow with a schedule per target.
 *
 * The sibling job routes are mocked here on purpose: the dispatcher's
 * contract is how it calls them (clean URL, propagated auth header, per-job
 * isolation), not what the jobs themselves do — those have their own suites.
 */
import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const mockHasRecentSuccess = jest.fn();
const mockRecordRun = jest.fn();
const mockRecordFailure = jest.fn();
const mockResolveFailures = jest.fn();

jest.mock('@/lib/server/automation-run', () => ({
    hasRecentSuccess: (...a: unknown[]) => mockHasRecentSuccess(...a),
    recordAutomationRun: (...a: unknown[]) => mockRecordRun(...a),
    recordAutomationFailure: (...a: unknown[]) => mockRecordFailure(...a),
    resolveAutomationFailures: (...a: unknown[]) => mockResolveFailures(...a),
    summarizeResponse: (body: unknown) => ({ response: body }),
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// One mock per job route the tests dispatch (dynamic import resolves to the
// same files the dispatcher imports — jest.mock intercepts both spellings).
const mockJobHandlers: Record<string, jest.Mock> = {
    maintenance: jest.fn(),
    'expire-reservations': jest.fn(),
    'lead-timers': jest.fn(),
    'check-availability-sla': jest.fn(),
    'whatsapp-dispatch': jest.fn(),
};

jest.mock('@/app/api/cron/maintenance/route', () => ({
    GET: (req: unknown) => mockJobHandlers['maintenance'](req),
}));
jest.mock('@/app/api/cron/expire-reservations/route', () => ({
    GET: (req: unknown) => mockJobHandlers['expire-reservations'](req),
}));
jest.mock('@/app/api/cron/lead-timers/route', () => ({
    GET: (req: unknown) => mockJobHandlers['lead-timers'](req),
}));
jest.mock('@/app/api/cron/check-availability-sla/route', () => ({
    GET: (req: unknown) => mockJobHandlers['check-availability-sla'](req),
}));
jest.mock('@/app/api/cron/whatsapp-dispatch/route', () => ({
    GET: (req: unknown) => mockJobHandlers['whatsapp-dispatch'](req),
}));

import { GET as dispatch } from '../app/api/cron/dispatch/[job]/route';
import {
    AUTOMATION_JOBS,
    resolveDispatchTarget,
    getAutomationJob,
    listAutomationWindowJobs,
    listAutomationJobNames,
} from '../lib/server/automation-jobs';

const APP_DIR = join(__dirname, '..');
const REPO_ROOT = join(APP_DIR, '..', '..');

function dispatchRequest(target: string, query: Record<string, string> = {}, headers: Record<string, string> = {}) {
    const qs = new URLSearchParams(query).toString();
    const url = `https://sierra-estates.net/api/cron/dispatch/${target}${qs ? `?${qs}` : ''}`;
    return new NextRequest(url, { headers });
}

async function callDispatch(target: string, query: Record<string, string> = {}, headers: Record<string, string> = {}) {
    return dispatch(dispatchRequest(target, query, headers), {
        params: Promise.resolve({ job: target }),
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    mockHasRecentSuccess.mockResolvedValue(false);
    for (const handler of Object.values(mockJobHandlers)) {
        handler.mockReset().mockResolvedValue(NextResponse.json({ success: true }));
    }
});

// ─── Registry invariants ─────────────────────────────────────────────────────
describe('automation-jobs registry', () => {
    it('registers every job against a real cron route on disk', () => {
        for (const job of AUTOMATION_JOBS) {
            expect(existsSync(join(APP_DIR, 'app', 'api', 'cron', job.name, 'route.ts'))).toBe(true);
        }
    });

    it('has a dispatcher handler-map entry for every registered job (no registry drift)', () => {
        const source = readFileSync(join(APP_DIR, 'app', 'api', 'cron', 'dispatch', '[job]', 'route.ts'), 'utf8');
        for (const job of AUTOMATION_JOBS) {
            expect(source).toContain(`'${job.name}':`);
        }
    });

    it('defines both fallback windows non-empty and nothing else', () => {
        const night = listAutomationWindowJobs('night');
        const morning = listAutomationWindowJobs('morning');
        expect(night.length).toBeGreaterThan(0);
        expect(morning.length).toBeGreaterThan(0);
        // maintenance (flag_stale_listings) is the roadmap-mandated night job.
        expect(night.map((j) => j.name)).toContain('maintenance');
        // Property Finder sync stays in the morning data window.
        expect(morning.map((j) => j.name)).toContain('sync-listings');
        expect(morning.map((j) => j.name)).toContain('sync-leads');
        // whatsapp-dispatch is hourly via GHA only.
        expect(getAutomationJob('whatsapp-dispatch')?.window).toBeNull();
    });

    it('keeps apply-migrations deliberately unscheduled (DDL is a deliberate act)', () => {
        const applyMigrations = getAutomationJob('apply-migrations');
        expect(applyMigrations).toBeDefined();
        expect(applyMigrations?.window).toBeNull();
        expect(applyMigrations?.dedupeHours).toBe(0);
    });

    it('uses sane dedupe windows for every job', () => {
        for (const job of AUTOMATION_JOBS) {
            expect(job.dedupeHours).toBeGreaterThanOrEqual(0);
            // Nothing dedupes longer than a day — a stuck ledger must never
            // permanently disable a job.
            expect(job.dedupeHours).toBeLessThanOrEqual(24);
        }
    });

    it('resolves windows, single jobs, and rejects unknown targets honestly', () => {
        const night = resolveDispatchTarget('night');
        expect(night?.kind).toBe('window');
        expect(night?.jobs.length).toBe(listAutomationWindowJobs('night').length);

        const single = resolveDispatchTarget('lead-timers');
        expect(single?.kind).toBe('job');
        expect(single?.job.name).toBe('lead-timers');

        expect(resolveDispatchTarget('does-not-exist')).toBeNull();
    });
});

// ─── Dispatcher behaviour ─────────────────────────────────────────────────────
describe('/api/cron/dispatch/[job]', () => {
    it('answers 404 with the full menu for an unknown target', async () => {
        const res = await callDispatch('not-a-job');
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toContain('Unknown automation target');
        expect(body.jobs).toEqual(listAutomationJobNames());
        expect(body.windows).toEqual(['night', 'morning']);
    });

    it('runs a whole window, records one success run per job, and resolves DLQ entries', async () => {
        const res = await callDispatch('night', { source: 'github-actions' });
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.summary).toMatchObject({
            total: listAutomationWindowJobs('night').length,
            succeeded: listAutomationWindowJobs('night').length,
            failed: 0,
        });

        // Every night job handler actually ran…
        for (const job of listAutomationWindowJobs('night')) {
            const handler = mockJobHandlers[job.name];
            if (handler) expect(handler).toHaveBeenCalledTimes(1);
        }
        // …and each success produced a ledger row + a DLQ resolution.
        expect(mockRecordRun).toHaveBeenCalledTimes(listAutomationWindowJobs('night').length);
        for (const call of mockRecordRun.mock.calls) {
            expect(call[0]).toMatchObject({ status: 'success', triggerSource: 'github-actions' });
        }
        expect(mockRecordFailure).not.toHaveBeenCalled();
        expect(mockResolveFailures).toHaveBeenCalled();
    });

    it('propagates the Authorization header to the invoked job handler', async () => {
        let capturedAuth: string | null = null;
        mockJobHandlers['maintenance'].mockImplementation(async (req: NextRequest) => {
            capturedAuth = req.headers.get('authorization');
            return NextResponse.json({ success: true });
        });

        await callDispatch('maintenance', {}, { authorization: 'Bearer the-secret' });
        expect(capturedAuth).toBe('Bearer the-secret');
    });

    it('calls the job with its own clean /api/cron/<name> URL', async () => {
        let capturedUrl = '';
        mockJobHandlers['maintenance'].mockImplementation(async (req: NextRequest) => {
            capturedUrl = req.nextUrl.pathname + req.nextUrl.search;
            return NextResponse.json({ success: true });
        });

        await callDispatch('maintenance', { source: 'github-actions' }, { authorization: 'Bearer x' });
        expect(capturedUrl).toBe('/api/cron/maintenance');
    });

    it('isolates failures: one 500 job does not stop the window and signals HTTP 500', async () => {
        mockJobHandlers['maintenance'].mockResolvedValue(
            NextResponse.json({ success: false, error: 'upstream sheet API down' }, { status: 502 }),
        );

        const res = await callDispatch('night');
        expect(res.status).toBe(500);

        const body = await res.json();
        expect(body.summary.failed).toBe(1);
        expect(body.results.find((r: { job: string }) => r.job === 'maintenance')).toMatchObject({
            status: 'failed',
            error: 'upstream sheet API down',
        });
        // The rest of the window still ran and succeeded.
        expect(body.summary.succeeded).toBe(listAutomationWindowJobs('night').length - 1);

        // Failure bookkeeping: a failed ledger row + a DLQ upsert.
        const failedRun = mockRecordRun.mock.calls.find((c) => c[0].status === 'failed');
        expect(failedRun?.[0]).toMatchObject({ job: 'maintenance', error: 'upstream sheet API down' });
        expect(mockRecordFailure).toHaveBeenCalledWith('maintenance', 'upstream sheet API down', { httpStatus: 502 });
    });

    it('treats a thrown handler error as a failed run with a DLQ entry', async () => {
        mockJobHandlers['lead-timers'].mockRejectedValue(new Error('supabase timeout'));

        const res = await callDispatch('lead-timers');
        expect(res.status).toBe(500);
        expect(mockRecordRun.mock.calls[0][0]).toMatchObject({
            job: 'lead-timers',
            status: 'failed',
            error: 'supabase timeout',
        });
        expect(mockRecordFailure).toHaveBeenCalledWith('lead-timers', 'supabase timeout', {});
    });

    it('skips a job with a fresh success instead of running it twice (dual-scheduler dedupe)', async () => {
        mockHasRecentSuccess.mockImplementation(async (job: string) => job === 'maintenance');

        const res = await callDispatch('night');
        expect(res.status).toBe(200);

        const body = await res.json();
        const maintenance = body.results.find((r: { job: string }) => r.job === 'maintenance');
        expect(maintenance).toMatchObject({ status: 'skipped', reason: 'recent_success' });
        expect(mockJobHandlers['maintenance']).not.toHaveBeenCalled();

        // The skipped run is still recorded honestly…
        expect(mockRecordRun.mock.calls.some((c) => c[0].job === 'maintenance' && c[0].status === 'skipped')).toBe(true);
        // …while the other night jobs ran normally.
        expect(body.summary.succeeded).toBe(listAutomationWindowJobs('night').length - 1);
    });

    it('bypasses the dedupe guard with ?force=1', async () => {
        mockHasRecentSuccess.mockResolvedValue(true);

        const res = await callDispatch('maintenance', { force: '1' });
        expect(res.status).toBe(200);
        expect(mockJobHandlers['maintenance']).toHaveBeenCalledTimes(1);
        expect(mockRecordRun.mock.calls[0][0]).toMatchObject({ status: 'success' });
    });

    it('records a cronOwnerGuard-style {skipped:true} response as skipped, not failed', async () => {
        mockJobHandlers['whatsapp-dispatch'].mockResolvedValue(
            NextResponse.json({ skipped: true, reason: 'cron-owner-mismatch' }),
        );

        const res = await callDispatch('whatsapp-dispatch');
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.results[0]).toMatchObject({ status: 'skipped', reason: 'owner-mismatch' });
        expect(mockRecordFailure).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated calls before touching any job (fail-closed guard)', async () => {
        process.env.CRON_SECRET = 'cron-s3cret';
        try {
            const res = await callDispatch('night', {}, { authorization: 'Bearer wrong' });
            expect(res.status).toBe(401);
            expect(mockRecordRun).not.toHaveBeenCalled();
            expect(mockJobHandlers['maintenance']).not.toHaveBeenCalled();
        } finally {
            if (process.env.CRON_SECRET === 'cron-s3cret') delete process.env.CRON_SECRET;
        }
    });
});

// ─── Scheduling contracts ────────────────────────────────────────────────────
describe('scheduling configuration (Phase 11)', () => {
    function readCrons(file: string): { path: string; schedule: string }[] {
        const config = JSON.parse(readFileSync(file, 'utf8'));
        return config.crons ?? [];
    }

    it('keeps BOTH vercel.json files within the Vercel Hobby 2-cron cap', () => {
        for (const file of [join(APP_DIR, 'vercel.json'), join(REPO_ROOT, 'vercel.json')]) {
            const crons = readCrons(file);
            expect(crons.length).toBeLessThanOrEqual(2);
            expect(crons.map((c) => c.path).sort()).toEqual(
                ['/api/cron/dispatch/morning', '/api/cron/dispatch/night'].sort(),
            );
        }
    });

    it('has the canonical GitHub Actions scheduler with per-target schedules and retries', () => {
        const workflow = readFileSync(join(REPO_ROOT, '.github', 'workflows', 'automations.yml'), 'utf8');
        // Hourly WhatsApp drain, the two daily windows, the daily lead sync.
        expect(workflow).toContain("'10 * * * *'");
        expect(workflow).toContain("'10 2 * * *'");
        expect(workflow).toContain("'10 6 * * *'");
        expect(workflow).toContain("'10 10 * * *'");
        // Transport-level retries against the dispatcher's 500 retry signal.
        expect(workflow).toContain('--retry 3');
        // Every job is manually dispatchable.
        expect(workflow).toContain('apply-migrations');
        expect(workflow).toContain('whatsapp-dispatch');
    });

    it('retired the superseded crm-automation-crons workflow', () => {
        expect(existsSync(join(REPO_ROOT, '.github', 'workflows', 'crm-automation-crons.yml'))).toBe(false);
    });
});
