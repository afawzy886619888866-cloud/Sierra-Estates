import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { proxy, config } from './proxy';

/**
 * Standard Next.js Middleware entrypoint.
 *
 * Ensures backward and forward compatibility across Vercel deployment
 * environments and Next.js 14/15/16 builders by delegating to proxy.ts
 * with a fail-safe exception boundary.
 */
export async function middleware(request: NextRequest) {
  try {
    return await proxy(request);
  } catch (error) {
    console.error('[Middleware Guard] Unhandled error during request processing:', error);
    return NextResponse.next();
  }
}

export { config };
export default middleware;
