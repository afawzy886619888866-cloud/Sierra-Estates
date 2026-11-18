// Jest setup — canonical mocks for Supabase and external services
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://gaxfqcietzoonlmatiot.supabase.co';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
}
// FORCE the filtered service-key placeholder, unconditionally. CI wrappers
// (scripts/ci-preflight.sh, .github/workflows/ci.yml) export placeholder
// credentials so the presence-only backend-policy gate passes. Any value
// other than the exact literals OwnerListingIntakeService.usableEnv() filters
// builds a REAL Supabase client inside jest — intake tests then attempt real
// network calls and fail closed ("TypeError: fetch failed") in the Vercel
// build container. Overwriting here keeps every suite hermetic regardless of
// what the wrapper exported; suites that manage their own env do so on top.
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Neutralize Next.js `server-only` guard so server modules can be unit-tested
// under the jest node environment (outside the Next server runtime).
jest.mock('server-only', () => ({}));

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
