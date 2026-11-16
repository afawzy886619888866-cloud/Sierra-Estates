/**
 * PostCSS config — required for Tailwind v4 to run inside Next.js.
 * Without this, `@import "tailwindcss"` imports theme tokens but NO utility
 * classes are generated (bg-navy, text-gold, flex, grid… all become no-ops),
 * leaving the entire site unstyled. Mirrors apps/sierra-estates-admin-portal.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
