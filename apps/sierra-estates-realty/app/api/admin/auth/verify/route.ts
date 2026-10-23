import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth-guard';
import { getRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

// Force dynamic rendering — reads the caller's identity at runtime
export const dynamic = 'force-dynamic';

/**
 * Lets the admin SPA confirm whether the signed-in Supabase user has admin
 * access, by reading the role stored on their public.profiles row.
 */
export async function GET(req: NextRequest) {
  const result = await verifyRequest(req);
  if (!result.authenticated || !result.uid) {
    return NextResponse.json({ authenticated: false, role: null }, { status: 401 });
  }

  try {
    const profile = await getRecord<{ role?: string }>('profiles', result.uid);
    const role = profile?.role ?? null;
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
