/**
 * Phase 11 (automation unification) — run ledger + DLQ bookkeeping for the
 * /api/cron/dispatch/[job] dispatcher.
 *
 * Every dispatcher execution writes exactly one `automation_runs` row per job
 * (status success | failed | skipped — "skipped" is the honest record that the
 * dedupe guard saw a fresh success and did no work). Failures are additionally
 * upserted into the `failed_orchestrations` dead letter queue under the
 * pipeline name `cron:<job>`; the next successful run of the same job marks
 * those rows `resolved_at`, closing the retry loop.
 *
 * FAIL-SOFT BY DESIGN: every helper swallows its own errors (logger.warn only).
 * Observability must never be the reason a job does not run — the job result
 * is the product, the ledger is the audit trail.
 *
 * RLS note: all writes go through the service-role admin client, which
 * bypasses row level security (the tables are SELECT-only for staff).
 */
import { insertRecord, listRecords, updateRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

const DLQ_TABLE = 'failed_orchestrations';
const RUNS_TABLE = 'automation_runs';

/** A DLQ row for cron job `x` lives under this pipeline name. */
export function dlqPipeline(job: string): string {
    return `cron:${job}`;
}

interface RunRow {
    id: string;
}

/**
 * Dedupe guard: did this job record a successful run inside the window?
 * Returns false when the ledger is unreadable — a missing audit trail must
 * not silently disable a job.
 */
export async function hasRecentSuccess(job: string, hours: number, now: Date = new Date()): Promise<boolean> {
    if (hours <= 0) return false;
    const cutoff = new Date(now.getTime() - hours * 3_600_000).toISOString();
    try {
        const rows = await listRecords<RunRow>(RUNS_TABLE, {
            select: 'id',
            where: [
                { column: 'job', value: job },
                { column: 'status', value: 'success' },
                { column: 'startedAt', op: 'gte', value: cutoff },
            ],
            orderBy: { column: 'startedAt', ascending: false },
            limit: 1,
        });
        return rows.length > 0;
    } catch (err) {
        logger.warn(
            `[automation-run] dedupe lookup failed for ${job}: ${err instanceof Error ? err.message : String(err)} — running anyway`,
        );
        return false;
    }
}

export interface AutomationRunRecord {
    job: string;
    triggerSource: string;
    status: 'success' | 'failed' | 'skipped';
    startedAt: Date;
    finishedAt: Date;
    durationMs: number;
    /** Attempt number for retried executions (first run = 1). */
    attempt?: number;
    /** Small JSON payload: the job's own response (truncated) or skip reason. */
    summary?: Record<string, unknown>;
    error?: string;
}

/** Best-effort insert into the run ledger. Never throws. */
export async function recordAutomationRun(run: AutomationRunRecord): Promise<void> {
    try {
        await insertRecord(RUNS_TABLE, {
            job: run.job,
            triggerSource: run.triggerSource,
            status: run.status,
            startedAt: run.startedAt.toISOString(),
            finishedAt: run.finishedAt.toISOString(),
            durationMs: run.durationMs,
            attempt: run.attempt ?? 1,
            summary: run.summary ?? {},
            error: run.error ?? null,
        });
    } catch (err) {
        logger.warn(
            `[automation-run] could not record ${run.status} run for ${run.job}: ${err instanceof Error ? err.message : String(err)}`,
        );
    }
}

/**
 * Upsert a DLQ entry for a failed job: increments `attempts` on the most
 * recent open entry for the same pipeline instead of stacking one row per
 * retry, so the queue reads like "job x failed, tried n times".
 */
export async function recordAutomationFailure(
    job: string,
    error: string,
    payload: Record<string, unknown> = {},
): Promise<void> {
    const pipeline = dlqPipeline(job);
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 3_600_000).toISOString();
    try {
        const open = await listRecords<{ id: string; attempts: number }>(DLQ_TABLE, {
            where: [
                { column: 'pipeline', value: pipeline },
                { column: 'resolvedAt', value: null },
                { column: 'createdAt', op: 'gte', value: since },
            ],
            orderBy: { column: 'createdAt', ascending: false },
            limit: 1,
        });

        if (open.length > 0) {
            await updateRecord(DLQ_TABLE, open[0].id, {
                attempts: (open[0].attempts ?? 0) + 1,
                lastError: error,
                payload: { ...payload, lastFailedAt: now.toISOString() },
            });
        } else {
            await insertRecord(DLQ_TABLE, {
                pipeline,
                attempts: 1,
                lastError: error,
                payload: { ...payload, firstFailedAt: now.toISOString() },
            });
        }
    } catch (err) {
        logger.warn(
            `[automation-run] could not write DLQ entry for ${job}: ${err instanceof Error ? err.message : String(err)}`,
        );
    }
}

/**
 * Self-healing step: a fresh success resolves every open DLQ entry for the
 * same pipeline. Bounded to the most recent 20 open rows for safety.
 */
export async function resolveAutomationFailures(job: string): Promise<void> {
    const pipeline = dlqPipeline(job);
    try {
        const open = await listRecords<{ id: string }>(DLQ_TABLE, {
            select: 'id',
            where: [
                { column: 'pipeline', value: pipeline },
                { column: 'resolvedAt', value: null },
            ],
            orderBy: { column: 'createdAt', ascending: false },
            limit: 20,
        });
        if (open.length === 0) return;
        const resolvedAt = new Date().toISOString();
        for (const row of open) {
            await updateRecord(DLQ_TABLE, row.id, { resolvedAt });
        }
        logger.info(`[automation-run] resolved ${open.length} DLQ entr${open.length === 1 ? 'y' : 'ies'} for ${job}`);
    } catch (err) {
        logger.warn(
            `[automation-run] could not resolve DLQ for ${job}: ${err instanceof Error ? err.message : String(err)}`,
        );
    }
}

/**
 * Keep stored summaries small and JSON-safe: stringify, hard-cap, and if the
 * body was oversized store a marker with its size instead of the payload.
 */
export function summarizeResponse(body: unknown): Record<string, unknown> {
    if (body === null || body === undefined) return {};
    try {
        const text = JSON.stringify(body);
        if (text.length <= 2_000) return { response: body };
        return { response: `${text.slice(0, 500)}…`, truncated: true, size: text.length };
    } catch {
        return { response: String(body).slice(0, 500) };
    }
}
