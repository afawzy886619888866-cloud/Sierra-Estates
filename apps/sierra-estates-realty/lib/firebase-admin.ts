/**
 * Firebase Admin SDK — server-side only, lazy singleton.
 * Used by API routes that need privileged Firestore access.
 * Reads service account from GOOGLE_APPLICATION_CREDENTIALS (Vercel)
 * or FIREBASE_SERVICE_ACCOUNT env (local). If neither is set, the API
 * routes fall back to seed data.
 */
import type { App } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";

let _app: App | null = null;
let _db: Firestore | null = null;
let _initTried = false;

export function adminEnabled(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.FIREBASE_PROJECT_ID
  );
}

export async function getAdminApp(): Promise<App | null> {
  if (_initTried) return _app;
  _initTried = true;
  if (!adminEnabled()) return null;
  try {
    const { getApps, initializeApp, cert, applicationDefault } = await import("firebase-admin/app");
    const existingApps = getApps();
    if (existingApps.length) {
      _app = existingApps[0];
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      _app = initializeApp({ credential: cert(svc) });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      _app = initializeApp({ credential: cert(svc) });
    } else {
      _app = initializeApp({ credential: applicationDefault() });
    }
  } catch (err) {
    console.warn("[firebase-admin] init failed:", err);
    _app = null;
  }
  return _app;
}

export async function getAdminDb(): Promise<Firestore | null> {
  if (_db) return _db;
  const app = await getAdminApp();
  if (!app) return null;
  const { getFirestore } = await import("firebase-admin/firestore");
  _db = getFirestore(app);
  return _db;
}
