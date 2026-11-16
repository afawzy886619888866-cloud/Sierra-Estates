import tseslint from 'typescript-eslint'
import unusedImports from 'eslint-plugin-unused-imports'
import nextPlugin from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default [
  { ignores: ['.next/**', '.vercel/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts', 'public/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: {
      'unused-imports': unusedImports,
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: false,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@next/next/no-img-element': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Machine port of deploy/data.js — regenerated from that source rather than
    // hand-edited, so its ES5 `var` style is intentional and must not be "fixed"
    // here (the next regeneration would reintroduce it).
    files: ['lib/site/data.ts'],
    rules: {
      'no-var': 'off',
    },
  },
]
