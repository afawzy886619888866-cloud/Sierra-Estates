 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * sierra estates — FIREBASE CLIENT SINGLETON
 * Central Firebase initialization for the frontend.
 * Admin SDK (service-account.json) is for server/scripts only.
 */
import { initializeApp, getApps, } from 'firebase/app';
import { getAuth, } from 'firebase/auth';
import { getFirestore, } from 'firebase/firestore';
import { getStorage, } from 'firebase/storage';
import { logger } from '@/lib/logger';

const isDummyKey = (key) => {
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

let app;
try {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
} catch (error) {
  logger.warn('[firebase] Failed to initialize app:', error);
  app = getApps()[0];
}

export const isFirebaseClientConfigured = hasValidFirebaseConfig;

const createMockAuth = () => {
  // Must behave like a real signed-out Auth for the modular API:
  // getModularInstance() reads `_delegate`, and onAuthStateChanged must
  // invoke the callback (with null) and return an unsubscribe function.
  const mockAuth = {
    currentUser: null,
    onAuthStateChanged(next) {
      const cb = typeof next === 'function' ? next : _optionalChain([next, 'optionalAccess', _ => _.next]);
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

const unavailableClientService = (serviceName) =>
  new Proxy(
    {},
    {
      get() {
        throw new Error(
          `Firebase client ${serviceName} is unavailable - use real Firebase credentials in production.`
        );
      },
    }
  ) ;

const isBuildTime = typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build';

export const auth = hasValidFirebaseConfig && !isBuildTime
  ? getAuth(app)
  : createMockAuth();

export const db = hasValidFirebaseConfig && !isBuildTime
  ? getFirestore(app)
  : unavailableClientService('firestore');

export const storage = hasValidFirebaseConfig && !isBuildTime
  ? getStorage(app)
  : unavailableClientService('storage');

export async function getAnalyticsInstance() {
  if (typeof window === 'undefined') return null;
  if (!hasValidFirebaseConfig) return null;
  try {
    const { getAnalytics } = await import('firebase/analytics');
    return getAnalytics(app);
  } catch (e) {
    return null;
  }
}

export default app;
