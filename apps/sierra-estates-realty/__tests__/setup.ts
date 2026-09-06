// Jest setup — canonical mocks for Supabase and external services
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://REDACTED-PROJECT.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

// Neutralize Next.js `server-only` guard so server modules can be unit-tested
// under the jest node environment (outside the Next server runtime).
jest.mock('server-only', () => ({}));

// Mock firebase-admin
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date(), toMillis: () => Date.now() })),
    fromDate: jest.fn((date: Date) => ({ toDate: () => date, toMillis: () => date.getTime() })),
  },
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockRejectedValue(new Error('No token')),
  })),
}));

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({})),
}));

// Mock heavy services
jest.mock('@/lib/services/orchestrator');
jest.mock('@/lib/services/profiling-service');
jest.mock('@/lib/services/matching-engine');
jest.mock('@/lib/services/legal-brain');
jest.mock('@/lib/services/sales-engine');
jest.mock('@/lib/services/closing-engine');

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: jest.fn() },
    sheets: jest.fn(() => ({
      spreadsheets: {
        values: {
          get: jest.fn(),
          update: jest.fn(),
        },
      },
    })),
  },
}));

// Global test timeout
jest.setTimeout(10000);

// Suppress console noise from intentional error-path tests and function logs
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});
