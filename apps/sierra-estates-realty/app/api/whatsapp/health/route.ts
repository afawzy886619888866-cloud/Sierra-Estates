import { NextResponse } from 'next/server';
import { WhatsAppStatusService } from '@/lib/services/WhatsAppStatusService';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';

/**
 * GET /api/whatsapp/health
 * Health check endpoint for WhatsApp bridge & bot status
 */
export async function GET(req: Request) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  const status = await WhatsAppStatusService.getStatus();
  return NextResponse.json({
    status: status.status || 'healthy',
    lastHeartbeat: status.lastHeartbeat,
    ok: true,
    service: 'sierra-whatsapp-bridge',
    timestamp: new Date().toISOString(),
  });
}
