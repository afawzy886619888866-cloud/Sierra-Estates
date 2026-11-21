import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/server/cron-auth';
import { refreshCatalog } from '@/lib/llm/agent-router';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * LLM CATALOG REFRESH — cron automation target (freellmapi integration).
 * Probes GET /models on every enabled free-LLM provider, stores discovered
 * model IDs + health in agent_llm_providers. Scheduled via the every-3-hours
 * (25-past) automations window (see .github/workflows/automations.yml) — the
 * same self-updating idea as the freellmapi signed catalog feed, minus the
 * signature infrastructure: a configured freellmapi-upstream row imports the
 * FULL live catalog of a self-hosted gateway via /models?available=true.
 */
export async function GET(req: NextRequest) {
    const denied = verifyCronRequest(req);
    if (denied) return denied;

    try {
        const summary = await refreshCatalog();
        // Super Broker Memory: the router remembers its fleet health so other
        // agents recall which free providers are alive before routing.
        try {
            const { soulRemember } = await import('@/lib/memory/broker-soul');
            await soulRemember({
                agent: 'llm-router',
                kind: 'event',
                scope: 'global',
                subject: 'llm-fleet-health',
                content: `Catalog refresh: ${summary.ok}/${summary.checked} free providers healthy, ${summary.totalModels} models discovered${summary.failed ? `, ${summary.failed} failed` : ''}.`,
                importance: 2,
                confidence: 0.95,
                source: 'cron/llm-catalog-refresh',
            });
        } catch (soulErr) {
            logger.warn('[cron/llm-catalog-refresh] Soul remember skipped:', (soulErr as Error).message);
        }
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            message: `LLM catalog refresh complete: ${summary.ok}/${summary.checked} providers healthy, ${summary.totalModels} models discovered.`,
            ...summary,
        });
    } catch (err) {
        logger.error('[cron/llm-catalog-refresh] Error:', (err as Error).message);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    return GET(req);
}
