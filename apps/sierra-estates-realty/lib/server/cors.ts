/**
 * CORS allowlist for the Sierra Estates API.
 *
 * The Sierra Estates frontend lives in its own repo / Vercel project and
 * consumes these `/api` routes cross-origin. Because requests are made with
 * credentials (Firebase ID tokens, cookies), the spec forbids a wildcard
 * `*` origin — the allowed origin must be explicit and reflected back. We
 * therefore read an allowlist from the `ALLOWED_ORIGINS` env var
 * (comma-separated) and echo the request `Origin` only when it is on the list.
 *
 * Example:
 *   ALLOWED_ORIGINS="https://sierraestates.luxury,https://app.sierraestates.luxury,http://localhost:3000"
 *
 * Edge-safe: pure string/Headers logic, no Node APIs — importable from
 * `middleware.ts` (Edge runtime) as well as route handlers.
 */

const ALLOWED_METHODS = 'GET,OPTIONS,PATCH,DELETE,POST,PUT';

const ALLOWED_HEADERS = [
  'X-CSRF-Token',
  'X-Requested-With',
  'Accept',
  'Accept-Version',
  'Content-Length',
  'Content-MD5',
  'Content-Type',
  'Date',
  'X-Api-Version',
  'X-SBR-SECRET-KEY',
  'Authorization',
].join(', ');

/** Parsed allowlist from `ALLOWED_ORIGINS` (comma-separated, trimmed). */
export function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/** True when the request origin is present on the allowlist. */
export function isOriginAllowed(origin: string | null): origin is string {
  return !!origin && allowedOrigins().includes(origin);
}

/**
 * Build the CORS header set for a request origin. An allowlisted origin is
 * reflected back with credentials enabled; otherwise only the non-origin
 * headers are returned and the browser blocks the cross-origin read.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': '86400',
  };

  if (isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Vary'] = 'Origin';
  }

  return headers;
}
