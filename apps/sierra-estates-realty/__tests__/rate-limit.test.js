/**
 * Tests: lib/server/rate-limit.ts
 *
 * Covers both backends and — importantly — every fail-open path. The Upstash
 * limiter must degrade to the in-memory counter on any failure rather than
 * blocking traffic, so a Redis outage cannot take down public endpoints.
 *
 * NOTE: UPSTASH_* are read into module-level consts at import time, so each
 * test re-imports the module after setting env via `jest.resetModules()`.
 * The in-memory store is also module-level, so a fresh import gives each test
 * a clean counter.
 */
jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

export {};
const ORIGINAL_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIGINAL_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;



/** Re-import the module with Upstash either configured or absent. */
async function loadLimiter(opts) {
  if (opts.upstash) {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token-123';
  } else {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }
  jest.resetModules();
  return import('../lib/server/rate-limit');
}

function request(headers = {}) {
  return new Request('https://sierra-estates.net/api/leads', { headers });
}

/** Build an Upstash pipeline response where INCR returns `count`. */
function upstashOk(count) {
  return {
    ok: true,
    status: 200,
    json: async () => [{ result: count }, { result: 1 }],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = ORIGINAL_URL;
  if (ORIGINAL_TOKEN === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = ORIGINAL_TOKEN;
});

describe('getRateLimitKey', () => {
  it('uses the first entry of x-forwarded-for', async () => {
    const { getRateLimitKey } = await loadLimiter({ upstash: false });

    expect(getRateLimitKey(request({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
  });

  it('trims whitespace around the forwarded IP', async () => {
    const { getRateLimitKey } = await loadLimiter({ upstash: false });

    expect(getRateLimitKey(request({ 'x-forwarded-for': '  1.2.3.4  , 5.6.7.8' }))).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
    const { getRateLimitKey } = await loadLimiter({ upstash: false });

    expect(getRateLimitKey(request({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9');
  });

  it('falls back to "unknown" when neither header is present', async () => {
    const { getRateLimitKey } = await loadLimiter({ upstash: false });

    expect(getRateLimitKey(request())).toBe('unknown');
  });
});

describe('in-memory limiter', () => {
  it('allows requests up to the limit and blocks the one after', async () => {
    const { createRateLimiter } = await loadLimiter({ upstash: false });
    const limiter = createRateLimiter({ name: 't', windowMs: 60000, maxRequests: 3 });
    const req = request({ 'x-forwarded-for': '1.1.1.1' });

    expect(await limiter(req)).toBeNull();
    expect(await limiter(req)).toBeNull();
    expect(await limiter(req)).toBeNull();

    const blocked = await limiter(req);
    expect(blocked).not.toBeNull();
    expect(blocked.status).toBe(429);
  });

  it('sets a Retry-After header of at least 1 second', async () => {
    const { createRateLimiter } = await loadLimiter({ upstash: false });
    const limiter = createRateLimiter({ name: 't', windowMs: 60000, maxRequests: 1 });
    const req = request({ 'x-forwarded-for': '2.2.2.2' });

    await limiter(req);
    const blocked = await limiter(req);

    const retryAfter = Number(blocked.headers.get('Retry-After'));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it('counts each client IP independently', async () => {
    const { createRateLimiter } = await loadLimiter({ upstash: false });
    const limiter = createRateLimiter({ name: 't', windowMs: 60000, maxRequests: 1 });

    expect(await limiter(request({ 'x-forwarded-for': '1.1.1.1' }))).toBeNull();
    // A different IP starts its own window rather than inheriting the first.
    expect(await limiter(request({ 'x-forwarded-for': '2.2.2.2' }))).toBeNull();
  });

  it('starts a fresh window once the old one expires', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-15T12:00:00Z'));
    try {
      const { createRateLimiter } = await loadLimiter({ upstash: false });
      const limiter = createRateLimiter({ name: 't', windowMs: 60000, maxRequests: 1 });
      const req = request({ 'x-forwarded-for': '3.3.3.3' });

      expect(await limiter(req)).toBeNull();
      expect(await limiter(req)).not.toBeNull();

      jest.setSystemTime(new Date('2026-08-15T12:01:01Z'));
      expect(await limiter(req)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not call fetch when Upstash is not configured', async () => {
    const { createRateLimiter } = await loadLimiter({ upstash: false });
    const limiter = createRateLimiter({ name: 't', windowMs: 60000, maxRequests: 5 });

    await limiter(request({ 'x-forwarded-for': '4.4.4.4' }));

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('Upstash limiter', () => {
  it('allows a request when INCR is within the limit', async () => {
    const { createRateLimiter } = await loadLimiter({ upstash: true });
    (global.fetch ).mockResolvedValueOnce(upstashOk(1));
    const limiter = createRateLimiter({ name: 'pub', windowMs: 60000, maxRequests: 30 });

    expect(await limiter(request({ 'x-forwarded-for': '1.1.1.1' }))).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('blocks with 429 once INCR exceeds the limit', async () => {
    const { createRateLimiter } = await loadLimiter({ upstash: true });
    (global.fetch ).mockResolvedValueOnce(upstashOk(31));
    const limiter = createRateLimiter({ name: 'pub', windowMs: 60000, maxRequests: 30 });

    const res = await limiter(request({ 'x-forwarded-for': '1.1.1.1' }));

    expect(res).not.toBeNull();
    expect(res.status).toBe(429);
  });

  it('sends INCR and EXPIRE to the pipeline endpoint with the bearer token', async () => {
    const { createRateLimiter } = await loadLimiter({ upstash: true });
    (global.fetch ).mockResolvedValueOnce(upstashOk(1));
    const limiter = createRateLimiter({ name: 'pub', windowMs: 60000, maxRequests: 30 });

    await limiter(request({ 'x-forwarded-for': '1.1.1.1' }));

    const [url, init] = (global.fetch ).mock.calls[0];
    expect(url).toBe('https://redis.example.com/pipeline');
    expect(init.headers.Authorization).toBe('Bearer token-123');

    const body = JSON.parse(init.body);
    expect(body[0][0]).toBe('INCR');
    expect(body[1]).toEqual(['EXPIRE', expect.stringContaining('ratelimit:pub:1.1.1.1:'), 60, 'NX']);
  });

  // ── fail-open paths ──────────────────────────────────────────────────────
  it('fails open to the in-memory counter on a non-2xx response', async () => {
    const { createRateLimiter } = await loadLimiter({ upstash: true });
    (global.fetch ).mockResolvedValueOnce({ ok: false, status: 500 });
    const limiter = createRateLimiter({ name: 'pub', windowMs: 60000, maxRequests: 30 });

    // Allowed by the in-memory fallback, not blocked by the Redis failure.
    expect(await limiter(request({ 'x-forwarded-for': '1.1.1.1' }))).toBeNull();
  });

  it('fails open when the pipeline response is malformed', async () => {
    const { createRateLimiter } = await loadLimiter({ upstash: true });
    (global.fetch ).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [{ error: 'WRONGTYPE' }],
    });
    const limiter = createRateLimiter({ name: 'pub', windowMs: 60000, maxRequests: 30 });

    expect(await limiter(request({ 'x-forwarded-for': '1.1.1.1' }))).toBeNull();
  });

  it('fails open when the network request throws', async () => {
    const { createRateLimiter } = await loadLimiter({ upstash: true });
    (global.fetch ).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const limiter = createRateLimiter({ name: 'pub', windowMs: 60000, maxRequests: 30 });

    expect(await limiter(request({ 'x-forwarded-for': '1.1.1.1' }))).toBeNull();
  });

  it('still enforces the limit through the in-memory fallback during an outage', async () => {
    // Failing open must not mean unlimited: the local counter still applies.
    const { createRateLimiter } = await loadLimiter({ upstash: true });
    (global.fetch ).mockRejectedValue(new Error('down'));
    const limiter = createRateLimiter({ name: 'pub', windowMs: 60000, maxRequests: 2 });
    const req = request({ 'x-forwarded-for': '7.7.7.7' });

    expect(await limiter(req)).toBeNull();
    expect(await limiter(req)).toBeNull();
    expect((await limiter(req)).status).toBe(429);
  });
});

describe('exported limiters and applyRateLimit', () => {
  it('exposes public and webhook limiters', async () => {
    const { publicEndpointLimiter, webhookLimiter } = await loadLimiter({ upstash: false });

    expect(typeof publicEndpointLimiter).toBe('function');
    expect(typeof webhookLimiter).toBe('function');
    expect(await publicEndpointLimiter(request({ 'x-forwarded-for': '8.8.8.8' }))).toBeNull();
  });

  it('applyRateLimit delegates to the supplied limiter', async () => {
    const { applyRateLimit } = await loadLimiter({ upstash: false });
    const limiter = jest.fn().mockResolvedValue(null);
    const req = request();

    await applyRateLimit(req, limiter);

    expect(limiter).toHaveBeenCalledWith(req);
  });
});

export {};
