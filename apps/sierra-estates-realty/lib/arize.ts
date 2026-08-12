import 'server-only';
import { logger } from '@/lib/logger';

// TODO: Integrate Arize observability when @opentelemetry packages installed
// For now, provide stub implementations to unblock development

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
    logger.info("📡 Arize instrumentation stubbed (awaiting OpenTelemetry setup)");
  }
};
