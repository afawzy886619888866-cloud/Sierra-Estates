// Pin the timezone before any worker spawns. Date-formatting assertions
// (lib/format.ts and anything asserting on rendered dates) otherwise shift with
// the host offset — they pass in UTC and Cairo but fail in e.g. UTC+14. Set
// here rather than in a setup file so it is in place before Node resolves the
// local zone. CI runs UTC anyway; this makes local runs match it.
process.env.TZ = 'UTC';

const path = require('path');

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  // `tsc` without an outDir emits a .js next to every .ts source, and those
  // artifacts have been committed under lib/ and app/. Jest's default order
  // resolves the stale ESM .js first and fails to parse it, so .ts wins here.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/api/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    // lib/validation/*.test.ts are standalone validation scripts, not jest
    // suites — they sit outside __tests__/ so `testMatch` never runs them, yet
    // they were being counted as source and pinned at 0%. Exclude test files
    // from the denominator generally.
    '!**/*.test.{ts,tsx}',
  ],
  coverageReporters: ['text-summary', 'lcov', 'json'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
};

module.exports = config;
