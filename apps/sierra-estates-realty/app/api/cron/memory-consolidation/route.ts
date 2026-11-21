import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/server/cron-auth';
import { soulConsolidate } from '@/lib/memory/broker-soul';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * MEMORY CONSOLIDATION — the Soul's growth pass (cron automation target).
 * Distills the period's broker_memory_entries into a digest + durable
 * insights and remembers the insights back onto the spine. When any
 * free-LLM provider is enabled, the summary is routed through the LLM router
 * (lib/llm/agent-router.ts); otherwise an honest stats-only digest is stored
 * (never fabricated). Dispatched via the every-3-hours automations window
 * with a 12h dedupe, or manually from Admin → Super Broker Memory.
 */
export async function GET(req: NextRequest) {
    const denied = verifyCronRequest(req);
    if (denied) return denied;

    try {
        const result = await soulConsolidate('day');
        return NextResponse.json({
            success: result.ok,
            timestamp: new Date().toISOString(),
            message: result.ok
                ? `Soul consolidation complete: ${result.entryCount} entries → ${result.llmSummarized ? `LLM digest via ${result.provider}/${result.model}` : 'stats-only digest (no LLM provider enabled)'}.`
                : `Soul consolidation failed: ${result.error}`,
            ...result,
        });
    } catch (err) {
        logger.error('[cron/memory-consolidation] Error:', (err as Error).message);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    return GET(req);
}
