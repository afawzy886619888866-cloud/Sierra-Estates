'use strict';
/**
 * Lightweight Google API client for Sierra Estates workflows — ZERO dependencies.
 *
 * Replaces the `googleapis` package (~45 MB on disk, pulled into every build /
 * container image that installs workflows/package.json) with direct REST calls:
 *
 *   1. Service-account JWT (RS256) signed with node:crypto;
 *   2. JWT-bearer exchange for an OAuth2 access token (cached until expiry);
 *   3. fetch() against the Sheets v4 / Calendar v3 REST endpoints.
 *
 * The returned clients MIRROR the googleapis call shapes the workflows already
 * use, so call sites keep working unchanged:
 *
 *   const sheets = createSheets(creds);
 *   const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });   // res.data.values
 *   await sheets.spreadsheets.values.append({ spreadsheetId, range, valueInputOption, resource });
 *   await sheets.spreadsheets.values.update({ spreadsheetId, range, valueInputOption, resource });
 *   await sheets.spreadsheets.get({ spreadsheetId });                             // res.data.sheets
 *   await sheets.spreadsheets.batchUpdate({ spreadsheetId, resource });
 *
 *   const cal = createCalendar(creds);
 *   const res = await cal.events.insert({ calendarId, resource, sendUpdates: 'all' }); // res.data.id
 *
 * Request bodies are accepted as `resource` (googleapis classic style — what
 * every workflow here uses) or `requestBody` (googleapis modern style).
 * This mirrors the lightweight pattern of the in-app
 * apps/sierra-estates-realty/lib/services/GoogleSheetsV4Service.ts, minus the
 * googleapis dependency.
 */

const crypto = require('crypto');

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

/** Per-scope token cache ({scope → {token, expiryMs}}); credentials never change mid-boot. */
const tokenCache = new Map();

/** Test hook: clear the in-memory token cache. */
function resetTokenCacheForTests() {
  tokenCache.clear();
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

/**
 * Sign a service-account JWT (RS256) for the given scope.
 * Exported for offline verification in the test-suite (no network needed).
 */
function signJwt(creds, scope) {
  if (!creds || !creds.client_email || !creds.private_key) {
    throw new Error('[sheets-http] credentials must include client_email and private_key');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: creds.client_email,
    scope,
    aud: OAUTH_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    .sign(creds.private_key.replace(/\\n/g, '\n'));
  return `${signingInput}.${b64url(signature)}`;
}

/** Exchange the JWT for an access token (cached until 60 s before expiry). */
async function getAccessToken(creds, scope) {
  const cached = tokenCache.get(scope);
  if (cached && cached.expiryMs > Date.now() + 60_000) return cached.token;

  const assertion = signJwt(creds, scope);
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    const body = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`[sheets-http] OAuth token exchange failed (HTTP ${res.status}): ${body}`);
  }
  const json = await res.json();
  if (!json.access_token) {
    throw new Error('[sheets-http] OAuth token exchange returned no access_token');
  }
  const ttlSeconds = Number(json.expires_in) || 3600;
  tokenCache.set(scope, {
    token: json.access_token,
    expiryMs: Date.now() + (ttlSeconds - 60) * 1000,
  });
  return tokenCache.get(scope).token;
}

/**
 * Execute one Google REST call and return a googleapis-shaped response
 * (`{ data, status, statusText }` — callers use `res.data.*`).
 */
async function googleApiFetch(creds, scope, method, url, body) {
  const token = await getAccessToken(creds, scope);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      data = { raw: text.slice(0, 500) };
    }
  }
  if (!res.ok) {
    const message = (data && (data.error && data.error.message || data.error)) || text.slice(0, 300);
    const error = new Error(`[sheets-http] Google API ${method} ${url} failed (HTTP ${res.status}): ${message}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return { data, status: res.status, statusText: res.statusText };
}

/** Extra params (valueInputOption, insertDataOption, sendUpdates, …) → querystring. */
function buildQuery(opts) {
  const QUERY_KEYS = ['valueInputOption', 'insertDataOption', 'sendUpdates', 'fields'];
  const params = new URLSearchParams();
  for (const key of QUERY_KEYS) {
    if (opts[key] !== undefined && opts[key] !== null) params.set(key, String(opts[key]));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Accept `resource` (classic) or `requestBody` (modern) — googleapis parity. */
function extractBody(opts) {
  return opts.resource !== undefined ? opts.resource : opts.requestBody;
}

/**
 * Sheets v4 client with the googleapis call shapes used across workflows/.
 */
function createSheets(creds) {
  const spreadsheets = {
    /** spreadsheets.get — metadata (tabs, headers). */
    async get({ spreadsheetId }) {
      return googleApiFetch(creds, SHEETS_SCOPE, 'GET', `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`);
    },
    /** spreadsheets.batchUpdate — addSheet etc. */
    async batchUpdate({ spreadsheetId, resource, requestBody }) {
      return googleApiFetch(
        creds,
        SHEETS_SCOPE,
        'POST',
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/:batchUpdate`,
        resource !== undefined ? resource : requestBody,
      );
    },
    values: {
      /** values.get → res.data.values */
      async get({ spreadsheetId, range }) {
        return googleApiFetch(
          creds,
          SHEETS_SCOPE,
          'GET',
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
        );
      },
      /** values.update → res.data.updatedCells etc. */
      async update({ spreadsheetId, range, resource, requestBody, ...query }) {
        return googleApiFetch(
          creds,
          SHEETS_SCOPE,
          'PUT',
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}${buildQuery(query)}`,
          resource !== undefined ? resource : requestBody,
        );
      },
      /** values.append → res.data.updates / res.data.tableRange */
      async append({ spreadsheetId, range, resource, requestBody, ...query }) {
        return googleApiFetch(
          creds,
          SHEETS_SCOPE,
          'POST',
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append${buildQuery(query)}`,
          resource !== undefined ? resource : requestBody,
        );
      },
    },
  };
  return { spreadsheets, _api: 'sheets-http (zero-dep)' };
}

/** Calendar v3 client (events.insert is the only shape a workflow uses today). */
function createCalendar(creds) {
  return {
    events: {
      async insert({ calendarId, resource, requestBody, ...query }) {
        const id = encodeURIComponent(calendarId || 'primary');
        return googleApiFetch(
          creds,
          CALENDAR_SCOPE,
          'POST',
          `https://www.googleapis.com/calendar/v3/calendars/${id}/events${buildQuery(query)}`,
          resource !== undefined ? resource : requestBody,
        );
      },
    },
    _api: 'sheets-http (zero-dep)',
  };
}

module.exports = {
  OAUTH_TOKEN_URL,
  SHEETS_SCOPE,
  CALENDAR_SCOPE,
  signJwt,
  getAccessToken,
  resetTokenCacheForTests,
  createSheets,
  createCalendar,
};
