import { NextResponse } from 'next/server';

const OPENWA_HOST = process.env.OPENWA_HOST;
const OPENWA_PORT = process.env.OPENWA_PORT || '3000';
const OPENWA_API_KEY = process.env.OPENWA_ADMIN_API_KEY;
let currentSessionId = process.env.OPENWA_SESSION_ID || 'session-default';

function gatewayConfigured(): boolean {
  return Boolean(OPENWA_HOST && OPENWA_API_KEY);
}

async function resolveActiveSession(): Promise<string> {
  try {
    const res = await fetch(`http://${OPENWA_HOST}:${OPENWA_PORT}/api/sessions`, {
      headers: { 'X-API-Key': OPENWA_API_KEY },
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
    const sessionId = await resolveActiveSession();
    const res = await fetch(`http://${OPENWA_HOST}:${OPENWA_PORT}/api/sessions/${sessionId}/qr`, {
      headers: {
        'X-API-Key': OPENWA_API_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      // If 404 or expired, check session details
      const sessionRes = await fetch(`http://${OPENWA_HOST}:${OPENWA_PORT}/api/sessions/${sessionId}`, {
        headers: { 'X-API-Key': OPENWA_API_KEY },
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

