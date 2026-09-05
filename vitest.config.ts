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
      'workflows/__tests__/**/*.test.ts',
      'deploy/__tests__/**/*.test.ts',
      '__tests__/**/*.test.ts',
    ],
    alias: {
      'server-only': resolve(__dirname, 'tools/test-stubs/empty.js'),
      '@': resolve(__dirname, 'apps/sierra-estates-realty'),
      '@sierra-estates/types': resolve(__dirname, 'packages/shared/src/types/index.ts'),
      '@sierra-estates/agents-core': resolve(__dirname, 'packages/agents-core/src/index.ts'),
      '@sierra-estates/memory-engine': resolve(__dirname, 'packages/memory-engine/src/index.ts'),
      '@sierra-estates/obsidian': resolve(__dirname, 'packages/obsidian/src/index.ts'),
    },
  },
});

