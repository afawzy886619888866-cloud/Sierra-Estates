/**
 * The package had tests (`__tests__/mempalace.test.ts`) but no runner, so the
 * realty app's jest config — scoped to its own root — never executed them.
 * This makes the memory engine's suite actually run in CI.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/server.ts'],
};
