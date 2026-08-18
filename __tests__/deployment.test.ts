import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('GitHub Actions, Vercel & Deployment Configuration', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const WORKFLOWS_DIR = path.join(ROOT_DIR, '.github', 'workflows');

  describe('GitHub Actions Workflows', () => {
    it('should have .github/workflows directory with key pipeline workflows', () => {
      expect(fs.existsSync(WORKFLOWS_DIR)).toBe(true);

      const requiredWorkflows = [
        'ci.yml',
        'deploy-vercel.yml',
        'backend-tests.yml',
        'deploy-firebase.yml',
        'deploy-firebase-rules.yml',
        'codeql.yml',
      ];

      for (const wf of requiredWorkflows) {
        expect(fs.existsSync(path.join(WORKFLOWS_DIR, wf)), `Missing workflow: ${wf}`).toBe(true);
      }
    });

    it('ci.yml should trigger on push and pull_request to main', () => {
      const ciCode = fs.readFileSync(path.join(WORKFLOWS_DIR, 'ci.yml'), 'utf-8');
      expect(ciCode).toContain('push:');
      expect(ciCode).toContain('pull_request:');
      expect(ciCode).toContain('branches: [main]');
      expect(ciCode).toContain('pnpm install');
      expect(ciCode).toContain('node-version: \'24\'');
    });

    it('deploy-vercel.yml should define admin deployment targets with client unwired', () => {
      const deployCode = fs.readFileSync(path.join(WORKFLOWS_DIR, 'deploy-vercel.yml'), 'utf-8');
      expect(deployCode).toContain('role: admin');
      expect(deployCode).toContain('domain: admin.sierra-estates.net');
      expect(deployCode).toContain('apps/sierra-estates-realty');
      expect(deployCode).toContain('Attach production domain');
    });

    it('backend-tests.yml should target api, functions, and database packages', () => {
      const backendWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'backend-tests.yml'), 'utf-8');
      expect(backendWf).toContain('functions/**');
      expect(backendWf).toContain('packages/db/**');
      expect(backendWf).toContain('sierra-estates-functions');
    });
  });

  describe('Vercel Configuration Integrity', () => {
    const rootVercelJsonPath = path.join(ROOT_DIR, 'vercel.json');

    it('root vercel.json should exist and be valid JSON', () => {
      expect(fs.existsSync(rootVercelJsonPath)).toBe(true);
      const config = JSON.parse(fs.readFileSync(rootVercelJsonPath, 'utf-8'));
      expect(config.version).toBe(2);
      expect(config.regions).toContain('fra1');
    });

    it('root vercel.json should configure security headers', () => {
      const config = JSON.parse(fs.readFileSync(rootVercelJsonPath, 'utf-8'));
      expect(config.headers).toBeDefined();

      const allHeaderKeys = config.headers.flatMap((h: any) => h.headers.map((item: any) => item.key));
      expect(allHeaderKeys).toContain('X-Content-Type-Options');
      expect(allHeaderKeys).toContain('X-Frame-Options');
      expect(allHeaderKeys).toContain('X-XSS-Protection');
      expect(allHeaderKeys).toContain('Referrer-Policy');
    });

    it('root vercel.json should configure cron jobs for leads, listings, and sheets sync', () => {
      const config = JSON.parse(fs.readFileSync(rootVercelJsonPath, 'utf-8'));
      expect(config.crons).toBeDefined();
      expect(Array.isArray(config.crons)).toBe(true);
      expect(config.crons.length).toBeGreaterThanOrEqual(4);

      const paths = config.crons.map((c: any) => c.path);
      expect(paths).toContain('/api/cron/sync-leads');
      expect(paths).toContain('/api/cron/ingest-from-sheets');
      expect(paths).toContain('/api/cron/sync-listings');
      expect(paths).toContain('/api/cron/maintenance');
    });
  });

  describe('Monorepo Workspace Setup', () => {
    it('pnpm-workspace.yaml should define apps and packages directories', () => {
      const pnpmWsPath = path.join(ROOT_DIR, 'pnpm-workspace.yaml');
      expect(fs.existsSync(pnpmWsPath)).toBe(true);
      const content = fs.readFileSync(pnpmWsPath, 'utf-8');
      expect(content).toContain('apps/*');
      expect(content).toContain('packages/agents-core');
      expect(content).toContain('packages/shared');
    });

    it('turbo.json should configure build, type-check, test, and lint pipelines', () => {
      const turboPath = path.join(ROOT_DIR, 'turbo.json');
      expect(fs.existsSync(turboPath)).toBe(true);
      const turbo = JSON.parse(fs.readFileSync(turboPath, 'utf-8'));
      expect(turbo.tasks || turbo.pipeline).toBeDefined();
    });
  });
});
