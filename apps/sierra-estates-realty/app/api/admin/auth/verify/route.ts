import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { logger } from '@/lib/logger';

// Force dynamic rendering — uses Firebase/auth at runtime
export const dynamic = 'force-dynamic';

/**
 * Lets the admin SPA confirm whether the signed-in Firebase user has admin access,
 * replacing its own getDoc(admins/{uid}) read against a separate Firestore project.
 */
export async function GET(req: NextRequest) {
  const result = await verifyRequest(req);
  if (!result.authenticated || !result.uid) {
    return NextResponse.json({ authenticated: false, role: null }, { status: 401 });
  }

  try {
    const userDoc = await adminDb.collection(COLLECTIONS.users).doc(result.uid).get();
    const role = userDoc.exists ? userDoc.data()?.role ?? null : null;
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
