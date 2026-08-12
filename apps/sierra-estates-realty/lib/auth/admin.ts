/**
 * Admin Authentication Utilities (Server-Side)
 * Verifies admin status via Firebase auth tokens and custom claims
 */

import { NextRequest } from 'next/server';
import { adminAuth, isAdminInitialized } from '@/lib/server/firebase-admin';

export interface AdminVerifyResult {
  authenticated: boolean;
  userId?: string;
  email?: string;
  isAdmin?: boolean;
  error?: string;
}

/**
 * Verify that a request contains valid admin credentials
 * Checks Firebase auth token and admin custom claims
 */
export async function verifyAdminRequest(req: NextRequest): Promise<AdminVerifyResult> {
  try {
    if (!isAdminInitialized) {
      return {
        authenticated: false,
        error: 'Firebase Admin SDK not initialized',
      };
    }

    // Extract Firebase auth token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        authenticated: false,
        error: 'Missing or invalid Authorization header',
      };
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    // Verify token with Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Check for admin custom claim
    const isAdmin = decodedToken.admin === true || decodedToken.role === 'admin';

    if (!isAdmin) {
      return {
        authenticated: false,
        userId: decodedToken.uid,
        email: decodedToken.email,
        error: 'User does not have admin privileges',
      };
    }

    return {
      authenticated: true,
      userId: decodedToken.uid,
      email: decodedToken.email,
      isAdmin: true,
    };
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    };
  }
}

/**
 * Verify admin status for a user ID (used in server-side operations)
 */
export async function verifyAdminUser(userId: string): Promise<boolean> {
  try {
    if (!isAdminInitialized) return false;

    const userRecord = await adminAuth.getUser(userId);
    return userRecord.customClaims?.admin === true || userRecord.customClaims?.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Set admin role for a user
 */
export async function setAdminRole(userId: string, isAdmin: boolean): Promise<boolean> {
  try {
    if (!isAdminInitialized) return false;

    await adminAuth.setCustomUserClaims(userId, { admin: isAdmin, role: isAdmin ? 'admin' : 'user' });
    return true;
  } catch {
    return false;
  }
}
