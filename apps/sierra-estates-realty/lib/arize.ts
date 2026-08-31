import 'server-only';
import { logger } from '@/lib/logger';

// @opentelemetry/* packages are installed (see package.json), but no real Arize
// exporter is wired up: it needs ARIZE_SPACE_ID + ARIZE_API_KEY, which nothing
// in this repo currently sets. These are no-op stubs until those are configured.

export function instrumentAgent<T>(
  agentName: string,
  stage: string,
  docId: string,
  fn: () => Promise<T> | T
): Promise<T> {
  // Stub: just execute the function without instrumentation
  const result = fn();
  if (result instanceof Promise) {
    return result;
  }
  return Promise.resolve(result);
}

export function getTracer() {
  return {
    startActiveSpan: (name: string, config: any, fn: (span: any) => any) => {
      // Stub span
      const span = {
        setStatus: () => {},
        recordException: () => {},
        end: () => {},
        setAttributes: () => {},
      };
      return fn(span);
    },
  };
}

export async function initializeArize() {
  // Stub initialization
  return null;
}

export const initArize = () => {
  if (typeof window === "undefined") {
    logger.info("📡 Arize instrumentation stubbed (awaiting ARIZE_SPACE_ID / ARIZE_API_KEY)");
  }
};
