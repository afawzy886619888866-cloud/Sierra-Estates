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

  initPromise = (async () => {
    try {
      let appMod: any;
      let authMod: any;
      let firestoreMod: any;
      let appCheckMod: any;
      let storageMod: any;

      try {
        // CJS-friendly require for Node/Jest runtime
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        appMod = require('firebase-admin/app');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        authMod = require('firebase-admin/auth');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        firestoreMod = require('firebase-admin/firestore');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        appCheckMod = require('firebase-admin/app-check');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        storageMod = require('firebase-admin/storage');
      } catch {
        appMod = await import('firebase-admin/app');
        authMod = await import('firebase-admin/auth');
        firestoreMod = await import('firebase-admin/firestore');
        appCheckMod = await import('firebase-admin/app-check');
        storageMod = await import('firebase-admin/storage');
      }

      const { getApps, getApp, initializeApp, cert } = appMod;
      const { getAuth } = authMod;
      const { getFirestore } = firestoreMod;
      const { getAppCheck } = appCheckMod;
      const { getStorage } = storageMod;

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
