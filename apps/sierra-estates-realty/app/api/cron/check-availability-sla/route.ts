import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/server/cron-auth';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verify authorization header or cron secret
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  // Automation enhancement 2026-11-20: import the LIGHT AvailabilitySessionStore
  // lazily and INSIDE the handler. The heavy AvailabilityVerificationService
  // (Gemini, WhatsApp, 6.7 MB inventory snapshot) used to sit in this module's
  // static import graph — its cold-start parse blew Cloudflare's FREE-plan
  // 10 ms CPU cap and intermittently killed the worker (error 1101) before the
  // sweep ran. The sweep itself only needs the session store.
  try {
    const { sweepTimeouts } = await import('@/lib/services/AvailabilitySessionStore');
    const result = await sweepTimeouts();
    // Super Broker Memory: the availability engine remembers the SLA sweep
    // (lazy import keeps this cold start light, mirroring the sweep above).
    try {
      const { soulRemember } = await import('@/lib/memory/broker-soul');
      await soulRemember({
        agent: 'availability-engine',
        kind: 'event',
        scope: 'global',
        subject: 'availability-sla',
        content: `SLA sweep marked ${result.expiredUnitsCount} unresponsive unit(s) unavailable across ${result.updatedSessions} session(s).`,
        importance: result.expiredUnitsCount > 0 ? 3 : 2,
        confidence: 0.9,
        source: 'cron/check-availability-sla',
      });
    } catch (soulErr) {
      logger.warn('[cron/check-availability-sla] Soul remember skipped:', (soulErr as Error).message);
    }
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      expiredUnitsCount: result.expiredUnitsCount,
      updatedSessions: result.updatedSessions,
      message: `Availability SLA evaluation complete: ${result.expiredUnitsCount} unresponsive units marked unavailable.`,
    });
  } catch (err) {
    console.error('[cron/check-availability-sla] Error:', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
