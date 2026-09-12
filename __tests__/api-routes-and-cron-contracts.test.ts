import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { verifyCronRequest } from '../apps/sierra-estates-realty/lib/server/cron-auth';
import { safeEqual, isAdminEmail, parseCookies, tryDemoLogin } from '../apps/sierra-estates-realty/lib/auth';

describe('API Routes, Cron Jobs & Server Auth Contracts Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const API_DIR = path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'app', 'api');

  describe('Cron Authentication Gate (`lib/server/cron-auth.ts`)', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('rejects with 401 when authorization header is missing or incorrect', async () => {
      process.env.CRON_SECRET = 'super-secret-cron-token';
      const fakeReq = new Request('http://localhost:3000/api/cron/whatsapp-dispatch', {
        headers: { authorization: 'Bearer wrong-token' },
      });

      const response = verifyCronRequest(fakeReq);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(401);
      const data = await response?.json();
      expect(data?.error).toBe('Unauthorized');
    });

    it('permits the request when authorization header matches Bearer token', () => {
      process.env.CRON_SECRET = 'super-secret-cron-token';
      const fakeReq = new Request('http://localhost:3000/api/cron/whatsapp-dispatch', {
        headers: { authorization: 'Bearer super-secret-cron-token' },
      });

      const response = verifyCronRequest(fakeReq);
      expect(response).toBeNull();
    });

    it('fails closed with 503 in production when CRON_SECRET is not configured', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CRON_SECRET;

      const fakeReq = new Request('http://localhost:3000/api/cron/whatsapp-dispatch');
      const response = verifyCronRequest(fakeReq);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(503);
      const data = await response?.json();
      expect(data?.error).toMatch(/Cron is not configured/i);
    });

    it('permits unauthenticated requests in development when CRON_SECRET is not configured', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.CRON_SECRET;

      const fakeReq = new Request('http://localhost:3000/api/cron/whatsapp-dispatch');
      const response = verifyCronRequest(fakeReq);
      expect(response).toBeNull();
    });
  });

  describe('Server Auth & Cryptographic Helpers (`lib/auth.ts`)', () => {
    it('safeEqual performs constant-time comparison on matching and non-matching strings', () => {
      expect(safeEqual('abc', 'abc')).toBe(true);
      expect(safeEqual('secret-key-123', 'secret-key-123')).toBe(true);
      expect(safeEqual('abc', 'abd')).toBe(false);
      expect(safeEqual('short', 'much-longer-string')).toBe(false);
      expect(safeEqual('', '')).toBe(true);
      expect(safeEqual('a', '')).toBe(false);
    });

    it('isAdminEmail correctly identifies authorized admin and staff emails', () => {
      expect(isAdminEmail('admin@sierra-estates.net')).toBe(true);
      expect(isAdminEmail('sierra@sierra-estates.net')).toBe(true);
      expect(isAdminEmail('a.fawzy8866@gmail.com')).toBe(true);
      expect(isAdminEmail('executive@sierra-estates.net')).toBe(true);
      expect(isAdminEmail('agent@sierra.com')).toBe(true);

      expect(isAdminEmail('random-user@yahoo.com')).toBe(false);
      expect(isAdminEmail('competitor@gmail.com')).toBe(false);
      expect(isAdminEmail('')).toBe(false);
    });

    it('parseCookies correctly extracts cookie pairs from header string', () => {
      const header = 'sierra_sess=abc123token; theme=dark; analytics_consent=true';
      const cookies = parseCookies(header);
      expect(cookies.sierra_sess).toBe('abc123token');
      expect(cookies.theme).toBe('dark');
      expect(cookies.analytics_consent).toBe('true');
      expect(parseCookies(null)).toEqual({});
    });

    it('parseCookies gracefully handles malformed percent-encoded cookies without throwing', () => {
      const header = 'sierra_sess=%E0%A4%A; broken=%80; valid=ok%20val';
      const cookies = parseCookies(header);
      expect(cookies.valid).toBe('ok val');
      expect(cookies.sierra_sess).toBe('%E0%A4%A');
      expect(cookies.broken).toBe('%80');
    });

    it('tryDemoLogin enforces configured password and admin email requirement', () => {
      const originalPass = process.env.ADMIN_BOOTSTRAP_PASSWORD;
      process.env.ADMIN_BOOTSTRAP_PASSWORD = 'DemoAdminSecurePassword2026!';

      const validSession = tryDemoLogin('admin@sierra-estates.net', 'DemoAdminSecurePassword2026!');
      expect(validSession).not.toBeNull();
      expect(validSession?.role).toBe('admin');
      expect(validSession?.email).toBe('admin@sierra-estates.net');

      const wrongPass = tryDemoLogin('admin@sierra-estates.net', 'WrongPassword');
      expect(wrongPass).toBeNull();

      const nonAdminEmail = tryDemoLogin('hacker@evil.com', 'DemoAdminSecurePassword2026!');
      expect(nonAdminEmail).toBeNull();

      process.env.ADMIN_BOOTSTRAP_PASSWORD = originalPass;
    });
  });

  describe('Cron Job Routes Existence & Contracts', () => {
    const cronJobs = [
      'ingest-from-sheets',
      'maintenance',
      'sync-leads',
      'sync-listings',
      'sync-master-sheet',
      'whatsapp-dispatch',
    ];

    for (const cron of cronJobs) {
      it(`verifies cron route exists: /api/cron/${cron}`, () => {
        const routePath = path.join(API_DIR, 'cron', cron, 'route.ts');
        expect(fs.existsSync(routePath)).toBe(true);
        const code = fs.readFileSync(routePath, 'utf-8');
        expect(code).toMatch(/export async function (GET|POST)/);
      });
    }

    it('verifies whatsapp-dispatch cron specifies maxDuration = 60 for Vercel execution', () => {
      const routePath = path.join(API_DIR, 'cron', 'whatsapp-dispatch', 'route.ts');
      const code = fs.readFileSync(routePath, 'utf-8');
      expect(code).toContain('export const maxDuration = 60');
      expect(code).toContain('verifyCronRequest');
      expect(code).toContain('whatsapp_queue');
    });
  });

  describe('Core API Endpoints Contract Verification', () => {
    const coreRoutes = [
      { name: 'health', route: path.join(API_DIR, 'health', 'route.ts') },
      { name: 'inquiries', route: path.join(API_DIR, 'inquiries', 'route.ts') },
      { name: 'listings', route: path.join(API_DIR, 'listings', 'route.ts') },
      { name: 'leads', route: path.join(API_DIR, 'leads', 'route.ts') },
      { name: 'valuation/analyze', route: path.join(API_DIR, 'valuation', 'analyze', 'route.ts') },
      { name: 'whatsapp-webhook', route: path.join(API_DIR, 'webhooks', 'whatsapp', 'route.ts') },
      { name: 'telegram-webhook', route: path.join(API_DIR, 'webhooks', 'telegram', 'route.ts') },
    ];

    for (const endpoint of coreRoutes) {
      it(`verifies core API endpoint exists and exports HTTP handlers: /api/${endpoint.name}`, () => {
        expect(fs.existsSync(endpoint.route)).toBe(true);
        const code = fs.readFileSync(endpoint.route, 'utf-8');
        expect(code).toMatch(/export async function (GET|POST|PUT|DELETE|PATCH)/);
      });
    }

    it('verifies /api/health checks Supabase status and returns json', () => {
      const healthCode = fs.readFileSync(path.join(API_DIR, 'health', 'route.ts'), 'utf-8');
      expect(healthCode).toContain('getSupabase');
      expect(healthCode).toContain('supabaseReady');
      expect(healthCode).toContain('sierra-estates-intelligence-os');
    });
  });
});
