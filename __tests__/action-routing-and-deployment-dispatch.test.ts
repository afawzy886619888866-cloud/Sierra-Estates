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
    it('all Vercel cron triggers map to implemented Next.js routes', () => {
      const vercelJsonPath = path.join(ROOT_DIR, 'vercel.json');
      const config = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'));
      expect(config.crons).toBeDefined();

      for (const cron of config.crons) {
        const routeRelPath = cron.path.replace(/^\/api\//, '');
        const expectedFile = path.join(
          CLIENT_APP_DIR,
          'app',
          'api',
          ...routeRelPath.split('/'),
          'route.ts'
        );
        expect(
          fs.existsSync(expectedFile),
          `Cron route ${cron.path} must exist at ${expectedFile}`
        ).toBe(true);

        const routeContent = fs.readFileSync(expectedFile, 'utf-8');
        expect(
          routeContent.includes('CRON_SECRET') || routeContent.includes('verifyAdminRequest') || routeContent.includes('auth'),
          `Cron endpoint ${cron.path} must verify authorization`
        ).toBe(true);
      }
    });

    it('automations worker package exists and isolates background jobs', () => {
      const autoPkg = path.join(AUTOMATIONS_DIR, 'package.json');
      expect(fs.existsSync(autoPkg)).toBe(true);
    });
  });

  // ==========================================================================
  // 6. Vercel Project Matrix & Deployment Routing
  // ==========================================================================
  describe('6. Vercel Project Matrix & Deployment Dispatch', () => {
    it('sync-vercel-env.js targets exact Client and Admin project IDs', () => {
      const syncScriptPath = path.join(ROOT_DIR, 'scripts', 'sync-vercel-env.js');
      expect(fs.existsSync(syncScriptPath)).toBe(true);
      const content = fs.readFileSync(syncScriptPath, 'utf-8');

      expect(content).toContain('prj_ieVcIcoeTtHndspXMzlE0cwLl89c'); // Client
      expect(content).toContain('prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA'); // Admin
      expect(content).toContain('SUPABASE_PROPERTY_MEDIA_BUCKET');
      expect(content).toContain('SUPABASE_MEDIA_BUCKET');
    });

    it('.vercelignore excludes local cache bloat to protect upload quotas', () => {
      const vercelIgnorePath = path.join(ROOT_DIR, '.vercelignore');
      expect(fs.existsSync(vercelIgnorePath)).toBe(true);
      const content = fs.readFileSync(vercelIgnorePath, 'utf-8');

      expect(content).toContain('.amazonq');
      expect(content).toContain('SE-Vercel-deploy-main*');
      expect(content).toContain('.reports/**');
      expect(content).toContain('libArchive/**');
      expect(content).toContain('stubArchive/**');
    });
  });
});
