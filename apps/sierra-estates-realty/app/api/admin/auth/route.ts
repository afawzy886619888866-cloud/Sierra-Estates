import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getRecord } from '@sierra-estates/db';
import { isAdminConsoleRole } from '@/lib/server/auth-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  if (!token || typeof token !== 'string') return null;
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
    const body = await req.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';

    const caller = await verifyCaller(token);
    if (!caller) {
      return NextResponse.json(
        { error: token ? 'Invalid token' : 'Token required' },
        { status: token ? 401 : 400 },
      );
    }

    if (!caller.role || !isAdminConsoleRole(caller.role)) {
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
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    const caller = await verifyCaller(token);
    if (!caller) {
      return NextResponse.json({ authorized: false }, { status: 401 });
    }

    return NextResponse.json({
      authorized: Boolean(caller.role && isAdminConsoleRole(caller.role)),
      uid: caller.uid,
      role: caller.role,
    });
  } catch {
    return NextResponse.json({ authorized: false }, { status: 401 });
  }
}
