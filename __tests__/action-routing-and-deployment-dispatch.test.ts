import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Architectural Action Routing & Deployment Dispatch Test Suite
 * 
 * Verifies that any change, fix, or feature in Sierra Estates routes
 * strictly to its designated target:
 * - Client Website / Design -> apps/sierra-estates-realty (sierra-estates-client-portal)
 * - Admin Portal / Back-office -> apps/sierra-estates-realty/app/admin & apps/admin-dashboard
 * - Database Schema / Data -> supabase/schema.sql & packages/db (Supabase exclusive)
 * - Automations & Workers -> apps/automations & infra/
 * - Storage & Assets -> Supabase Storage (property-media / media)
 */
describe('Action Routing & Deployment Dispatch Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const CLIENT_APP_DIR = path.join(ROOT_DIR, 'apps', 'sierra-estates-realty');
  const ADMIN_APP_DIR = path.join(ROOT_DIR, 'apps', 'admin-dashboard');
  const SUPABASE_DIR = path.join(ROOT_DIR, 'supabase');
  const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
  const AUTOMATIONS_DIR = path.join(ROOT_DIR, 'apps', 'automations');

  // ==========================================================================
  // 1. Client Website / Design Dispatch
  // ==========================================================================
  describe('1. Client Website & UI Design Dispatch', () => {
    it('Client app exists with canonical package name sierra-estates-client-page', () => {
      const pkgPath = path.join(CLIENT_APP_DIR, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      expect(pkg.name).toBe('sierra-estates-client-page');
    });

    it('Client design tokens and global styles reside strictly in apps/sierra-estates-realty', () => {
      const globalsCss = path.join(CLIENT_APP_DIR, 'app', 'globals.css');
      expect(fs.existsSync(globalsCss)).toBe(true);
      const cssContent = fs.readFileSync(globalsCss, 'utf-8');
      expect(cssContent).toContain('var(--pri)');
      expect(cssContent).toContain('var(--surface)');
    });

    it('Client pages must not expose SUPABASE_SERVICE_ROLE_KEY to the browser', () => {
      const componentsDir = path.join(CLIENT_APP_DIR, 'components');
      function checkClientDirectory(dir: string) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            checkClientDirectory(fullPath);
          } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes('"use client"') || content.includes("'use client'")) {
              expect(
                content.includes('process.env.SUPABASE_SERVICE_ROLE_KEY'),
                `Client component ${entry.name} must never reference SUPABASE_SERVICE_ROLE_KEY`
              ).toBe(false);
            }
          }
        }
      }
      checkClientDirectory(componentsDir);
    });
  });

  // ==========================================================================
  // 2. Admin Portal & Governance Dispatch
  // ==========================================================================
  describe('2. Admin Portal & Management Dispatch', () => {
    it('Admin portal routes exist in apps/sierra-estates-realty/app/admin', () => {
      const adminDir = path.join(CLIENT_APP_DIR, 'app', 'admin');
      expect(fs.existsSync(adminDir)).toBe(true);
    });

    it('Admin API routes strictly enforce authentication guard', () => {
      const adminApiDir = path.join(CLIENT_APP_DIR, 'app', 'api', 'admin');
      expect(fs.existsSync(adminApiDir)).toBe(true);

      function checkAdminRoutes(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            checkAdminRoutes(fullPath);
          } else if (entry.name === 'route.ts') {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const hasAuthCheck =
              content.includes('verifyAdminRequest') ||
              content.includes('auth-guard') ||
              content.includes('session') ||
              content.includes('requireAdmin') ||
              content.includes('requireRole');
            expect(
              hasAuthCheck,
              `Admin route ${fullPath} must guard requests with authentication`
            ).toBe(true);
          }
        }
      }
      checkAdminRoutes(adminApiDir);
    });
  });

  // ==========================================================================
  // 3. Database Schema & Supabase Exclusivity Dispatch
  // ==========================================================================
  describe('3. Database & Supabase Backend Dispatch', () => {
    it('supabase/schema.sql is the single authoritative master schema', () => {
      const masterSchemaPath = path.join(SUPABASE_DIR, 'schema.sql');
      expect(fs.existsSync(masterSchemaPath)).toBe(true);
      const content = fs.readFileSync(masterSchemaPath, 'utf-8');

      // Must contain core production definitions
      expect(content).toContain('CREATE TABLE IF NOT EXISTS public.listings');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS public.profiles');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS public.leads');
      expect(content).toContain('vector'); // pgvector
      expect(content).toContain('postgis'); // postgis
    });

    it('packages/db exports authoritative Supabase access helpers', () => {
      const dbPackagePath = path.join(PACKAGES_DIR, 'db');
      expect(fs.existsSync(dbPackagePath)).toBe(true);

      const recordsPath = path.join(dbPackagePath, 'lib', 'records.ts');
      expect(fs.existsSync(recordsPath)).toBe(true);
      const recordsContent = fs.readFileSync(recordsPath, 'utf-8');
      expect(recordsContent).toContain('listRecords');
      expect(recordsContent).toContain('insertRecord');
      expect(recordsContent).toContain('updateRecord');
      expect(recordsContent).toContain('deleteRecord');
      expect(recordsContent).toContain('assertCanonicalBackendForWrites');
    });

    it('forbids Firestore writes in active Supabase records layer', () => {
      const recordsPath = path.join(PACKAGES_DIR, 'db', 'lib', 'records.ts');
      const recordsContent = fs.readFileSync(recordsPath, 'utf-8');
      expect(recordsContent).not.toContain("from 'firebase-admin/firestore'");
      expect(recordsContent).not.toContain("from 'firebase/firestore'");
    });
  });

  // ==========================================================================
  // 4. Storage & Media Bucket Dispatch
  // ==========================================================================
  describe('4. Storage & Asset Pipeline Dispatch', () => {
    it('StorageService uploads to property-media and strips data URI headers', () => {
      const storageServicePath = path.join(
        CLIENT_APP_DIR,
        'lib',
        'services',
        'StorageService.ts'
      );
      expect(fs.existsSync(storageServicePath)).toBe(true);
      const content = fs.readFileSync(storageServicePath, 'utf-8');
      expect(content).toContain('PROPERTY_MEDIA_BUCKET');
      expect(content).toContain('replace(/^data:[^;]+;base64,/, \'\')');
      expect(content).toContain('getSupabaseAdmin');
    });

    it('Admin media upload route targets media bucket and enforces privacy', () => {
      const mediaUploadRoute = path.join(
        CLIENT_APP_DIR,
        'app',
        'api',
        'admin',
        'media',
        'upload',
        'route.ts'
      );
      expect(fs.existsSync(mediaUploadRoute)).toBe(true);
      const content = fs.readFileSync(mediaUploadRoute, 'utf-8');
      expect(content).toContain('MEDIA_BUCKET');
      expect(content).toContain('createSignedUrl');
    });
  });

  // ==========================================================================
  // 5. Automations, Background Workers & Cron Dispatch
  // ==========================================================================
  describe('5. Automations & Cron Dispatch', () => {
    it('all GitHub Actions cron schedules map to the implemented, auth-gated dispatcher route', () => {
      // 2026-11: the Vercel cron fallback windows are retired with
      // vercel.json; scheduling lives in automations.yml, which calls the
      // Phase 11 dispatcher for each window/job target with Bearer CRON_SECRET.
      const wfPath = path.join(ROOT_DIR, '.github', 'workflows', 'automations.yml');
      const wf = fs.readFileSync(wfPath, 'utf-8');
      expect(wf).toContain('SITE_URL: https://sierra-estates.net');
      expect(wf).toContain('CRON_SECRET: ${{ secrets.CRON_SECRET }}');
      expect(wf).toContain('/api/cron/dispatch/');

      const targets = ['whatsapp-dispatch', 'lead-timers', 'check-availability-sla', 'night', 'morning', 'sync-leads'];
      for (const target of targets) {
        expect(
          wf.includes(target),
          `schedule mapping for '${target}' must exist in automations.yml`
        ).toBe(true);
      }

      const dispatchRoute = path.join(CLIENT_APP_DIR, 'app', 'api', 'cron', 'dispatch', '[job]', 'route.ts');
      expect(fs.existsSync(dispatchRoute), 'the /api/cron/dispatch/[job] dispatcher route must exist').toBe(true);
      const routeContent = fs.readFileSync(dispatchRoute, 'utf-8');
      expect(routeContent).toContain('verifyCronRequest');
      expect(routeContent).toContain('CRON_SECRET');
    });

    it('automations worker package exists and isolates background jobs', () => {
      const autoPkg = path.join(AUTOMATIONS_DIR, 'package.json');
      expect(fs.existsSync(autoPkg)).toBe(true);
    });
  });

  // ==========================================================================
  // 6. Cloudflare Deployment Matrix & Routing
  // ==========================================================================
  describe('6. Cloudflare Deployment Matrix & Routing', () => {
    it('deploy-cloudflare.yml deploys the unified sierra-estates worker to both hostnames', () => {
      // 2026-11-19 (Lane A): ONE unified worker serves all hostnames via
      // host-based rewrites; worker creation is locked (ALLOW_CREATE_NEW_WORKER).
      const wfPath = path.join(ROOT_DIR, '.github', 'workflows', 'deploy-cloudflare.yml');
      const wf = fs.readFileSync(wfPath, 'utf-8');

      expect(wf).toContain('OpenNext deploy · sierra-estates');
      expect(wf).toContain('npx wrangler deploy --name "$CF_WORKER_NAME"');
      for (const host of ['sierra-estates.net', 'admin.sierra-estates.net']) {
        expect(wf.includes(host), `hostname ${host} must be verified by the deploy workflow`).toBe(true);
      }
      expect(wf).toContain('ALLOW_CREATE_NEW_WORKER');
      expect(wf).toContain('npx wrangler secret bulk');
    });

    it('legacy static portal ships a prepared (not yet wired) Workers Assets config', () => {
      // Hosting for deploy/ is a Lane A decision (single-worker lock). The
      // config + converted headers are ready for a second static worker or
      // public/ ingestion; nothing in the unified workflow references them yet.
      const wranglerPath = path.join(ROOT_DIR, 'deploy', 'wrangler.jsonc');
      expect(fs.existsSync(wranglerPath)).toBe(true);
      const conf = JSON.parse(
        fs.readFileSync(wranglerPath, 'utf-8').replace(/^\s*\/\/.*$/gm, '')
      );
      expect(conf.name).toBe('sierra-estates-legacy');
      expect(conf.assets?.directory).toBe('.');

      const headersPath = path.join(ROOT_DIR, 'deploy', '_headers');
      expect(fs.existsSync(headersPath)).toBe(true);
      const headers = fs.readFileSync(headersPath, 'utf-8');
      expect(headers).toContain('/admin/*');
      expect(headers).toContain('X-Robots-Tag');

      const wf = fs.readFileSync(path.join(ROOT_DIR, '.github', 'workflows', 'deploy-cloudflare.yml'), 'utf-8');
      expect(wf.includes('sierra-estates-legacy'), 'prepared legacy config must NOT be wired into the unified workflow').toBe(false);
    });
  });
});
