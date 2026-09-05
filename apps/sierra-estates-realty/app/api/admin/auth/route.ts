import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getRecord } from '@sierra-estates/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Roles allowed into the admin console. */
const ADMIN_CONSOLE_ROLES = ['admin', 'manager', 'superadmin'];

interface VerifiedCaller {
  uid: string;
  email?: string;
  role: string | null;
}

/**
 * Verify a Supabase access token and read the caller's stored role.
 *
 * Returns null when the token does not verify. The role comes from
 * public.profiles and is the only source of truth — nothing in the token
 * itself may grant console access.
 */
async function verifyCaller(token: string): Promise<VerifiedCaller | null> {
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data?.user) return null;

  const profile = await getRecord<{ role?: string }>('profiles', data.user.id);
  return {
    uid: data.user.id,
    email: data.user.email ?? undefined,
    role: profile?.role ?? null,
  };
}

/**
 * POST /api/admin/auth
 * Verify a Supabase access token and check the caller holds a console role.
 */
export async function POST(req: NextRequest) {
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
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];

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
  } catch {
    return NextResponse.json({ authorized: false }, { status: 401 });
  }
}
