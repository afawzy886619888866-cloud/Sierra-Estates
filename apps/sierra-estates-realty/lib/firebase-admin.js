









let _app = null;
let _db = null;
let _initTried = false;

export function adminEnabled() {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.FIREBASE_PROJECT_ID
  );
}

export async function getAdminApp() {
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

export async function getAdminDb() {
  if (_db) return _db;
  const app = await getAdminApp();
  if (!app) return null;
  const { getFirestore } = await import("firebase-admin/firestore");
  _db = getFirestore(app);
  return _db;
}
