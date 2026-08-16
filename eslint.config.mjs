import tseslint from 'typescript-eslint'

export default [
  {
    ignores: [
      '**/.next/**',
      '**/out/**',
      '**/build/**',
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
      '**/packages/**',
      '**/infra/**',
      '**/firebase/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: (await import('typescript-eslint')).parser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.json', './functions/tsconfig.json'],
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
]
