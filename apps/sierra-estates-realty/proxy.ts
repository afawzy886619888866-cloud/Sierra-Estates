import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { corsHeaders } from '@/lib/server/cors';
import { verifySession, SESSION_COOKIE, safeEqual } from '@/lib/auth';

/**
 * Edge proxy (proxy.ts).
 * Next.js 16 file convention update.
 * Concerns:
 * 0. Host split & RBAC Session Protection for /admin routes.
 * 1. CORS for /api routes.
 * 2. Shared-secret gate for internal automation routes (/api/orchestrate).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminHost = process.env.ADMIN_HOST;
  const requestHost = request.headers.get('host') ?? request.nextUrl.hostname;
  
  // Identify admin host: exact match for ADMIN_HOST, or Vercel generated URLs that start with admin/sierra-admin
  const onAdminHost = 
    (Boolean(adminHost) && requestHost === adminHost) || 
    requestHost.startsWith('admin') || 
    requestHost.startsWith('sierra-admin');

  const isLocal = requestHost.includes('localhost') || requestHost.includes('127.0.0.1');

  let targetPath = pathname;
  let isRewritten = false;

  // 0a) On the admin host, the console IS the site: root target is /admin
  if (onAdminHost && pathname === '/') {
    targetPath = '/admin';
    isRewritten = true;
  }

  // 0b) Admin route protection & host split
  if (targetPath.startsWith('/admin')) {
    // Allow /admin/login without session verification
    if (targetPath === '/admin/login') {
      return isRewritten
        ? NextResponse.rewrite(new URL('/admin/login', request.url))
        : NextResponse.next();
    }

    // Guard all other /admin routes with RBAC session token
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySession(token);

    if (!session) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', targetPath);
      return NextResponse.redirect(loginUrl);
    }

    return isRewritten
      ? NextResponse.rewrite(new URL(targetPath, request.url))
      : NextResponse.next();
  }

  // 1) CORS Preflight Handling for API routes
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const headers = corsHeaders(origin);

    // Handle OPTIONS Preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers,
      });
    }

    // 2) Internal Security Gate
    // Internal endpoints may be called by an authenticated admin session or by
    // trusted services carrying the shared secret. In production, an unset
    // secret must fail closed instead of exposing simulated operational data.
    if (pathname.startsWith('/api/internal/')) {
      const secretHeader = request.headers.get('x-sbr-secret-key');
      const expectedSecret = process.env.SBR_SECRET_KEY;
      const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
      let hasAdminSession = false;

      try {
        hasAdminSession = Boolean(await verifySession(sessionToken));
      } catch {
        hasAdminSession = false;
      }

      if (!hasAdminSession) {
        if (!expectedSecret && process.env.NODE_ENV === 'production') {
          return new NextResponse(
            JSON.stringify({ error: 'Internal services are not configured' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json', ...headers },
            },
          );
        }

        if (expectedSecret && secretHeader !== expectedSecret) {
          return new NextResponse(
            JSON.stringify({ error: 'Unauthorized internal request' }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json', ...headers },
            },
          );
        }
      }
    }

    // 3) Shared-secret gate for the orchestration endpoint.
    if (pathname.startsWith('/api/orchestrate')) {
      const secretHeader = request.headers.get('x-sbr-secret-key');
      const expectedSecret = process.env.SBR_SECRET_KEY;

      // In production the secret is mandatory: a missing/misconfigured
      // SBR_SECRET_KEY must never leave orchestration open. Outside
      // production an unset secret keeps the route usable for local dev.
      if (!expectedSecret && process.env.NODE_ENV === 'production') {
        return new NextResponse(
          JSON.stringify({ error: 'Orchestration is not configured' }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
          }
        );
      }

      // Fail-closed if secret is configured but header is missing or mismatched
      if (expectedSecret && !safeEqual(secretHeader || '', expectedSecret)) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized system orchestration request' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
          }
        );
      }
    }

    // Standard API response — attach CORS headers
    const response = NextResponse.next();
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  return NextResponse.next();
}


export const config = {
  matcher: ['/', '/api/:path*', '/admin/:path*'],
};

export { proxy as middleware };
