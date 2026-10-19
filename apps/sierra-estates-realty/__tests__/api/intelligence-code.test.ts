import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/intelligence/code/route';

describe('/api/intelligence/code route contract & resilience', () => {
  describe('POST /api/intelligence/code', () => {
    it('generates a valid Sierra property code when compound and specs are provided', async () => {
      const req = new NextRequest('http://localhost/api/intelligence/code', {
        method: 'POST',
        body: JSON.stringify({
          compound: 'Mivida',
          rooms: 3,
          furnishingStatus: 'fully furnished',
          price: 75000,
          currency: 'EGP',
          features: ['garden'],
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.action).toBe('generate');
      expect(json.code).toBe('MVD-3F-75K+G');
      expect(json.metadata).toBeDefined();
      expect(json.metadata.locationCode).toBe('MVD');
    });

    it('rejects code generation without a compound or locationArea (§21 no-fabrication)', async () => {
      const req = new NextRequest('http://localhost/api/intelligence/code', {
        method: 'POST',
        body: JSON.stringify({
          rooms: 2,
          price: 50000,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('compound or locationArea is required');
    });

    it('parses a valid property code when action is parse', async () => {
      const req = new NextRequest('http://localhost/api/intelligence/code', {
        method: 'POST',
        body: JSON.stringify({
          action: 'parse',
          code: 'MVD-3F-75K+G',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.action).toBe('parse');
      expect(json.parsed).toEqual({
        location: 'MVD',
        rooms: 3,
        furnishingStatus: 'F',
        priceToken: '75K',
        features: ['G'],
      });
    });

    it('rejects parse action when code is missing', async () => {
      const req = new NextRequest('http://localhost/api/intelligence/code', {
        method: 'POST',
        body: JSON.stringify({
          action: 'parse',
          code: '',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Property code is required');
    });

    it('returns 422 error when code format cannot be parsed', async () => {
      const req = new NextRequest('http://localhost/api/intelligence/code', {
        method: 'POST',
        body: JSON.stringify({
          action: 'parse',
          code: 'INVALIDCODE',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid Sierra property code');
    });
  });

  describe('GET /api/intelligence/code', () => {
    it('returns 400 when code query parameter is missing', async () => {
      const req = new NextRequest('http://localhost/api/intelligence/code');
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Code parameter is required');
    });

    it('parses a valid code from query parameter', async () => {
      const code = 'MVD-3F-75K+G';
      const req = new NextRequest(`http://localhost/api/intelligence/code?code=${encodeURIComponent(code)}`);
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.code).toBe(code);
      expect(json.parsed.location).toBe('MVD');
      expect(json.parsed.rooms).toBe(3);
    });

    it('returns 422 when code query parameter is unparseable', async () => {
      const req = new NextRequest('http://localhost/api/intelligence/code?code=BAD');
      const res = await GET(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid Sierra property code');
    });
  });
});
