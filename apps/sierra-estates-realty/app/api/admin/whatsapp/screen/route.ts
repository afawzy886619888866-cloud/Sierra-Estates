import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest, verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';

export const dynamic = 'force-dynamic';

async function checkAuth(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const isDirectLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  if (isDirectLocal) return null;

  const auth = await verifyRequest(req);
  if (auth.authenticated && auth.method === 'secret-key') return null;
  const adminAuth = await verifyAdminRequest(req);
  if (adminAuth.authenticated) return null;
  return unauthorizedResponse();
}

/**
 * GET /api/admin/whatsapp/screen?line=line-2
 * Streams live Puppeteer screenshot of the WhatsApp Web interface
 */
export async function GET(req: NextRequest) {
  const authErr = await checkAuth(req);
  if (authErr) return authErr;

  const line = req.nextUrl.searchParams.get('line') || 'line-2';
  const gatewayUrl = process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785';

  try {
    const targetUrl = `${gatewayUrl}/api/pair/screenshot/${encodeURIComponent(line)}.png`;
    const res = await fetch(targetUrl, {
      cache: 'no-store',
      headers: {
        'x-admin-key': process.env.OPENWA_ADMIN_API_KEY || '1363cf79809a371e01cab4e2d7dc042ef863d6f50be32cf6',
      },
    });

    if (!res.ok) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
        <rect width="640" height="400" fill="#0b1120"/>
        <rect x="20" y="20" width="600" height="360" rx="12" fill="#131a2e" stroke="rgba(148,163,184,0.2)"/>
        <text x="320" y="190" fill="#f0c040" font-family="Arial,sans-serif" font-weight="bold" font-size="16" text-anchor="middle">Line ${line}</text>
        <text x="320" y="220" fill="#8b96ad" font-family="Arial,sans-serif" font-size="13" text-anchor="middle">Gateway responded ${res.status}: ${res.statusText}</text>
      </svg>`;
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" fill="#0b1120"/>
      <rect x="20" y="20" width="600" height="360" rx="12" fill="#131a2e" stroke="rgba(148,163,184,0.2)"/>
      <text x="320" y="190" fill="#f85149" font-family="Arial,sans-serif" font-weight="bold" font-size="16" text-anchor="middle">Gateway Disconnected</text>
      <text x="320" y="220" fill="#8b96ad" font-family="Arial,sans-serif" font-size="13" text-anchor="middle">Worker offline on port 2785 (${err?.message})</text>
    </svg>`;
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
}
