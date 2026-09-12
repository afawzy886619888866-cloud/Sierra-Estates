import { NextResponse } from 'next/server';

const OPENWA_HOST = process.env.OPENWA_HOST || '18.232.148.172';
const OPENWA_PORT = process.env.OPENWA_PORT || '3000';
const OPENWA_API_KEY = process.env.OPENWA_ADMIN_API_KEY || 'owa_k1_f269866c139dd31a3afca1809d6a86f90cb349654e41c82e585ceff327c1c77c';
let currentSessionId = process.env.OPENWA_SESSION_ID || '9fbfb682-2fa8-44aa-9af0-35bb23ea80dd';

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
      serverUrl: `http://${OPENWA_HOST}:${OPENWA_PORT}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch QR from OpenWA' },
      { status: 502 }
    );
  }
}

