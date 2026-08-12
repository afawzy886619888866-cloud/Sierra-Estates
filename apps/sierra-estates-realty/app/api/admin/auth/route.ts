import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Lazy initialize Firebase Admin SDK at runtime only
let initialized = false;

function initializeFirebaseAdmin() {
  if (initialized || getApps().length > 0) return;

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_JSON not set - Admin operations will fail');
      return;
    }

    initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
    });
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

/**
 * POST /api/admin/auth/verify
 * Verify Firebase ID token and check admin role
 */
export async function POST(req: NextRequest) {
  initializeFirebaseAdmin();
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      );
    }

    // Verify token with Firebase Admin SDK
    const decodedToken = await getAuth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check user role in Firestore
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    const userRole = userDoc.data()?.role;

    // Only admin and manager can access admin console
    if (!['admin', 'manager'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      uid,
      role: userRole,
      email: decodedToken.email,
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}

/**
 * POST /api/admin/auth/check-role
 * Simple role check for frontend
 */
export async function GET(req: NextRequest) {
  initializeFirebaseAdmin();
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];

    if (!token) {
      return NextResponse.json(
        { authorized: false },
        { status: 401 }
      );
    }

    const decodedToken = await getAuth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    const userRole = userDoc.data()?.role;

    const authorized = ['admin', 'manager'].includes(userRole);

    return NextResponse.json({
      authorized,
      uid,
      role: userRole,
    });
  } catch {
    return NextResponse.json(
      { authorized: false },
      { status: 401 }
    );
  }
}
