/**
 * GET /api/agents/intelligence
 *
 * What the agents have actually learned, read from durable history rather than
 * the in-process cache — on serverless the cache is empty on almost every
 * request, so anything computed from it would be noise.
 *
 * Admin-only: this exposes operational detail about the agent fleet.
 */
import { NextResponse } from 'next/server';
import {
  memoryEngine,
  scoreSkills,
  summarisePatterns,
} from '@sierra-estates/memory-engine';
import { verifySession, SESSION_COOKIE, parseCookies } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookies = parseCookies(request.headers.get('cookie'));
  const session = await verifySession(cookies[SESSION_COOKIE]);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agent') ?? undefined;
    const sinceParam = url.searchParams.get('sinceHours');
    const since = sinceParam
      ? new Date(Date.now() - Number(sinceParam) * 3_600_000).toISOString()
      : undefined;

    const [patterns, executions, storeHealthy] = await Promise.all([
      memoryEngine.getPatternsFromStore({ agentId, since, limit: 1000 }),
      memoryEngine.getExecutions({ agentId, since, limit: 50 }),
      memoryEngine.storeHealthy(),
    ]);

    const skills = scoreSkills(
      await memoryEngine.getExecutions({ agentId, since, limit: 1000 })
    );
    const summary = summarisePatterns(patterns);

    return NextResponse.json({
      success: true,
      data: {
        store: {
          name: memoryEngine.storeName,
          healthy: storeHealthy,
          error: memoryEngine.storeError,
          // Without a durable store every statistic below is computed from a
          // cache that dies with the process — say so plainly.
          durable: storeHealthy && memoryEngine.storeName !== 'memory',
        },
        summary,
        patterns: patterns.sort((a, b) => b.occurrences - a.occurrences),
        skills,
        recent: executions.slice(0, 50),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('[AGENT_INTELLIGENCE]', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to read agent intelligence' },
      { status: 500 }
    );
  }
}
