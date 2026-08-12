import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/shared/src/__tests__/**/*.test.ts',
      'infra/n8n-workflows/__tests__/**/*.test.ts',
      'infra/whatsapp-scraper/__tests__/**/*.test.ts',
    ],
    alias: {
      '@sierra-estates/types': resolve(__dirname, 'packages/shared/src/types/index.ts'),
    },
  },
});
