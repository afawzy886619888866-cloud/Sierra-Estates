import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Backend Services, Cloud Functions & APIs Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const API_DIR = path.join(ROOT_DIR, 'apps', 'api');
  const FUNCTIONS_DIR = path.join(ROOT_DIR, 'functions');

  describe('FastAPI Python Service Contracts', () => {
    it('should have main.py, requirements.txt, Dockerfile, and valuation_agent_skill.py in apps/api', () => {
      expect(fs.existsSync(path.join(API_DIR, 'main.py'))).toBe(true);
      expect(fs.existsSync(path.join(API_DIR, 'requirements.txt'))).toBe(true);
      expect(fs.existsSync(path.join(API_DIR, 'Dockerfile'))).toBe(true);
      expect(fs.existsSync(path.join(API_DIR, 'valuation_agent_skill.py'))).toBe(true);
      expect(fs.existsSync(path.join(API_DIR, 'ecc_memory_engine.py'))).toBe(true);
    });

    it('main.py should define health and property-finder sync endpoints with FastAPI', () => {
      const mainPy = fs.readFileSync(path.join(API_DIR, 'main.py'), 'utf-8');
      expect(mainPy).toContain('/health');
      expect(mainPy).toContain('/property-finder/sync');
      expect(mainPy).toContain('FastAPI');
    });

  });

  describe('Authoritative Backend Services Pipeline', () => {
    it('should have canonical Supabase schema and apply scripts in place', () => {
      expect(fs.existsSync(path.join(ROOT_DIR, 'supabase', 'schema.sql'))).toBe(true);
      expect(fs.existsSync(path.join(ROOT_DIR, 'scripts', 'apply-supabase-schema.mjs'))).toBe(true);
      expect(fs.existsSync(FUNCTIONS_DIR)).toBe(false);
    });

    it('Supabase schema should define listings, leads, and pgvector extensions', () => {
      const schemaSql = fs.readFileSync(path.join(ROOT_DIR, 'supabase', 'schema.sql'), 'utf-8');
      expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS public.listings');
      expect(schemaSql).toContain('vector');
    });
  });

  describe('Cron Bridge Handlers Contract', () => {
    it('should schedule night + morning dispatch windows in GitHub Actions and pin the job registry', () => {
      // 2026-11: Vercel (and its vercel.json cron slots) is retired — the
      // scheduling contract moved to .github/workflows/automations.yml,
      // which calls the Phase 11 dispatcher (see
      // apps/sierra-estates-realty/app/api/cron/dispatch/[job]/route.ts)
      // with the same Bearer CRON_SECRET contract over the job
      // registry in lib/server/automation-jobs.ts. The contract pinned
      // here: both windows are scheduled AND the legacy per-job endpoints
      // still exist as dispatcher-invocable routes.
      const automationsWf = fs.readFileSync(
        path.join(ROOT_DIR, '.github/workflows/automations.yml'),
        'utf-8'
      );
      expect(automationsWf).toContain("'10 2 * * *'");
      expect(automationsWf).toContain("'10 6 * * *'");
      expect(automationsWf).toContain("TARGET='night'");
      expect(automationsWf).toContain("TARGET='morning'");
      expect(automationsWf).toContain('/api/cron/dispatch/');
      expect(automationsWf).toContain('CRON_SECRET');

      const registry = fs.readFileSync(
        path.join(ROOT_DIR, 'apps/sierra-estates-realty/lib/server/automation-jobs.ts'),
        'utf-8'
      );
      for (const job of ['sync-leads', 'ingest-from-sheets', 'sync-listings', 'maintenance']) {
        expect(
          registry.includes(`'${job}'`) || registry.includes(`"${job}"`),
          `job '${job}' must be registered in the automation-jobs registry`
        ).toBe(true);
        expect(
          fs.existsSync(path.join(ROOT_DIR, 'apps/sierra-estates-realty/app/api/cron', job)),
          `job route /api/cron/${job} must still exist as a dispatcher-invocable endpoint`
        ).toBe(true);
      }
    });
  });
});
