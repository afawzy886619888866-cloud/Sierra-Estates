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
const TARGET_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '') || '201092048333';

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

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  if (!gatewayConfigured()) {
    return NextResponse.json(
      { error: 'WhatsApp gateway is not configured. Set OPENWA_HOST and OPENWA_ADMIN_API_KEY environment variables.', status: 'not_configured' },
      { status: 503 },
    );
  }
  try {
    const url = new URL(req.url);
    const phoneParam = url.searchParams.get('phone');
    let phone = phoneParam ? phoneParam.replace(/\D/g, '') : TARGET_PHONE;

    try {
      const body = await req.json();
      if (body?.phoneNumber) {
        phone = body.phoneNumber.replace(/\D/g, '');
      }
    } catch {}

    const { host, port, apiKey } = gatewayConfig();
    const sessionId = await resolveActiveSession();
    const res = await fetch(`http://${host}:${port}/api/sessions/${sessionId}/pairing-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ phoneNumber: phone }),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || `Failed with status ${res.status}`, status: data.status || 'error' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      phoneNumber: phone,
      pairingCode: data.pairingCode,
      status: data.status || 'qr_ready',
      sessionId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to request pairing code' },
      { status: 500 }
    );
  }
}
