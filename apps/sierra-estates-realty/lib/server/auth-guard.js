 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * SIERRA ESTATES — SERVER-SIDE AUTH GUARD
 *
 * Validates Supabase Auth tokens on API routes and resolves the caller's role
 * from public.profiles.
 *
 * Use: call `verifyRequest(req)` for "is this caller authenticated at all", or
 * `verifyAdminRequest(req)` for "is this caller an admin".
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getRecord } from '@sierra-estates/db';

const SECRET_KEY = process.env.SBR_SECRET_KEY || '';

/** Constant-time string comparison to prevent timing attacks. */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
















/**
 * Verifies an incoming API request.
 * Supports two auth methods:
 *   1. Supabase access token via `Authorization: Bearer <token>`
 *   2. Internal secret key via `X-SBR-SECRET-KEY` header (for cron/webhooks)
 */
export async function verifyRequest(req) {
  // Method 1: Supabase access token.
  const authHeader = req.headers.get('authorization');
  if (_optionalChain([authHeader, 'optionalAccess', _ => _.startsWith, 'call', _2 => _2('Bearer ')])) {
    const token = authHeader.slice(7);
    try {
      const { data, error } = await getSupabaseAdmin().auth.getUser(token);
      if (!error && _optionalChain([data, 'optionalAccess', _3 => _3.user])) {
        return {
          authenticated: true,
          uid: data.user.id,
          email: _nullishCoalesce(data.user.email, () => ( undefined)),
          method: 'supabase',
        };
      }
    } catch (e) {
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
export async function verifyAdminRequest(req) {
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
    const profile = await getRecord('profiles', result.uid);
    const role = _optionalChain([profile, 'optionalAccess', _4 => _4.role]);
    if (role !== 'admin' && role !== 'superadmin') {
      return { authenticated: false, method: 'none' };
    }
  } catch (e2) {
    // A lookup failure must deny, never admit.
    return { authenticated: false, method: 'none' };
  }

  return result;
}
