import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as crypto from 'crypto';
import {
  signJwt,
  getAccessToken,
  resetTokenCacheForTests,
  createSheets,
  createCalendar,
} from '../lib/sheets-http';

/**
 * Offline contract tests for the zero-dependency Google client
 * (workflows/lib/sheets-http.js) that replaced the googleapis package.
 * Everything runs against a locally generated RSA keypair and a stubbed
 * global fetch — no network access required.
 */

function makeTestCredentials() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    client_email: 'sa@sierra-estates-test.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    public_key_pem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

describe('workflows/lib/sheets-http (zero-dep Google client)', () => {
  const creds = makeTestCredentials();

  describe('signJwt', () => {
    it('produces a verifiable RS256 JWT with the service-account claims', () => {
      const jwt = signJwt(creds, 'https://www.googleapis.com/auth/spreadsheets');
      const [h64, p64, s64] = jwt.split('.');
      expect(h64 && p64 && s64).toBeTruthy();

      const header = JSON.parse(Buffer.from(h64, 'base64url').toString('utf8'));
      const payload = JSON.parse(Buffer.from(p64, 'base64url').toString('utf8'));
      expect(header).toEqual({ alg: 'RS256', typ: 'JWT' });
      expect(payload.iss).toBe(creds.client_email);
      expect(payload.scope).toBe('https://www.googleapis.com/auth/spreadsheets');
      expect(payload.aud).toBe('https://oauth2.googleapis.com/token');
      expect(payload.exp - payload.iat).toBe(3600);

      const verified = crypto
        .createVerify('RSA-SHA256')
        .update(`${h64}.${p64}`)
        .verify(creds.public_key_pem, Buffer.from(s64, 'base64url'));
      expect(verified).toBe(true);
    });

    it('rejects credentials without client_email/private_key', () => {
      expect(() => signJwt({} as any, 'scope')).toThrow(/client_email and private_key/);
    });
  });

  describe('getAccessToken', () => {
    let fetchCalls: Array<{ url: string; init: RequestInit | undefined }>;
    const realFetch = globalThis.fetch;

    beforeEach(() => {
      resetTokenCacheForTests();
      fetchCalls = [];
      globalThis.fetch = (async (url: any, init: any) => {
        fetchCalls.push({ url: String(url), init });
        return new Response(
          JSON.stringify({ access_token: 'ya29.test-token', expires_in: 3600, token_type: 'Bearer' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }) as any;
    });

    afterEach(() => {
      globalThis.fetch = realFetch;
      resetTokenCacheForTests();
    });

    it('exchanges the JWT bearer for a token, then serves subsequent scopes/calls from cache', async () => {
      const token1 = await getAccessToken(creds, 'https://www.googleapis.com/auth/spreadsheets');
      expect(token1).toBe('ya29.test-token');
      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0].url).toBe('https://oauth2.googleapis.com/token');

      const body = String(fetchCalls[0].init?.body ?? '');
      expect(body).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer');
      expect(body).toContain('assertion=');

      // Cached: no second network call for the same scope.
      const token2 = await getAccessToken(creds, 'https://www.googleapis.com/auth/spreadsheets');
      expect(token2).toBe('ya29.test-token');
      expect(fetchCalls).toHaveLength(1);
    });

    it('throws an honest error when the token endpoint rejects the assertion', async () => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })) as any;
      await expect(
        getAccessToken(creds, 'https://www.googleapis.com/auth/spreadsheets'),
      ).rejects.toThrow(/token exchange failed \(HTTP 400\)/);
    });
  });

  describe('createSheets — googleapis call-shape parity', () => {
    let requests: Array<{ method: string; url: string; body: any }>;
    const realFetch = globalThis.fetch;

    beforeEach(() => {
      resetTokenCacheForTests();
      requests = [];
      globalThis.fetch = (async (url: any, init: any) => {
        // Token exchange (OAuth) posts urlencoded form data; API calls post JSON.
        let parsedBody: any = null;
        if (init?.body) {
          const raw = String(init.body);
          parsedBody = raw.startsWith('{') ? JSON.parse(raw) : raw;
        }
        // Record API calls only (the OAuth token exchange is asserted separately above).
        if (!String(url).includes('oauth2.googleapis.com/token')) {
          requests.push({ method: String(init?.method ?? 'GET'), url: String(url), body: parsedBody });
        }
        // Token exchange → access_token payload; API calls → generic JSON response.
        const payload = String(url).includes('oauth2.googleapis.com/token')
          ? { access_token: 'ya29.test-token', expires_in: 3600, token_type: 'Bearer' }
          : { ok: true, values: [['a', 'b']] };
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as any;
    });

    afterEach(() => {
      globalThis.fetch = realFetch;
      resetTokenCacheForTests();
    });

    it('values.get hits the v4 REST endpoint with the encoded range and returns res.data', async () => {
      const sheets = createSheets(creds);
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: 'SS_ID',
        range: 'Master_Inventory!A1:Z99',
      });
      expect(res.data.values).toEqual([['a', 'b']]);
      expect(requests[0].method).toBe('GET');
      expect(requests[0].url).toBe(
        'https://sheets.googleapis.com/v4/spreadsheets/SS_ID/values/Master_Inventory!A1%3AZ99',
      );
    });

    it('values.append accepts classic `resource` style and forwards query options', async () => {
      const sheets = createSheets(creds);
      await sheets.spreadsheets.values.append({
        spreadsheetId: 'SS_ID',
        range: 'Inbox!A1',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [['x']] },
      });
      expect(requests[0].method).toBe('POST');
      expect(requests[0].url).toContain('/values/Inbox!A1:append');
      expect(requests[0].url).toContain('valueInputOption=USER_ENTERED');
      expect(requests[0].url).toContain('insertDataOption=INSERT_ROWS');
      expect(requests[0].body).toEqual({ values: [['x']] });
    });

    it('values.update and batchUpdate accept modern `requestBody` style too', async () => {
      const sheets = createSheets(creds);
      await sheets.spreadsheets.values.update({
        spreadsheetId: 'SS_ID',
        range: 'Tab!A1',
        valueInputOption: 'RAW',
        requestBody: { values: [['status']] },
      });
      expect(requests[0].method).toBe('PUT');
      expect(requests[0].body).toEqual({ values: [['status']] });

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: 'SS_ID',
        requestBody: { requests: [{ addSheet: { properties: { title: 'New Tab' } } }] },
      });
      expect(requests[1].method).toBe('POST');
      expect(requests[1].url).toContain('/:batchUpdate');
    });

    it('spreadsheets.get returns metadata and API errors surface with HTTP status', async () => {
      const sheets = createSheets(creds);
      await sheets.spreadsheets.get({ spreadsheetId: 'SS_ID' });
      expect(requests[0].url).toBe('https://sheets.googleapis.com/v4/spreadsheets/SS_ID');

      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ error: { message: 'Requested entity was not found.' } }), {
          status: 404,
        })) as any;
      await expect(sheets.spreadsheets.get({ spreadsheetId: 'NOPE' })).rejects.toThrow(
        /HTTP 404.*Requested entity was not found/s,
      );
    });
  });

  describe('createCalendar — events.insert parity', () => {
    it('posts the event resource with the calendar scope and query options', async () => {
      const realFetch = globalThis.fetch;
      resetTokenCacheForTests();
      const requests: Array<{ method: string; url: string; body: any }> = [];
      globalThis.fetch = (async (url: any, init: any) => {
        let parsedBody: any = null;
        if (init?.body) {
          const raw = String(init.body);
          parsedBody = raw.startsWith('{') ? JSON.parse(raw) : raw;
        }
        if (!String(url).includes('oauth2.googleapis.com/token')) {
          requests.push({ method: String(init?.method ?? 'GET'), url: String(url), body: parsedBody });
        }
        const payload = String(url).includes('oauth2.googleapis.com/token')
          ? { access_token: 'ya29.test-token', expires_in: 3600, token_type: 'Bearer' }
          : { id: 'evt_1', htmlLink: 'https://cal.link/evt_1' };
        return new Response(JSON.stringify(payload), { status: 200 }) as any;
      }) as any;
      try {
        const cal = createCalendar(creds);
        const res = await cal.events.insert({
          calendarId: 'bookings@sierra-estates.net',
          resource: { summary: 'Viewing — SE-101' },
          sendUpdates: 'all',
        });
        expect(res.data.id).toBe('evt_1');
        expect(requests[0].method).toBe('POST');
        expect(requests[0].url).toBe(
          'https://www.googleapis.com/calendar/v3/calendars/bookings%40sierra-estates.net/events?sendUpdates=all',
        );
        expect(requests[0].body).toEqual({ summary: 'Viewing — SE-101' });
      } finally {
        globalThis.fetch = realFetch;
        resetTokenCacheForTests();
      }
    });
  });
});
