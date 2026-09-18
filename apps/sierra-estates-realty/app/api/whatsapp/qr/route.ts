import { NextResponse } from 'next/server';

/**
 * Gateway configuration is read per-request (not captured at module load) so
 * operator rotation and test configuration take effect without a re-import.
 * The route still fails closed: without OPENWA_HOST and OPENWA_ADMIN_API_KEY
 * it answers 503 not_configured and never guesses at a host.
 */
function gatewayConfig(): { host: string; port: string; apiKey: string } {
  return {
    host: process.env.OPENWA_HOST || '',
    port: process.env.OPENWA_PORT || '3000',
    apiKey: process.env.OPENWA_ADMIN_API_KEY || '',
  };
}

let currentSessionId = process.env.OPENWA_SESSION_ID || 'session-default';

function gatewayConfigured(): boolean {
  const { host, apiKey } = gatewayConfig();
  return Boolean(host && apiKey);
}

async function resolveActiveSession(): Promise<string> {
  const { host, port, apiKey } = gatewayConfig();
  try {
    const res = await fetch(`http://${host}:${port}/api/sessions`, {
      headers: { 'X-API-Key': apiKey },
      cache: 'no-store',
    });
    if (res.ok) {
      const sessions = await res.json();
      if (Array.isArray(sessions) && sessions.length > 0) {
        currentSessionId = sessions[0].id;
      }
    }
  } catch {}
  return currentSessionId;
}

export async function GET() {
  if (!gatewayConfigured()) {
    return NextResponse.json(
      { status: 'not_configured', qrCode: null, message: 'WhatsApp gateway is not configured. Set OPENWA_HOST and OPENWA_ADMIN_API_KEY environment variables.' },
      { status: 503 },
    );
  }
  try {
    const { host, port, apiKey } = gatewayConfig();
    const sessionId = await resolveActiveSession();
    const res = await fetch(`http://${host}:${port}/api/sessions/${sessionId}/qr`, {
      headers: {
        'X-API-Key': apiKey,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      // If 404 or expired, check session details
      const sessionRes = await fetch(`http://${host}:${port}/api/sessions/${sessionId}`, {
        headers: { 'X-API-Key': apiKey },
        cache: 'no-store',
      });
      const sessionData = sessionRes.ok ? await sessionRes.json() : {};
      return NextResponse.json({
        status: sessionData.status || 'unknown',
        message: sessionData.status === 'authenticated' || sessionData.status === 'connected'
          ? 'WhatsApp Connected!'
          : 'Session active, waiting for QR...',
        qrCode: null,
        sessionId,
      });
    }

    const data = await res.json();
    return NextResponse.json({
      status: data.status || 'qr_ready',
      qrCode: data.qrCode,
      sessionId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch QR from OpenWA' },
      { status: 502 }
    );
  }
}

