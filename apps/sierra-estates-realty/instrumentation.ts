/**
 * Next.js Instrumentation Hook
 * Runs once on server startup (Node.js runtime only).
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrapIntelligence } = await import('./lib/intelligence');
    bootstrapIntelligence();

    const { initArize } = await import('./lib/arize');
    initArize();
  }
}
