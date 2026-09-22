import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
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
        replacement: `${resolve(__dirname, 'packages/agents-core/src')}/$1`,
      },
      {
        find: 'server-only',
        replacement: resolve(__dirname, 'tools/test-stubs/empty.js'),
      },
      {
        find: '@',
        replacement: resolve(__dirname, 'apps/sierra-estates-realty'),
      },
      {
        find: '@sierra-estates/types',
        replacement: resolve(__dirname, 'packages/shared/src/types/index.ts'),
      },
      {
        find: '@sierra-estates/agents-core',
        replacement: resolve(__dirname, 'packages/agents-core/src/index.ts'),
      },
      {
        find: '@sierra-estates/memory-engine',
        replacement: resolve(__dirname, 'packages/memory-engine/src/index.ts'),
      },
      {
        find: '@sierra-estates/obsidian',
        replacement: resolve(__dirname, 'packages/obsidian/src/index.ts'),
      },
    ],
  },
});
