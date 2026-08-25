/**
 * SIERRA ESTATES — FIREBASE ADMIN SERVICE (V12.1 Hardened)
 *
 * IMPORTANT: This file must ONLY be imported in server-side components or API routes.
 * Lazy-loads firebase-admin to prevent Metadata service errors during Next.js build.
 */
import 'server-only';

const makeUnavailable = (name: string): any =>
  new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        return (..._args: any[]) => {
          // Keep build-time and test fallbacks deterministic, but never let a
          // production request report a fake successful database operation.
          const isProductionRuntime =
            process.env.NODE_ENV === 'production' &&
            process.env.NEXT_PHASE !== 'phase-production-build';
          if (isProductionRuntime) {
            throw new Error(
              `[firebase-admin] ${name} is unavailable. Configure Firebase server credentials before serving requests.`
            );
          }
          console.warn(`⚠️ [firebase-admin] ${name}.${String(prop)} called but not initialized.`);
          const chainable = {
            get: () => Promise.resolve({ size: 0, empty: true, forEach: () => {}, exists: false, data: () => ({}) }),
            set: () => Promise.resolve(),
            update: () => Promise.resolve(),
            add: () => Promise.resolve({ id: 'mock-id' }),
            limit: () => chainable,
            orderBy: () => chainable,
            where: () => chainable,
            doc: () => chainable,
            collection: () => chainable,
          };
          return chainable;
        };
      },
    }
  );

let adminApp: any = makeUnavailable('App');
let adminAuth: any = makeUnavailable('Auth');
let adminDb: any = makeUnavailable('Firestore');
let adminAppCheck: any = makeUnavailable('AppCheck');
let adminStorage: any = makeUnavailable('Storage');
let isAdminInitialized = false;

let initPromise: Promise<void> | null = null;

async function loadAndInitializeAdmin() {
  if (isAdminInitialized) return;
  if (initPromise) return initPromise;

  // In test environment without credentials, use resilient mock fallback silently
  if (process.env.NODE_ENV === 'test' && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.FIREBASE_CLIENT_EMAIL) {
    return;
  }

  initPromise = (async () => {
    try {
      let getApps: any, getApp: any, initializeApp: any, cert: any;
      let getAuth: any;
      let getFirestore: any;
      let getAppCheck: any;
      let getStorage: any;

      try {
        // Direct root require is 100% compatible with Jest and Node.js CJS
        const admin = require('firebase-admin');
        const adminAppMod = require('firebase-admin/app');
        getApps = adminAppMod.getApps || admin.apps;
        getApp = adminAppMod.getApp || (() => admin.app());
        initializeApp = adminAppMod.initializeApp || admin.initializeApp;
        cert = adminAppMod.cert || admin.credential?.cert;
        getAuth = require('firebase-admin/auth').getAuth || admin.auth;
        getFirestore = require('firebase-admin/firestore').getFirestore || admin.firestore;
        getAppCheck = require('firebase-admin/app-check').getAppCheck || admin.appCheck;
        getStorage = require('firebase-admin/storage').getStorage || admin.storage;
      } catch {
        const appMod = await import('firebase-admin/app');
        const authMod = await import('firebase-admin/auth');
        const firestoreMod = await import('firebase-admin/firestore');
        const appCheckMod = await import('firebase-admin/app-check');
        const storageMod = await import('firebase-admin/storage');
        getApps = appMod.getApps;
        getApp = appMod.getApp;
        initializeApp = appMod.initializeApp;
        cert = appMod.cert;
        getAuth = authMod.getAuth;
        getFirestore = firestoreMod.getFirestore;
        getAppCheck = appCheckMod.getAppCheck;
        getStorage = storageMod.getStorage;
      }

      let apps = getApps();

      if (!apps.length) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace?.(/\\n/g, '\n');

        if (serviceAccount) {
          console.log('🔐 [Firebase] Initializing with service account JSON');
          initializeApp({
            credential: cert(JSON.parse(serviceAccount)),
            projectId: projectId,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          });
        } else if (projectId && clientEmail && privateKey) {
          console.log('🔐 [Firebase] Initializing with individual env variables');
          initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
            projectId: projectId,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          });
        } else {
          console.log('🔐 [Firebase] No credentials provided — running in limited mode');
          return;
        }
        apps = getApps();
      }

      if (apps.length) {
        adminApp = getApp();
        adminAuth = getAuth(adminApp);
        adminDb = getFirestore(adminApp);
        adminAppCheck = getAppCheck(adminApp);
        adminStorage = getStorage(adminApp);
        isAdminInitialized = true;
      }
    } catch (error) {
      console.warn(
        '[firebase-admin] Initialization failed — Admin features limited.\n' +
        'Reason:', error instanceof Error ? error.message : 'Unknown error'
      );
    }
  })();

  return initPromise;
}

// Call on module load but don't block
loadAndInitializeAdmin().catch(() => {});

export { adminApp, adminAuth, adminDb, adminAppCheck, adminStorage, isAdminInitialized, loadAndInitializeAdmin };
