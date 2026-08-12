module.exports = {
  root: true,
  ignorePatterns: ['.next/**', 'out/**', 'build/**', 'dist/**', '*.js', '*.mjs'],
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: ['@typescript-eslint', 'unused-imports'],
  rules: {
    'unused-imports/no-unused-imports': 'off',
    'unused-imports/no-unused-vars': 'off',
    'prefer-const': 'off',
  },
};
