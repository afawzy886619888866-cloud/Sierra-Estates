/**
 * SIERRA ESTATES — SERVER-SIDE SERVICE/STAFF ROUTE GUARD
 *
 * Single gate for operational API routes that must never be reachable
 * anonymously. Accepts, in order:
 *
 *   1. Machine callers: `x-sbr-secret-key: $SBR_SECRET_KEY` (scrapers,
 *      whatsapp bridge, health scripts) or `x-runner-key: $RUNNER_API_KEY`
 *      (workflow runner / jobs). Compared in constant time.
 *   2. Staff callers: a valid Supabase session resolving to an admin-console
 *      role (via lib/server/auth-guard verifyAdminRequest).
 *
 * Fails CLOSED: if none of the expected secrets are configured in the
 * environment, every request is rejected (no hardcoded fallback key exists
 * anywhere in this file, by design).
 *
 * Use:
 *   const denied = await requireStaffOrServiceKey(req);
 *   if (denied) return denied;
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';

/** Constant-time string comparison to prevent timing attacks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function serviceKeyMatch(req: NextRequest): boolean {
  const sbr = process.env.SBR_SECRET_KEY || '';
  const runner = process.env.RUNNER_API_KEY || '';
  const providedSbr = req.headers.get('x-sbr-secret-key') || '';
  const providedRunner = req.headers.get('x-runner-key') || '';

  if (sbr && providedSbr && safeEqual(providedSbr, sbr)) return true;
  if (runner && providedRunner && safeEqual(providedRunner, runner)) return true;
  return false;
}

export type RouteGuardResult = {
  authenticated: boolean;
  method: 'service-key' | 'staff-session';
};

/**
 * Returns `null` when the caller is authorized (service key or staff
 * session); otherwise a 401 NextResponse ready to return from the route.
 */
export async function requireStaffOrServiceKey(
  req: Request,
): Promise<NextResponse | null> {
  const nreq = req as NextRequest;
  if (serviceKeyMatch(nreq)) return null;

  // verifyAdminRequest expects a NextRequest; when invoked from tests/plain
  // Request objects it can throw — treat that as unauthenticated (401), never 500.
  let session: { authenticated: boolean } | null = null;
  try {
    session = await verifyAdminRequest(nreq);
  } catch {
    session = null;
  }
  if (session?.authenticated) return null;

  return NextResponse.json(
    { error: 'unauthorized', hint: 'service key (x-sbr-secret-key / x-runner-key) or staff session required' },
    { status: 401 },
  );
}

/**
 * Machine-only variant for endpoints no human should ever hit directly
 * (process spawning, infrastructure mutations).
 */
export async function requireServiceKey(
  req: Request,
): Promise<NextResponse | null> {
  if (serviceKeyMatch(req as NextRequest)) return null;
  return NextResponse.json(
    { error: 'unauthorized', hint: 'service key required' },
    { status: 401 },
  );
}
