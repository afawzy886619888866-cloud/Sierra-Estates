/**
 * SIERRA ESTATES — SERVER-SIDE AUTH GUARD
 *
 * Validates Supabase Auth tokens on API routes and resolves the caller's role
 * from public.profiles.
 *
 * Use: call `verifyRequest(req)` for "is this caller authenticated at all", or
 * `verifyAdminRequest(req)` for "is this caller an admin".
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getRecord } from '@sierra-estates/db';

const SECRET_KEY = process.env.SBR_SECRET_KEY || '';

/** Constant-time string comparison to prevent timing attacks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface AuthResult {
  authenticated: boolean;
  uid?: string;
  email?: string;
  /**
   * How the caller proved who they are.
   *
   * 'supabase'   — a real user identity, carrying a uid and a profiles row.
   * 'secret-key' — the shared service credential. Authenticates the *caller*
   *                but carries NO identity and NO role, so it can never
   *                satisfy an admin check.
   */
  method: 'supabase' | 'secret-key' | 'none';
}

/**
 * Verifies an incoming API request.
 * Supports two auth methods:
 *   1. Supabase access token via `Authorization: Bearer <token>`
 *   2. Internal secret key via `X-SBR-SECRET-KEY` header (for cron/webhooks)
 */
export async function verifyRequest(req: NextRequest): Promise<AuthResult> {
  // Method 1: Supabase access token.
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const { data, error } = await getSupabaseAdmin().auth.getUser(token);
      if (!error && data?.user) {
        return {
          authenticated: true,
          uid: data.user.id,
          email: data.user.email ?? undefined,
          method: 'supabase',
        };
      }
    } catch {
      // Token invalid, expired, or Supabase unreachable — fall through to the
      // secret-key check. Never treat a verification failure as success.
    }
  }

  // Method 2: Internal Secret Key (for server-to-server, cron, webhooks).
  const secretHeader = req.headers.get('x-sbr-secret-key');
  if (SECRET_KEY && secretHeader && safeEqual(secretHeader, SECRET_KEY)) {
    return {
      authenticated: true,
      method: 'secret-key',
    };
  }

  return { authenticated: false, method: 'none' };
}

/**
 * Returns a 401 JSON response for unauthorized requests.
 */
export function unauthorizedResponse(message = 'Authentication required') {
  return NextResponse.json(
    { error: message, code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}

/**
 * Verifies that the request comes from an authenticated admin user.
 * Requires a Supabase identity AND `role in (admin, superadmin)` on the
 * caller's public.profiles row.
 */
export async function verifyAdminRequest(req: NextRequest): Promise<AuthResult> {
  const result = await verifyRequest(req);
  if (!result.authenticated) return result;

  // A caller authenticated by the shared secret has no identity (no uid), so
  // there is no profiles row to carry a role. Previously this early-returned
  // the *authenticated* result, which meant any holder of SBR_SECRET_KEY
  // cleared every admin-only gate without a role check — and that secret is
  // also the service/cron/webhook credential, so it is shared far more widely
  // than admin access. Admin requires a real identity.
  if (!result.uid) return { authenticated: false, method: 'none' };

  try {
    const profile = await getRecord<{ role?: string }>('profiles', result.uid);
    const role = profile?.role;
    if (role !== 'admin' && role !== 'superadmin') {
      return { authenticated: false, method: 'none' };
    }
  } catch {
    // A lookup failure must deny, never admit.
    return { authenticated: false, method: 'none' };
  }

  return result;
}
