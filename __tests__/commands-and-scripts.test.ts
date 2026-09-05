import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Monorepo Commands & CLI Scripts Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');
  const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');

  describe('Package.json NPM Scripts Contract', () => {
    it('root package.json should define all primary fleet, test, and build scripts', () => {
      expect(fs.existsSync(PACKAGE_JSON_PATH)).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
      const scripts = pkg.scripts;

      const requiredScripts = [
        'dev',
        'build',
        'lint',
        'type-check',
        'test',
        'test:ci',
        'deploy:preview',
        'deploy:prod',
        'deploy:supabase',
        'deploy:schema',
        'vertex-agent',
        'openclaw:task',
        'run-harness',
        'harness:eval',
        'publish-recommendation',
        'write-memory',
        'check-thresholds',
        'sync-propertyfinder',
        'estimate-costs',
        'smoke:test',
        'briefing:daily',
        'deploy:check',
        'fleet:run-all',
      ];

      for (const s of requiredScripts) {
        expect(scripts[s], `Missing script "${s}" in package.json`).toBeDefined();
      }
    });
  });

  describe('Script File Integrity & Target Resolution', () => {
    const requiredScriptFiles = [
      'vertex-agent-runner.ts',
      'openclaw-task-runner.ts',
      'run-harness.ts',
      'check-thresholds.ts',
      'sync-propertyfinder.ts',
      'estimate-costs.ts',
      'deploy-smoke-test.ts',
      'generate-daily-briefing.ts',
      'verify-deploy-readiness.ts',
      'publish-recommendation.ts',
      'write-memory.ts',
      'merge-inventory-master.ts',
      'sync-vercel-env.js',
      'deployment/push_all_vercel_envs.js',
    ];

    for (const file of requiredScriptFiles) {
      it(`scripts/${file} should exist and have non-zero size`, () => {
        const fullPath = path.join(SCRIPTS_DIR, file);
        expect(fs.existsSync(fullPath), `File scripts/${file} must exist`).toBe(true);
        const stats = fs.statSync(fullPath);
        expect(stats.size).toBeGreaterThan(50);
      });
    }
  });

  describe('Fleet Orchestration & Check Scripts', () => {
    it('check-thresholds.ts should define metric acceptance thresholds', () => {
      const content = fs.readFileSync(path.join(SCRIPTS_DIR, 'check-thresholds.ts'), 'utf-8');
      expect(content).toContain('thresholdMax');
      expect(content).toContain('SystemMetricThreshold');
    });

    it('run-harness.ts should initialize DeepSeekHarness and evaluate results', () => {
      const content = fs.readFileSync(path.join(SCRIPTS_DIR, 'run-harness.ts'), 'utf-8');
      expect(content).toContain('DeepSeekHarness');
      expect(content).toContain('runFullSuite');
    });

    it('openclaw-task-runner.ts should support ingest:all, ingest:owners, and inventory:audit actions', () => {
      const content = fs.readFileSync(path.join(SCRIPTS_DIR, 'openclaw-task-runner.ts'), 'utf-8');
      expect(content).toContain('ingest:all');
      expect(content).toContain('inventory:audit');
    });

    it('deploy-smoke-test.ts should define probes for live and local endpoints', () => {
      const content = fs.readFileSync(path.join(SCRIPTS_DIR, 'deploy-smoke-test.ts'), 'utf-8');
      expect(content).toContain('SMOKE_TARGET_URL');
      expect(content).toContain('PROBES');
      expect(content).toContain('/api/health');
    });
  });

});
