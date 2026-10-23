import crypto from 'crypto';

/**
 * Categorized error types for background workers and scrapers.
 */
export type WorkerErrorCategory =
  | 'transient_network'
  | 'rate_limit'
  | 'auth_failure'
  | 'validation_error'
  | 'duplicate_conflict'
  | 'permanent_failure';

export interface ClassifiedError {
  category: WorkerErrorCategory;
  isRetryable: boolean;
  message: string;
  statusCode?: number;
  originalError?: unknown;
}

/**
 * Classifies an arbitrary error into a structured WorkerErrorCategory.
 */
export function classifyError(err: unknown): ClassifiedError {
  if (!err) {
    return {
      category: 'permanent_failure',
      isRetryable: false,
      message: 'Unknown null error',
    };
  }

  const message = err instanceof Error ? err.message : String(err);
  const code = (err as Record<string, any>)?.code || '';
  const status = (err as Record<string, any>)?.status || (err as Record<string, any>)?.statusCode;

  // 1. Rate limits
  if (status === 429 || /rate limit|quota exceeded|too many requests/i.test(message)) {
    return {
      category: 'rate_limit',
      isRetryable: true,
      message,
      statusCode: 429,
      originalError: err,
    };
  }

  // 2. Auth failures
  if (status === 401 || status === 403 || /unauthorized|forbidden|jwt|invalid token|access denied/i.test(message)) {
    return {
      category: 'auth_failure',
      isRetryable: false,
      message,
      statusCode: status || 401,
      originalError: err,
    };
  }

  // 3. Transient Network / Timeout failures
  if (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    /timeout|network error|econnreset|socket hang up|fetch failed/i.test(message)
  ) {
    return {
      category: 'transient_network',
      isRetryable: true,
      message,
      statusCode: status || 503,
      originalError: err,
    };
  }

  // 4. Duplicate / Unique violation
  if (code === '23505' || /duplicate key|unique constraint|already exists/i.test(message)) {
    return {
      category: 'duplicate_conflict',
      isRetryable: false,
      message,
      statusCode: 409,
      originalError: err,
    };
  }

  // 5. Validation / Bad request
  if (status === 400 || /validation|invalid input|malformed|schema mismatch/i.test(message)) {
    return {
      category: 'validation_error',
      isRetryable: false,
      message,
      statusCode: 400,
      originalError: err,
    };
  }

  return {
    category: 'permanent_failure',
    isRetryable: false,
    message,
    statusCode: status || 500,
    originalError: err,
  };
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitter?: boolean;
  onRetry?: (attempt: number, err: ClassifiedError, delayMs: number) => void;
}

/**
 * Executes an async operation with bounded exponential backoff retries.
 * Only errors classified as retryable are retried.
 */
export async function withBoundedRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 150,
    maxDelayMs = 2000,
    backoffFactor = 2,
    jitter = true,
    onRetry,
  } = options;

  let attempt = 0;
  while (true) {
    try {
      return await operation(attempt);
    } catch (err: unknown) {
      attempt++;
      const classified = classifyError(err);

      if (!classified.isRetryable || attempt > maxRetries) {
        throw err;
      }

      // Compute backoff delay
      let delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(backoffFactor, attempt - 1));
      if (jitter) {
        delay = Math.round(delay * (0.8 + Math.random() * 0.4));
      }

      if (onRetry) {
        onRetry(attempt, classified, delay);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * In-memory TTL idempotency cache to prevent duplicate processing.
 */
export class IdempotencyCache {
  private cache = new Map<string, number>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;

  constructor(defaultTtlMs: number = 5 * 60 * 1000, maxEntries: number = 10000) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
  }

  /**
   * Generates a deterministic SHA256 hex string for any payload.
   */
  public static hashPayload(payload: unknown): string {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Checks if a key has already been processed and is not yet expired.
   */
  public isDuplicate(key: string): boolean {
    this.cleanup();
    const expiry = this.cache.get(key);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Marks a key as processed with an expiration timestamp.
   */
  public markProcessed(key: string, ttlMs?: number): void {
    this.cleanup();
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest 10%
      const keysToDelete = Array.from(this.cache.keys()).slice(0, Math.floor(this.maxEntries * 0.1));
      for (const k of keysToDelete) {
        this.cache.delete(k);
      }
    }
    this.cache.set(key, Date.now() + (ttlMs ?? this.defaultTtlMs));
  }

  /**
   * Cleans expired entries.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, expiry] of this.cache.entries()) {
      if (now > expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears the entire cache (useful in tests).
   */
  public clear(): void {
    this.cache.clear();
  }
}

// Global shared instance for automations
export const globalIdempotencyCache = new IdempotencyCache();
