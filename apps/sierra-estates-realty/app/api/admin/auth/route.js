 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
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
export async function POST(req) {
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
    const userRole = _optionalChain([userDoc, 'access', _ => _.data, 'call', _2 => _2(), 'optionalAccess', _3 => _3.role]);

    // Only admin, manager, and superadmin can access admin console
    if (!['admin', 'manager', 'superadmin'].includes(userRole)) {
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
export async function GET(req) {
  initializeFirebaseAdmin();
  try {
    const token = _optionalChain([req, 'access', _4 => _4.headers, 'access', _5 => _5.get, 'call', _6 => _6('authorization'), 'optionalAccess', _7 => _7.split, 'call', _8 => _8('Bearer '), 'access', _9 => _9[1]]);

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
    const userRole = _optionalChain([userDoc, 'access', _10 => _10.data, 'call', _11 => _11(), 'optionalAccess', _12 => _12.role]);

    const authorized = ['admin', 'manager', 'superadmin'].includes(userRole);

    return NextResponse.json({
      authorized,
      uid,
      role: userRole,
    });
  } catch (e) {
    return NextResponse.json(
      { authorized: false },
      { status: 401 }
    );
  }
}
