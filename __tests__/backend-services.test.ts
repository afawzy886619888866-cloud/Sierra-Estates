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
    it('should define scheduled cron job paths in root vercel.json', () => {
      const vercelJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'vercel.json'), 'utf-8'));
      const cronPaths = vercelJson.crons.map((c: any) => c.path);

      expect(cronPaths).toContain('/api/cron/sync-leads');
      expect(cronPaths).toContain('/api/cron/ingest-from-sheets');
      expect(cronPaths).toContain('/api/cron/sync-listings');
      expect(cronPaths).toContain('/api/cron/maintenance');
    });
  });
});
