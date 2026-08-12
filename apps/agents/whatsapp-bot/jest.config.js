/**
 * Standalone Jest config for the WhatsApp bot agent.
 * Run with `npm test` from this directory (after `npm install`).
 *
 * The @sierra-estates/* packages are workspace packages that live in the repo's
 * packages/ tree; this agent is deliberately outside the pnpm install graph, so
 * they are mapped to their TypeScript sources here (mirrors the root tsconfig
 * `paths`).
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@sierra-estates/agents-core$': '<rootDir>/../../../packages/agents-core/src/index.ts',
    '^@sierra-estates/memory-engine$': '<rootDir>/../../../packages/memory-engine/src/index.ts',
    '^@sierra-estates/obsidian$': '<rootDir>/../../../packages/obsidian/src/index.ts',
    '^@sierra-estates/exchange$': '<rootDir>/../../../packages/exchange/exchange-client.ts',
    '^@sierra-estates/exchange/(.*)$': '<rootDir>/../../../packages/exchange/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
};
