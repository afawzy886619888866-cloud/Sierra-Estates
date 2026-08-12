/**
 * SIERRA ESTATES — SERVER-SIDE AUTH GUARD
 * Validates Firebase Auth tokens on API routes.
 * Use: wrap any API handler with `withAuth(handler)` or call `verifyRequest(req)`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from './firebase-admin';

const SECRET_KEY = process.env.SBR_SECRET_KEY || '';

export interface AuthResult {
  authenticated: boolean;
  uid?: string;
  email?: string;
  method: 'firebase' | 'secret-key' | 'none';
}

/**
 * Verifies an incoming API request.
 * Supports two auth methods:
 *   1. Firebase ID Token via `Authorization: Bearer <token>`
 *   2. Internal secret key via `X-SBR-SECRET-KEY` header (for cron/webhooks)
 */
export async function verifyRequest(req: NextRequest): Promise<AuthResult> {
  // Method 1: Firebase ID Token
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      return {
        authenticated: true,
        uid: decoded.uid,
        email: decoded.email,
        method: 'firebase',
      };
    } catch {
      // Token invalid or expired — fall through to secret key check
    }
  }

  // Method 2: Internal Secret Key (for server-to-server, cron, webhooks)
  const secretHeader = req.headers.get('x-sbr-secret-key');
  if (SECRET_KEY && secretHeader === SECRET_KEY) {
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
 * Checks Firebase token AND verifies `role: 'admin'` in Firestore.
 */
export async function verifyAdminRequest(req: NextRequest): Promise<AuthResult> {
  const result = await verifyRequest(req);
  if (!result.authenticated || !result.uid) return result;

  try {
    const { adminDb } = await import('./firebase-admin');
    const userDoc = await adminDb.collection('users').doc(result.uid).get();
    const role = userDoc.data()?.role;
    if (role !== 'admin' && role !== 'superadmin') {
      return { authenticated: false, method: 'none' };
    }
  } catch {
    return { authenticated: false, method: 'none' };
  }

  return result;
}
