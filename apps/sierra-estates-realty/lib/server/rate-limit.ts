import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  /** Stable name used as the Redis key namespace (so multiple limiters don't collide). */
  name: string;
}

interface RequestRecord {
  count: number;
  resetAt: number;
}

// In-memory fallback store (per-instance). Used when Upstash isn't configured,
// or when an Upstash request fails (fail-open to the local counter rather than
// hard-failing the request).
const store = new Map<string, RequestRecord>();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const upstashEnabled = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

function tooManyRequests(resetAtMs: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((resetAtMs - Date.now()) / 1000));
  return NextResponse.json(
    { error: 'Too many requests, please try again later.' },
    { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
  );
}

/**
 * In-memory fixed-window counter. Per-instance only — on serverless this means
 * each warm instance keeps its own count, so the effective limit is looser than
 * configured under load. Distributed counting requires Upstash (below).
 */
function checkInMemory(key: string, config: RateLimitConfig): NextResponse | null {
  const now = Date.now();
  let record = store.get(key);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + config.windowMs };
    store.set(key, record);
  }
  record.count += 1;
  if (record.count > config.maxRequests) {
    return tooManyRequests(record.resetAt);
  }
  return null;
}

/**
 * Distributed fixed-window counter backed by Upstash Redis (REST API, no SDK
 * dependency). One INCR + EXPIRE per request via the pipeline endpoint. The key
 * includes the window bucket so it self-expires; INCR returning 1 means this is
 * the first request in a fresh window, so we set the TTL then.
 *
 * On ANY error (network, non-2xx, malformed response) we fail open to the
 * in-memory counter instead of blocking the request — a Redis outage must not
 * take down public endpoints.
 */
async function checkUpstash(key: string, config: RateLimitConfig): Promise<NextResponse | null> {
  const windowSec = Math.ceil(config.windowMs / 1000);
  const windowStart = Math.floor(Date.now() / config.windowMs);
  const bucketKey = `ratelimit:${config.name}:${key}:${windowStart}`;

  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', bucketKey],
        ['EXPIRE', bucketKey, windowSec, 'NX'],
      ]),
      // Don't let a slow Redis hang the request path.
      signal: AbortSignal.timeout(1500),
    });

    if (!res.ok) {
      logger.warn(`[rate-limit] Upstash returned ${res.status}; failing open to in-memory`);
      return checkInMemory(key, config);
    }

    const data = (await res.json()) as Array<{ result?: number; error?: string }>;
    const count = data?.[0]?.result;
    if (typeof count !== 'number') {
      logger.warn('[rate-limit] Upstash response malformed; failing open to in-memory');
      return checkInMemory(key, config);
    }

    if (count > config.maxRequests) {
      return tooManyRequests((windowStart + 1) * config.windowMs);
    }
    return null;
  } catch (err) {
    logger.warn('[rate-limit] Upstash request failed; failing open to in-memory:', err);
    return checkInMemory(key, config);
  }
}

export function createRateLimiter(config: RateLimitConfig) {
  return async (request: Request): Promise<NextResponse | null> => {
    const key = getRateLimitKey(request);
    return upstashEnabled ? checkUpstash(key, config) : checkInMemory(key, config);
  };
}

export const publicEndpointLimiter = createRateLimiter({
  name: 'public',
  windowMs: 60 * 1000,
  maxRequests: 30,
});

export const webhookLimiter = createRateLimiter({
  name: 'webhook',
  windowMs: 60 * 1000,
  maxRequests: 100,
});

export function applyRateLimit(
  request: Request,
  limiter: (request: Request) => Promise<NextResponse | null>
): Promise<NextResponse | null> {
  return limiter(request);
}
