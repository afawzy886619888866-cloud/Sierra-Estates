import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let app: App | null = null;

/**
 * Lazily initializes the Firebase Admin SDK from env vars so the module can
 * be imported even when the service account isn't configured (e.g. local
 * dev without secrets) — callers must handle the null return.
 */
function getAdminApp(): App | null {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel env vars store literal "\n" — restore real newlines.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return app;
}

/**
 * Verifies a Firebase Auth ID token server-side (signature + expiry), as
 * opposed to the old approach of just base64-decoding the JWT payload.
 * Returns the decoded token on success, or null if verification fails or
 * the Admin SDK isn't configured.
 */
export async function verifyIdToken(token: string) {
  const adminApp = getAdminApp();
  if (!adminApp) {
    console.error('Firebase Admin SDK not configured — set FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.');
    return null;
  }
  try {
    return await getAuth(adminApp).verifyIdToken(token);
  } catch (err) {
    console.error('verifyIdToken failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
