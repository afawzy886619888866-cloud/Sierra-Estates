import { NextResponse } from 'next/server';
import { WhatsAppStatusService } from '@/lib/services/WhatsAppStatusService';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';

/**
 * POST /api/whatsapp/heartbeat
 * Called by the scraper bot every ~60s to signal it is alive.
 */
export async function POST(req: Request) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  await WhatsAppStatusService.recordHeartbeat('active');
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}

export async function GET(req: Request) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  return NextResponse.json({ status: 'heartbeat endpoint active' });
}
