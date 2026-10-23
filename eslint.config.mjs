import tseslint from 'typescript-eslint'
import unusedImports from 'eslint-plugin-unused-imports'

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/dist/**',
      '**/coverage/**',
      '**/next-env.d.ts',
      '**/public/design/**',
      '**/extract_styles.js',
      '**/extract_all_styles.js',
      '**/eslint.config.mjs',
      '**/next.config.mjs',
      '**/vitest.config.ts',
      '**/scripts/**',
      '**/push_env.js',
      '**/merge_and_push_env.js',
      '**/*.js',
      '**/*.mjs',
      '**/apps/**',
      // Vendored third-party project — excluded from the pnpm workspace, so it
      // is excluded from the lint gate too.
      '**/packages/open-memory/**',
      '**/infra/**',
      '**/firebase/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: {
      'unused-imports': unusedImports,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: (await import('typescript-eslint')).parser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        // Non-type-aware on purpose: this config is shared by every workspace
        // package, and no single tsconfig project covers all of their files.
        project: false,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      // Handled by unused-imports so that unused code is a visible warning
      // backlog rather than a hard build failure.
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
]
