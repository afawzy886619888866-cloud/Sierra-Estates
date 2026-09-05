/**
 * The package had tests (`__tests__/mempalace.test.ts`) but no runner, so the
 * realty app's jest config — scoped to its own root — never executed them.
 * This makes the memory engine's suite actually run in CI.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // `build` (tsc, no outDir) emits .js next to each .ts source, and those
  // artifacts are committed. Jest's default extension order resolves the ESM
  // .js first and fails to parse it, so put .ts ahead of .js here.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/server.ts'],
};
