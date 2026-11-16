import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    testTimeout: 60000,
    include: [
      'packages/*/src/__tests__/**/*.test.ts',
      'packages/*/src/**/*.test.ts',
      'packages/shared/src/__tests__/**/*.test.ts',
      'packages/agents-core/src/__tests__/**/*.test.ts',
      'packages/memory-engine/src/__tests__/**/*.test.ts',
      'infra/n8n-workflows/__tests__/**/*.test.ts',
      'infra/whatsapp-scraper/__tests__/**/*.test.ts',
      'apps/agents/__tests__/**/*.test.ts',
      'apps/automations/**/__tests__/**/*.test.ts',
      'workflows/__tests__/**/*.test.ts',
      'deploy/__tests__/**/*.test.ts',
      '__tests__/**/*.test.ts',
    ],
    alias: [
      {
        find: /^@sierra-estates\/agents-core\/src\/(.*)$/,
        replacement: `${resolve(configDir, 'packages/agents-core/src')}/$1`,
      },
      {
        find: 'server-only',
        replacement: resolve(configDir, 'tools/test-stubs/empty.js'),
      },
      {
        find: '@',
        replacement: resolve(configDir, 'apps/sierra-estates-realty'),
      },
      {
        find: '@sierra-estates/types',
        replacement: resolve(configDir, 'packages/shared/src/types/index.ts'),
      },
      {
        find: '@sierra-estates/agents-core',
        replacement: resolve(configDir, 'packages/agents-core/src/index.ts'),
      },
      {
        find: '@sierra-estates/memory-engine',
        replacement: resolve(configDir, 'packages/memory-engine/src/index.ts'),
      },
      {
        find: '@sierra-estates/obsidian',
        replacement: resolve(configDir, 'packages/obsidian/src/index.ts'),
      },
    ],
  },
});
