/**
 * Phase 11 (automation unification) — the single source of truth for what
 * scheduled work exists and how it is grouped.
 *
 * Scheduling topology (roadmap: "unify crons, move off Hobby limits"):
 *
 *   · Vercel Cron (deployed vercel.json) is capped at TWO entries on the
 *     Hobby plan. Those two slots fire the dispatcher windows defined here
 *     (`night` + `morning`) — a no-secrets fallback that works even when
 *     GitHub Actions is not configured.
 *
 *   · GitHub Actions (.github/workflows/automations.yml) is the CANONICAL
 *     scheduler with one schedule per job/window — no entry-count limit,
 *     transport-level retries, and a manual dispatch matrix for every job.
 *
 *   · Both schedulers call the same dispatcher, so jobs must be idempotent
 *     AND the dispatcher applies a per-job `dedupeHours` guard: when a fresh
 *     success exists in `automation_runs`, the second invocation of the day
 *     records an honest `skipped` run instead of doing the work twice.
 *
 * `apply-migrations` is deliberately in NO window and NOT on any schedule:
 * DDL moves from the migration ledger only as a deliberate act (GHA manual
 * dispatch or the dedicated cron route), never as routine daily work.
 */

export type AutomationWindowName = 'night' | 'morning';

export interface AutomationJob {
    /** Canonical job name — matches the /api/cron/<name> route directory. */
    name: string;
    /** Which Vercel-cron fallback window includes this job (null = external/manual only). */
    window: AutomationWindowName | null;
    /** Skip execution when a success fresher than this exists (dual-scheduler dedupe). */
    dedupeHours: number;
    /** Human context, surfaced in 404 listings and run records. */
    description: string;
}

export const AUTOMATION_JOBS: readonly AutomationJob[] = [
    {
        name: 'maintenance',
        window: 'night',
        dedupeHours: 20,
        description: 'Portfolio hygiene audit — calls flag_stale_listings() and logs the activity feed entry.',
    },
    {
        name: 'expire-reservations',
        window: 'night',
        dedupeHours: 20,
        description: 'Releases unit reservations whose hold window has elapsed.',
    },
    {
        name: 'lead-timers',
        window: 'night',
        dedupeHours: 2,
        description: 'Phase 10 timers — flips overdue followups and drafts SLA followups for stale leads.',
    },
    {
        name: 'check-availability-sla',
        window: 'night',
        dedupeHours: 2,
        description: 'Availability SLA monitor — flags listings that breached the freshness SLA.',
    },
    {
        name: 'sync-listings',
        window: 'morning',
        dedupeHours: 20,
        description: 'Property Finder ingestion into the listings table.',
    },
    {
        name: 'sync-master-sheet',
        window: 'morning',
        dedupeHours: 20,
        description: 'Master spreadsheet sync (source-of-truth rows).',
    },
    {
        name: 'ingest-from-sheets',
        window: 'morning',
        dedupeHours: 20,
        description: 'Google Sheets ingestion pipeline.',
    },
    {
        name: 'sync-leads',
        window: 'morning',
        dedupeHours: 8,
        description: 'Lead sources sync (CRM alignment). The morning fallback plus the 10:10 UTC GHA run both dedupe against this window.',
    },
    {
        name: 'whatsapp-dispatch',
        window: null,
        dedupeHours: 0.5,
        description: 'Drains queued WhatsApp bot replies inside the Africa/Cairo outreach window (hourly via GitHub Actions).',
    },
    {
        name: 'apply-migrations',
        window: null,
        dedupeHours: 0,
        description: 'Applies pending migration-ledger files. Deliberately unscheduled — manual dispatch only.',
    },
];

export function getAutomationJob(name: string): AutomationJob | undefined {
    return AUTOMATION_JOBS.find((job) => job.name === name);
}

export function listAutomationWindowJobs(window: AutomationWindowName): AutomationJob[] {
    return AUTOMATION_JOBS.filter((job) => job.window === window);
}

export function listAutomationJobNames(): string[] {
    return AUTOMATION_JOBS.map((job) => job.name);
}

export function listAutomationWindowNames(): AutomationWindowName[] {
    return Array.from(new Set(AUTOMATION_JOBS.map((job) => job.window).filter((w): w is AutomationWindowName => w !== null)));
}

export type DispatchTarget =
    | { kind: 'window'; window: AutomationWindowName; jobs: AutomationJob[] }
    | { kind: 'job'; job: AutomationJob };

/**
 * Resolve a dispatcher path segment into either a window group or a single
 * job. Returns null for unknown targets so the route can answer with an
 * honest 404 that lists everything that exists.
 */
export function resolveDispatchTarget(target: string): DispatchTarget | null {
    if (target === 'night' || target === 'morning') {
        return { kind: 'window', window: target, jobs: listAutomationWindowJobs(target) };
    }
    const job = getAutomationJob(target);
    return job ? { kind: 'job', job } : null;
}
