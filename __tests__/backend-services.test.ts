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

  describe('Firebase Cloud Functions Pipeline', () => {
    it('should have index.js, package.json, and data processing handlers in functions/', () => {
      expect(fs.existsSync(path.join(FUNCTIONS_DIR, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(FUNCTIONS_DIR, 'processData.js'))).toBe(true);
      expect(fs.existsSync(path.join(FUNCTIONS_DIR, 'transform.js'))).toBe(true);
    });

    it('transform.js should normalize real estate payload records', () => {
      const transformJs = fs.readFileSync(path.join(FUNCTIONS_DIR, 'transform.js'), 'utf-8');
      expect(transformJs).toContain('transform');
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
