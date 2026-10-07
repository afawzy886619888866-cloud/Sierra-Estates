/**
 * CRON: GET /api/cron/dispatch/[job] — Phase 11 automation dispatcher.
 *
 * [job] is either a WINDOW name (`night` | `morning`) or a single job name
 * (see lib/server/automation-jobs.ts for the registry).
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` (same as every cron route). The
 * header is propagated to every invoked job handler, so the shared
 * verifyCronRequest/cronOwnerGuard gate applies end to end.
 *
 * What the dispatcher adds over calling /api/cron/<name> directly:
 *
 *   1. OBSERVABILITY — one automation_runs row per job execution (status,
 *      duration, trigger source, truncated response). Failures additionally
 *      upsert into the failed_orchestrations DLQ; a later success resolves it.
 *   2. DEDUPE — two independent schedulers (Vercel Cron fallback windows +
 *      GitHub Actions granular schedules) may both fire the same job inside a
 *      dedupe window; the second invocation records an honest `skipped` run
 *      instead of doing the work twice. `?force=1` bypasses the guard.
 *   3. ISOLATION — each job runs in its own try/catch; one bad job never
 *      aborts the rest of the window.
 *   4. RETRY SIGNAL — HTTP 500 when any job failed, so both Vercel's
 *      scheduler and GHA's `curl --retry` treat the dispatch as failed and
 *      re-run it; the dedupe guard then makes the retry execute ONLY the
 *      jobs that failed.
 *
 * Jobs are invoked IN-PROCESS (dynamic import + NextRequest with the original
 * Authorization header) — no network round-trip, no self-fetch deadlock. Each
 * job handler is called with its own clean URL, exactly like a scheduled call.
 *
 * Scheduling (see .github/workflows/automations.yml):
 *   · Vercel Hobby keeps TWO cron slots: night @ 02:00 UTC, morning @ 06:00 UTC.
 *   · GitHub Actions (canonical): hourly whatsapp-dispatch, 3-hourly timers,
 *     daily windows, plus a manual matrix over every job.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/server/cron-auth';
import {
    resolveDispatchTarget,
    listAutomationJobNames,
    listAutomationWindowNames,
    type AutomationJob,
} from '@/lib/server/automation-jobs';
import {
    hasRecentSuccess,
    recordAutomationRun,
    recordAutomationFailure,
    resolveAutomationFailures,
    summarizeResponse,
} from '@/lib/server/automation-run';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Lazy handler map — dynamic imports keep the dispatcher's cold start light
 * and avoid bundling every job's dependencies into every dispatch.
 */
const JOB_HANDLERS: Record<string, () => Promise<{ GET: (req: NextRequest) => Promise<Response> }>> = {
    'maintenance': () => import('../../maintenance/route'),
    'expire-reservations': () => import('../../expire-reservations/route'),
    'lead-timers': () => import('../../lead-timers/route'),
    'check-availability-sla': () => import('../../check-availability-sla/route'),
    'sync-listings': () => import('../../sync-listings/route'),
    'sync-master-sheet': () => import('../../sync-master-sheet/route'),
    'ingest-from-sheets': () => import('../../ingest-from-sheets/route'),
    'sync-leads': () => import('../../sync-leads/route'),
    'whatsapp-dispatch': () => import('../../whatsapp-dispatch/route'),
    'apply-migrations': () => import('../../apply-migrations/route'),
};

interface JobOutcome {
    job: string;
    status: 'success' | 'failed' | 'skipped';
    httpStatus?: number;
    durationMs?: number;
    error?: string;
    reason?: string;
}

/** Read the first string-valued error field out of a job response body. */
function extractErrorMessage(body: unknown, fallback: string): string {
    if (body && typeof body === 'object') {
        const record = body as Record<string, unknown>;
        for (const key of ['error', 'message', 'detail']) {
            const value = record[key];
            if (typeof value === 'string' && value.length > 0) return value;
        }
    }
    return fallback;
}

/** True when the handler answered 2xx and did not report a skip/failure body. */
function isRealSuccess(httpStatus: number, body: unknown): boolean {
    if (httpStatus < 200 || httpStatus >= 300) return false;
    if (body && typeof body === 'object') {
        const record = body as Record<string, unknown>;
        if (record.success === false) return false;
        // cronOwnerGuard-style skip is not a failure — recorded as skipped.
        if (record.skipped === true) return false;
    }
    return true;
}

async function executeJob(
    job: AutomationJob,
    req: NextRequest,
    triggerSource: string,
    force: boolean,
): Promise<JobOutcome> {
    const startedAt = new Date();
    const startedMs = Date.now();

    // ── Dedupe guard (bypass with ?force=1) ───────────────────────────────
    if (!force && job.dedupeHours > 0 && (await hasRecentSuccess(job.name, job.dedupeHours))) {
        const finishedAt = new Date();
        const durationMs = Date.now() - startedMs;
        await recordAutomationRun({
            job: job.name,
            triggerSource,
            status: 'skipped',
            startedAt,
            finishedAt,
            durationMs,
            summary: { reason: 'recent_success', withinHours: job.dedupeHours },
        });
        return { job: job.name, status: 'skipped', reason: 'recent_success', durationMs };
    }

    try {
        const handler = JOB_HANDLERS[job.name];
        if (!handler) {
            // Registry and map drifted — fail loudly for this job only.
            throw new Error(`No handler registered for job "${job.name}"`);
        }

        // Clean per-job URL + propagated auth header, mirroring a scheduled call.
        const url = new URL(`/api/cron/${job.name}`, req.nextUrl.origin);
        const subRequest = new NextRequest(url, {
            headers: { authorization: req.headers.get('authorization') ?? '' },
        });

        const module = await handler();
        const response = await module.GET(subRequest);

        let body: unknown = null;
        try {
            body = await response.json();
        } catch {
            body = null;
        }

        const finishedAt = new Date();
        const durationMs = Date.now() - startedMs;
        const summary = summarizeResponse(body);
        const skippedByOwner =
            body !== null &&
            typeof body === 'object' &&
            (body as Record<string, unknown>).skipped === true;

        if (isRealSuccess(response.status, body)) {
            await recordAutomationRun({
                job: job.name,
                triggerSource,
                status: 'success',
                startedAt,
                finishedAt,
                durationMs,
                summary,
            });
            // Self-healing: a fresh success closes the DLQ for this pipeline.
            await resolveAutomationFailures(job.name);
            return { job: job.name, status: 'success', httpStatus: response.status, durationMs };
        }

        if (skippedByOwner) {
            await recordAutomationRun({
                job: job.name,
                triggerSource,
                status: 'skipped',
                startedAt,
                finishedAt,
                durationMs,
                summary,
            });
            return { job: job.name, status: 'skipped', reason: 'owner-mismatch', durationMs };
        }

        const error = extractErrorMessage(body, `HTTP ${response.status}`);
        await recordAutomationRun({
            job: job.name,
            triggerSource,
            status: 'failed',
            startedAt,
            finishedAt,
            durationMs,
            summary,
            error,
        });
        await recordAutomationFailure(job.name, error, { httpStatus: response.status });
        return { job: job.name, status: 'failed', httpStatus: response.status, error, durationMs };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        const finishedAt = new Date();
        const durationMs = Date.now() - startedMs;
        await recordAutomationRun({
            job: job.name,
            triggerSource,
            status: 'failed',
            startedAt,
            finishedAt,
            durationMs,
            error,
        });
        await recordAutomationFailure(job.name, error, {});
        return { job: job.name, status: 'failed', error, durationMs };
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
    const denied = verifyCronRequest(req);
    if (denied) return denied;

    const { job: target } = await params;
    const resolved = resolveDispatchTarget(target);
    if (!resolved) {
        return NextResponse.json(
            {
                error: 'Unknown automation target',
                target,
                windows: listAutomationWindowNames(),
                jobs: listAutomationJobNames(),
            },
            { status: 404 },
        );
    }

    const force = req.nextUrl.searchParams.get('force') === '1';
    const triggerSource = req.nextUrl.searchParams.get('source') ?? 'scheduled';
    const jobs = resolved.kind === 'window' ? resolved.jobs : [resolved.job];

    const startedMs = Date.now();
    const results: JobOutcome[] = [];
    for (const job of jobs) {
        logger.info(`[dispatch] ${job.name}: starting (source=${triggerSource}${force ? ', force' : ''})`);
        const outcome = await executeJob(job, req, triggerSource, force);
        results.push(outcome);
        logger.info(`[dispatch] ${job.name}: ${outcome.status}${outcome.error ? ` — ${outcome.error}` : ''}`);
    }

    const failed = results.filter((r) => r.status === 'failed').length;
    const payload = {
        target,
        kind: resolved.kind,
        triggerSource,
        force,
        results,
        summary: {
            total: results.length,
            succeeded: results.filter((r) => r.status === 'success').length,
            skipped: results.filter((r) => r.status === 'skipped').length,
            failed,
        },
        durationMs: Date.now() - startedMs,
        timestamp: new Date().toISOString(),
    };

    // 500 when any job failed: both schedulers treat that as "retry please",
    // and the dedupe guard makes the retry re-execute only the failures.
    return NextResponse.json(payload, { status: failed > 0 ? 500 : 200 });
}
