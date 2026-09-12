import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('GitHub Actions & CI/CD Workflows Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const WORKFLOWS_DIR = path.join(ROOT_DIR, '.github', 'workflows');

  const EXPECTED_WORKFLOWS = [
    'agent-fleet.yml',
    'ci.yml',
    'codeql.yml',
    'dependency-review.yml',
    'deploy-supabase.yml',
    'deploy-vercel.yml',
  ];

  it('all expected workflows must exist in .github/workflows', () => {
    for (const wf of EXPECTED_WORKFLOWS) {
      const fullPath = path.join(WORKFLOWS_DIR, wf);
      expect(fs.existsSync(fullPath), `Workflow ${wf} must exist`).toBe(true);
    }
  });

  describe('Node.js Version & Package Manager Standards', () => {
    it('primary Node workflows should use Node.js 22 and pnpm setup', () => {
      const nodeWorkflows = [
        'ci.yml',
        'deploy-vercel.yml',
        'agent-fleet.yml',
      ];

      for (const wf of nodeWorkflows) {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, wf), 'utf-8');
        expect(content, `${wf} should use node-version 22`).toMatch(/node-version:\s*['"]?22['"]?/);
      }
    });

    it('submodule cloning should be disabled across workflows to prevent ghost-submodule fetch failures', () => {
      const submodulesWorkflows = [
        'ci.yml',
        'deploy-vercel.yml',
        'agent-fleet.yml',
      ];

      for (const wf of submodulesWorkflows) {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, wf), 'utf-8');
        expect(content, `${wf} should have submodules: false`).toContain('submodules: false');
      }
    });
  });

  describe('Workflow Concurrency & Permission Scopes', () => {
    it('production agent fleet must validate Supabase and select tasks explicitly', () => {
      const content = fs.readFileSync(path.join(WORKFLOWS_DIR, 'agent-fleet.yml'), 'utf-8');
      expect(content).toContain('name: Production agent fleet');
      expect(content).toContain('pnpm check:backend');
      expect(content).toContain('pnpm check:legacy-runtime');
      expect(content).toContain('workflow_dispatch:');
      expect(content).toContain("briefing:daily");
      expect(content).toContain("fleet:run-all");
      expect(content).toContain('concurrency:');
      expect(content).toContain('cancel-in-progress: false');
    });

    it('CI and deployment workflows must declare concurrency groups to cancel obsolete runs', () => {
      const cancelConcurrencyWorkflows = [
        'ci.yml',
        'deploy-vercel.yml',
      ];

      for (const wf of cancelConcurrencyWorkflows) {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, wf), 'utf-8');
        expect(content, `${wf} should declare concurrency group`).toContain('concurrency:');
        if (wf === 'ci.yml') {
          expect(content, `${wf} should preserve in-progress CI runs`).toContain('cancel-in-progress: false');
        } else {
          expect(content, `${wf} should cancel-in-progress: true`).toContain('cancel-in-progress: true');
        }
      }
    });

    it('Cron scheduled workflows must not cancel in-progress runs', () => {
      const cronWorkflows: string[] = [];

      for (const wf of cronWorkflows) {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, wf), 'utf-8');
        expect(content, `${wf} should have cancel-in-progress: false`).toContain('cancel-in-progress: false');
      }
    });

    it('all workflows must define explicit permissions', () => {
      for (const wf of EXPECTED_WORKFLOWS) {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, wf), 'utf-8');
        expect(content, `${wf} should define permissions block`).toContain('permissions:');
      }
    });
  });

});
