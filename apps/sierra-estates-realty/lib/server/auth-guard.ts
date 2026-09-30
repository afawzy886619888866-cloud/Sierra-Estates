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
import { verifySession, SESSION_COOKIE, parseCookies, isAdminEmail } from '@/lib/auth';
<<<<<<< HEAD
=======
import { isPartnerRole } from '@/lib/partner-access';
import { normalizeScope, scopeFromProfile, type PartnerScope } from '@/lib/server/partner-scope';
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1

const SECRET_KEY = process.env.SBR_SECRET_KEY || '';

/**
 * Canonical roles permitted to access administrative APIs and console operations.
 * Single source of truth for both verifyAdminRequest and /api/admin/auth.
 */
export const ADMIN_CONSOLE_ROLES = ['admin', 'manager', 'superadmin'] as const;
export type AdminConsoleRole = (typeof ADMIN_CONSOLE_ROLES)[number];

export function isAdminConsoleRole(role: unknown): boolean {
  return (
    typeof role === 'string' &&
    ADMIN_CONSOLE_ROLES.includes(role.trim().toLowerCase() as AdminConsoleRole)
  );
}

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
  role?: string;
  /**
<<<<<<< HEAD
=======
   * Partner portfolio scope — present ONLY on session-cookie sessions minted for
   * role 'partner'. See lib/server/partner-scope.ts.
   */
  scope?: PartnerScope;
  /**
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
   * How the caller proved who they are.
   *
   * 'supabase'       — a real user identity, carrying a uid and a profiles row.
   * 'session-cookie' — authenticated browser session cookie (sierra_sess).
   * 'secret-key'     — the shared service credential. Authenticates the *caller*
   *                    but carries NO identity and NO role, so it can never
   *                    satisfy an admin check.
   */
  method: 'supabase' | 'session-cookie' | 'secret-key' | 'none';
}

/**
 * Verifies an incoming API request.
 * Supports three auth methods:
 *   1. Supabase access token via `Authorization: Bearer <token>`
 *   2. Server session cookie via `sierra_sess` (for Admin Portal browser requests)
 *   3. Internal secret key via `X-SBR-SECRET-KEY` header (for cron/webhooks)
 */
export async function verifyRequest(req: NextRequest): Promise<AuthResult> {
  // Method 0: Dev environment bypass when authentication is explicitly disabled
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_AUTHENTICATION === 'false') {
    return {
      authenticated: true,
      uid: 'dev-admin',
      email: 'admin@sierra-estates.net',
      role: 'superadmin',
      method: 'session-cookie',
    };
  }

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
      // session cookie / secret-key check. Never treat a verification failure as success.
    }
  }

  // Method 2: Server session cookie (sierra_sess) from Admin Portal login
  try {
    const cookieHeader = req.headers.get('cookie');
    let sessionToken: string | undefined;

    try {
      sessionToken =
        req.cookies?.get?.(SESSION_COOKIE)?.value ||
        parseCookies(cookieHeader)[SESSION_COOKIE];
    } catch {
      // Cookie reading or malformed percent-encoding failed — fall back safely
      sessionToken = parseCookies(cookieHeader)[SESSION_COOKIE];
    }

    if (sessionToken) {
      const sess = await verifySession(sessionToken);
      if (sess) {
        return {
          authenticated: true,
          uid: sess.uid,
          email: sess.email,
          role: sess.role,
<<<<<<< HEAD
=======
          scope: sess.role === 'partner' ? normalizeScope(sess.scope) : undefined,
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
          method: 'session-cookie',
        };
      }
    }
  } catch {
    // Session token invalid or verification failed — fall through
  }

  // Method 3: Internal Secret Key (for server-to-server, cron, webhooks).
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
 * Supports:
 *   1. Verified session cookies carrying an admin console role (admin, manager, superadmin)
 *   2. Supabase identities with an admin console role on profiles
 */
export async function verifyAdminRequest(req: NextRequest): Promise<AuthResult> {
  const result = await verifyRequest(req);
  if (!result.authenticated) return result;

  // Session cookie callers already carry a verified role minted by /api/auth
  if (result.method === 'session-cookie') {
<<<<<<< HEAD
    if (isAdminConsoleRole(result.role)) {
      return result;
    }
    if (result.email && isAdminEmail(result.email)) {
      return result;
    }
=======
    // A partner session is a partner — even when the email lands on an owned
    // domain (isAdminEmail). The explicit role always wins over the email
    // fallback, or a partner1@sierra-estates.net account would escalate to admin.
    if (isPartnerRole(result.role)) {
      return { authenticated: false, method: 'none' };
    }
    if (isAdminConsoleRole(result.role)) {
      return result;
    }
    if (result.email && isAdminEmail(result.email)) {
      return result;
    }
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    return { authenticated: false, method: 'none' };
  }

  // A caller authenticated by the shared secret has no identity (no uid), so
  // there is no profiles row to carry a role.
  if (!result.uid) return { authenticated: false, method: 'none' };

  let profileRole: string | undefined;
  try {
    const profile = await getRecord<{ role?: string }>('profiles', result.uid);
    profileRole = profile?.role;
    if (!isAdminConsoleRole(profileRole)) {
      return { authenticated: false, method: 'none' };
    }
  } catch {
    // A lookup failure must deny, never admit.
    return { authenticated: false, method: 'none' };
  }

  return {
    authenticated: true,
    uid: result.uid,
    email: result.email,
    method: result.method,
  };
<<<<<<< HEAD
=======
}

/* ─────────────────────────────────────────────────────────────────────────
 * PARTNER ACCESS — portal-level guard.
 *
 * Admins (admin/manager/superadmin) get the FULL portal. Partners (the
 * merged-in property accounts) get access:'partner' + their portfolio scope;
 * the scoped routes (inventory-os / listings / leads reads, own-lead PATCH,
 * own-unit photo upload) must filter every row through that scope. Anything
 * not explicitly allowed to a partner stays behind verifyAdminRequest.
 * ───────────────────────────────────────────────────────────────────────── */

export type PortalAccess =
  | { authenticated: false; method: 'none' }
  | {
      authenticated: true;
      access: 'admin';
      uid?: string;
      email?: string;
      role: string;
      method: 'supabase' | 'session-cookie' | 'secret-key';
      scope: null;
    }
  | {
      authenticated: true;
      access: 'partner';
      uid: string;
      email: string;
      role: 'partner';
      method: 'supabase' | 'session-cookie';
      scope: PartnerScope;
    };

/**
 * Verifies the caller for admin-portal routes that serve BOTH staff and
 * partner accounts. Partners never get access:'admin' — an empty/mis-configured
 * scope still authenticates (they can sign in) but every scoped read filters
 * to zero rows (fail closed on data, not on login).
 */
export async function verifyPortalRequest(req: NextRequest): Promise<PortalAccess> {
  const result = await verifyRequest(req);
  if (!result.authenticated) return { authenticated: false, method: 'none' };

  // Session cookie: role + scope were minted at sign-in by /api/auth.
  if (result.method === 'session-cookie') {
    // Partner role first: an owned-domain email (isAdminEmail) must never
    // upgrade a partner session to full admin access.
    if (isPartnerRole(result.role)) {
      return {
        authenticated: true,
        access: 'partner',
        uid: result.uid ?? `partner-${result.email ?? 'unknown'}`,
        email: result.email ?? '',
        role: 'partner',
        method: 'session-cookie',
        scope: normalizeScope(result.scope),
      };
    }
    if (isAdminConsoleRole(result.role) || (result.email && isAdminEmail(result.email))) {
      return {
        authenticated: true,
        access: 'admin',
        uid: result.uid,
        email: result.email,
        role: result.role ?? 'admin',
        method: 'session-cookie',
        scope: null,
      };
    }
    return { authenticated: false, method: 'none' };
  }

  // Secret-key callers carry no identity — they can neither be scoped as a
  // partner nor satisfy the admin role check.
  if (!result.uid) return { authenticated: false, method: 'none' };

  // Supabase identity: the profiles row is the source of truth for role+scope.
  try {
    const profile = await getRecord<{ role?: string; metadata?: Record<string, unknown> }>(
      'profiles',
      result.uid
    );
    const profileRole = profile?.role;
    if (isAdminConsoleRole(profileRole)) {
      return {
        authenticated: true,
        access: 'admin',
        uid: result.uid,
        email: result.email,
        role: profileRole as string,
        method: 'supabase',
        scope: null,
      };
    }
    if (isPartnerRole(profileRole)) {
      return {
        authenticated: true,
        access: 'partner',
        uid: result.uid,
        email: result.email ?? '',
        role: 'partner',
        method: 'supabase',
        scope: scopeFromProfile(profile),
      };
    }
  } catch {
    // A lookup failure must deny, never admit.
  }
  return { authenticated: false, method: 'none' };
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
}
