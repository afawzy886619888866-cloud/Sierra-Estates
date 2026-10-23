/**
 * Tests: lib/server/cors.ts
 *
 * The allowlist is what stops an arbitrary site reading credentialed `/api`
 * responses, so the negative cases matter as much as the positive ones: an
 * origin that is not on the list must get NO Access-Control-Allow-Origin at
 * all (rather than a wildcard, which the spec forbids with credentials).
 *
 * ALLOWED_ORIGINS is read on every call, not captured at import, so these
 * tests can set it directly without re-importing the module.
 */
import { allowedOrigins, isOriginAllowed, corsHeaders } from '../lib/server/cors';

const ORIGINAL = process.env.ALLOWED_ORIGINS;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ALLOWED_ORIGINS;
  else process.env.ALLOWED_ORIGINS = ORIGINAL;
});

describe('allowedOrigins', () => {
  it('parses a comma-separated list', () => {
    process.env.ALLOWED_ORIGINS = 'https://a.com,https://b.com';

    expect(allowedOrigins()).toEqual(['https://a.com', 'https://b.com']);
  });

  it('trims surrounding whitespace', () => {
    process.env.ALLOWED_ORIGINS = ' https://a.com ,  https://b.com  ';

    expect(allowedOrigins()).toEqual(['https://a.com', 'https://b.com']);
  });

  it('drops empty entries from trailing or doubled commas', () => {
    process.env.ALLOWED_ORIGINS = 'https://a.com,,https://b.com,';

    expect(allowedOrigins()).toEqual(['https://a.com', 'https://b.com']);
  });

  it('returns an empty list when the env var is unset', () => {
    delete process.env.ALLOWED_ORIGINS;

    expect(allowedOrigins()).toEqual([]);
  });

  it('returns an empty list when the env var is blank', () => {
    process.env.ALLOWED_ORIGINS = '   ';

    expect(allowedOrigins()).toEqual([]);
  });
});

describe('isOriginAllowed', () => {
  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = 'https://sierra-estates.net,http://localhost:3000';
  });

  it('accepts an allowlisted origin', () => {
    expect(isOriginAllowed('https://sierra-estates.net')).toBe(true);
    expect(isOriginAllowed('http://localhost:3000')).toBe(true);
  });

  it('rejects an origin that is not on the list', () => {
    expect(isOriginAllowed('https://evil.com')).toBe(false);
  });

  it('rejects null and empty origins', () => {
    expect(isOriginAllowed(null)).toBe(false);
    expect(isOriginAllowed('')).toBe(false);
  });

  it('matches exactly — no scheme, port or subdomain slack', () => {
    expect(isOriginAllowed('http://sierra-estates.net')).toBe(false);
    expect(isOriginAllowed('https://sierra-estates.net:443')).toBe(false);
    expect(isOriginAllowed('https://evil.sierra-estates.net')).toBe(false);
    expect(isOriginAllowed('https://sierra-estates.net.evil.com')).toBe(false);
  });
});

describe('corsHeaders', () => {
  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = 'https://sierra-estates.net';
  });

  it('always returns the non-origin headers', () => {
    const headers = corsHeaders(null);

    expect(headers['Access-Control-Allow-Methods']).toBe('GET,OPTIONS,PATCH,DELETE,POST,PUT');
    expect(headers['Access-Control-Max-Age']).toBe('86400');
    expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
    expect(headers['Access-Control-Allow-Headers']).toContain('X-SBR-SECRET-KEY');
  });

  it('reflects an allowlisted origin and enables credentials', () => {
    const headers = corsHeaders('https://sierra-estates.net');

    expect(headers['Access-Control-Allow-Origin']).toBe('https://sierra-estates.net');
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    expect(headers['Vary']).toBe('Origin');
  });

  it('omits the origin headers entirely for a non-allowlisted origin', () => {
    const headers = corsHeaders('https://evil.com');

    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
    expect(headers['Vary']).toBeUndefined();
  });

  it('never emits a wildcard origin, which is invalid with credentials', () => {
    process.env.ALLOWED_ORIGINS = '*';

    // Even a literal "*" in the allowlist only ever matches an origin of "*",
    // which no browser sends — so no reflection happens for a real origin.
    expect(corsHeaders('https://evil.com')['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('omits the origin headers when no allowlist is configured', () => {
    delete process.env.ALLOWED_ORIGINS;

    expect(corsHeaders('https://sierra-estates.net')['Access-Control-Allow-Origin']).toBeUndefined();
  });
});
