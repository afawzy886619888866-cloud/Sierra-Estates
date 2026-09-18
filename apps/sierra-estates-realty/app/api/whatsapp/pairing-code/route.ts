import { NextResponse } from 'next/server';

const OPENWA_HOST = process.env.OPENWA_HOST;
const OPENWA_PORT = process.env.OPENWA_PORT || '3000';
const OPENWA_API_KEY = process.env.OPENWA_ADMIN_API_KEY;
let currentSessionId = process.env.OPENWA_SESSION_ID || 'session-default';
const TARGET_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '') || '201092048333';

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

    const sessionId = await resolveActiveSession();
    const res = await fetch(`http://${OPENWA_HOST}:${OPENWA_PORT}/api/sessions/${sessionId}/pairing-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': OPENWA_API_KEY,
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
