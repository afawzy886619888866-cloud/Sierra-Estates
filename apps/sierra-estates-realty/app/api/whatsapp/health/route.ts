import { NextResponse } from 'next/server';
import { WhatsAppStatusService } from '@/lib/services/WhatsAppStatusService';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';

/**
 * GET /api/whatsapp/health
 * Health check endpoint for WhatsApp bridge & bot status
 *
 * HONESTY FIX (2026-10-20): `ok` used to be hardcoded `true`, so a dead bridge
 * (pulse days old, inbound dark since Oct 11) still answered ok:true behind a
 * frozen "syncing" status for five days. `ok` is now derived from pulse
 * freshness: the node pulses every 60 s, so a pulse older than 5 minutes
 * (5 missed pulses) means nothing alive is reporting. A fresh pulse written
 * with status 'error' also reports ok:false. Uptime monitors polling this
 * endpoint now catch the outage on the first poll instead of never.
 */
const PULSE_INTERVAL_MS = 60_000;
const STALE_AFTER_MS = 5 * PULSE_INTERVAL_MS;

export async function GET(req: Request) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  const status = await WhatsAppStatusService.getStatus();
  const lastPulseMs = status.lastPulse ? Date.parse(status.lastPulse) : NaN;
  const pulseAgeMs = Number.isFinite(lastPulseMs) ? Date.now() - lastPulseMs : Infinity;
  const fresh = pulseAgeMs < STALE_AFTER_MS;
  const errored = status.status === 'error';
  return NextResponse.json({
    status: !fresh ? 'stale' : (status.status || 'healthy'),
    lastPulse: status.lastPulse,
    pulseAgeSec: Number.isFinite(pulseAgeMs) ? Math.round(pulseAgeMs / 1000) : null,
    ok: fresh && !errored,
    service: 'sierra-whatsapp-bridge',
    timestamp: new Date().toISOString(),
  });
}
