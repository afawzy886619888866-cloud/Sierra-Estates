import { NextResponse } from 'next/server';

const OPENWA_HOST = process.env.OPENWA_HOST || '18.232.148.172';
const OPENWA_PORT = process.env.OPENWA_PORT || '3000';
const OPENWA_API_KEY = process.env.OPENWA_ADMIN_API_KEY || 'owa_k1_a06231362ac8f1279ef68794cf02010ac08d74b97adc295ce26ebceba29a617e';
const SESSION_ID = 'bfd8dee0-8047-4a9b-9bca-f99909f2ea1e';

export async function GET() {
  try {
    const res = await fetch(`http://${OPENWA_HOST}:${OPENWA_PORT}/api/sessions/${SESSION_ID}/qr`, {
      headers: {
        'X-API-Key': OPENWA_API_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      // If 404 or expired, check session details
      const sessionRes = await fetch(`http://${OPENWA_HOST}:${OPENWA_PORT}/api/sessions/${SESSION_ID}`, {
        headers: { 'X-API-Key': OPENWA_API_KEY },
        cache: 'no-store',
      });
      const sessionData = await sessionRes.json();
      return NextResponse.json({
        status: sessionData.status || 'unknown',
        message: sessionData.status === 'authenticated' || sessionData.status === 'connected'
          ? 'WhatsApp Connected!'
          : 'Session active, waiting for QR...',
        qrCode: null,
      });
    }

    const data = await res.json();
    return NextResponse.json({
      status: data.status || 'qr_ready',
      qrCode: data.qrCode,
      sessionId: SESSION_ID,
      serverUrl: `http://${OPENWA_HOST}:${OPENWA_PORT}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch QR from OpenWA' },
      { status: 502 }
    );
  }
}
