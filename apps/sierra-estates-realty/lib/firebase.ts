/**
 * sierra estates — FIREBASE CLIENT SINGLETON
 * Central Firebase initialization for the frontend.
 * Admin SDK (service-account.json) is for server/scripts only.
 */
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { logger } from '@/lib/logger';

const isDummyKey = (key?: string) => {
  if (!key) return true;
  return key.includes('Dummy') || key === 'AIzaSyDummyKey123456789';
};

const hasValidFirebaseConfig = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID &&
  !isDummyKey(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
);

const canUsePlaceholderConfig = !hasValidFirebaseConfig && typeof window === 'undefined';

if (!hasValidFirebaseConfig && !canUsePlaceholderConfig && typeof window !== 'undefined') {
  logger.warn('[firebase] Using development mock - real Firebase not configured.');
}

const firebaseConfig = hasValidFirebaseConfig
  ? {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
  : {
      apiKey: 'dev-mode-placeholder',
      authDomain: 'dev.firebaseapp.com',
      projectId: 'dev-project',
      storageBucket: 'dev.appspot.com',
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:dev',
    };

let app: FirebaseApp;
try {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
} catch (error) {
  logger.warn('[firebase] Failed to initialize app:', error);
  app = getApps()[0];
}

export const isFirebaseClientConfigured = hasValidFirebaseConfig;

const createMockAuth = (): Auth => {
  // Must behave like a real signed-out Auth for the modular API:
  // getModularInstance() reads `_delegate`, and onAuthStateChanged must
  // invoke the callback (with null) and return an unsubscribe function.
  const mockAuth: any = {
    currentUser: null,
    onAuthStateChanged(next: ((user: null) => void) | { next?: (user: null) => void }) {
      const cb = typeof next === 'function' ? next : next?.next;
      const timerId = cb ? setTimeout(() => cb(null), 0) : undefined;
      return () => { if (timerId !== undefined) clearTimeout(timerId); };
    },
    signOut: () => Promise.resolve(),
  };
  mockAuth._delegate = mockAuth;
  return new Proxy(mockAuth, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === '_isProxy') return true;
      return () => Promise.resolve(null);
    },
  });
};

const unavailableClientService = <T>(serviceName: string): T =>
  new Proxy(
    {},
    {
      get() {
        throw new Error(
          `Firebase client ${serviceName} is unavailable - use real Firebase credentials in production.`
        );
      },
    }
  ) as T;

const isBuildTime = typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build';

export const auth: Auth = hasValidFirebaseConfig && !isBuildTime
  ? getAuth(app)
  : createMockAuth();

export const db: Firestore = hasValidFirebaseConfig && !isBuildTime
  ? getFirestore(app)
  : unavailableClientService<Firestore>('firestore');

export const storage: FirebaseStorage = hasValidFirebaseConfig && !isBuildTime
  ? getStorage(app)
  : unavailableClientService<FirebaseStorage>('storage');

export async function getAnalyticsInstance() {
  if (typeof window === 'undefined') return null;
  if (!hasValidFirebaseConfig) return null;
  try {
    const { getAnalytics } = await import('firebase/analytics');
    return getAnalytics(app);
  } catch {
    return null;
  }
}

export default app;
