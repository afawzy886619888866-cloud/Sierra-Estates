 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth-guard';
import { getRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

// Force dynamic rendering — reads the caller's identity at runtime
export const dynamic = 'force-dynamic';

/**
 * Lets the admin SPA confirm whether the signed-in Supabase user has admin
 * access, by reading the role stored on their public.profiles row.
 */
export async function GET(req) {
  const result = await verifyRequest(req);
  if (!result.authenticated || !result.uid) {
    return NextResponse.json({ authenticated: false, role: null }, { status: 401 });
  }

  try {
    const profile = await getRecord('profiles', result.uid);
    const role = _nullishCoalesce(_optionalChain([profile, 'optionalAccess', _ => _.role]), () => ( null));
    const isAdmin = role === 'admin' || role === 'superadmin';

    return NextResponse.json({
      authenticated: true,
      uid: result.uid,
      email: result.email,
      role,
      isAdmin,
    });
  } catch (err) {
    logger.error('Error verifying admin user:', err);
    return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
  }
}
