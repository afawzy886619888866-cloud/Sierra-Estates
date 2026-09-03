 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getRecord } from '@sierra-estates/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Roles allowed into the admin console. */
const ADMIN_CONSOLE_ROLES = ['admin', 'manager', 'superadmin'];







/**
 * Verify a Supabase access token and read the caller's stored role.
 *
 * Returns null when the token does not verify. The role comes from
 * public.profiles and is the only source of truth — nothing in the token
 * itself may grant console access.
 */
async function verifyCaller(token) {
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !_optionalChain([data, 'optionalAccess', _ => _.user])) return null;

  const profile = await getRecord('profiles', data.user.id);
  return {
    uid: data.user.id,
    email: _nullishCoalesce(data.user.email, () => ( undefined)),
    role: _nullishCoalesce(_optionalChain([profile, 'optionalAccess', _2 => _2.role]), () => ( null)),
  };
}

/**
 * POST /api/admin/auth
 * Verify a Supabase access token and check the caller holds a console role.
 */
export async function POST(req) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const caller = await verifyCaller(token);
    if (!caller) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!caller.role || !ADMIN_CONSOLE_ROLES.includes(caller.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    return NextResponse.json({
      valid: true,
      uid: caller.uid,
      role: caller.role,
      email: caller.email,
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

/**
 * GET /api/admin/auth
 * Simple role check for the frontend.
 */
export async function GET(req) {
  try {
    const token = _optionalChain([req, 'access', _3 => _3.headers, 'access', _4 => _4.get, 'call', _5 => _5('authorization'), 'optionalAccess', _6 => _6.split, 'call', _7 => _7('Bearer '), 'access', _8 => _8[1]]);

    if (!token) {
      return NextResponse.json({ authorized: false }, { status: 401 });
    }

    const caller = await verifyCaller(token);
    if (!caller) {
      return NextResponse.json({ authorized: false }, { status: 401 });
    }

    return NextResponse.json({
      authorized: Boolean(caller.role && ADMIN_CONSOLE_ROLES.includes(caller.role)),
      uid: caller.uid,
      role: caller.role,
    });
  } catch (e) {
    return NextResponse.json({ authorized: false }, { status: 401 });
  }
}
