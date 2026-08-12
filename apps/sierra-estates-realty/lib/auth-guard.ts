/**
 * SIERRA ESTATES — SERVER-SIDE AUTH GUARD  v12.4
 * Validates Firebase Auth tokens on API routes.
 *
 * Supports three auth methods:
 *   1. Firebase ID Token  →  Authorization: Bearer <token>
 *   2. SBR Secret Key     →  X-SBR-SECRET-KEY header
 *   3. Cron Secret        →  Authorization: Bearer <CRON_SECRET>  (Vercel cron jobs)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from './server/firebase-admin';

// FIX: Support both env vars — CRON_SECRET (Vercel cron) + SBR_SECRET_KEY (internal)
const SBR_SECRET   = process.env.SBR_SECRET_KEY  || process.env.CRON_SECRET || '';

export interface AuthResult {
  authenticated: boolean;
  uid?: string;
  email?: string;
  method: 'firebase' | 'secret-key' | 'cron-secret' | 'none';
}

/**
 * Verifies an incoming API request.
 */
export async function verifyRequest(req: NextRequest): Promise<AuthResult> {
  // Method 1: Firebase ID Token
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    // Method 3: Vercel cron secret (sent as Bearer token)
    if (SBR_SECRET && token === SBR_SECRET) {
      return { authenticated: true, method: 'cron-secret' };
    }

    // Firebase JWT
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      return {
        authenticated: true,
        uid:    decoded.uid,
        email:  decoded.email,
        method: 'firebase',
      };
    } catch {
      // Token invalid or expired — fall through
    }
  }

  // Method 2: Internal Secret Key header
  const secretHeader = req.headers.get('x-sbr-secret-key');
  if (SBR_SECRET && secretHeader === SBR_SECRET) {
    return { authenticated: true, method: 'secret-key' };
  }

  // Also support x-cron-secret (used in orchestrate route per handover doc)
  const cronHeader = req.headers.get('x-cron-secret');
  if (SBR_SECRET && cronHeader === SBR_SECRET) {
    return { authenticated: true, method: 'cron-secret' };
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
