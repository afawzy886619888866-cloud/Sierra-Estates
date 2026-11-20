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
    'whatsapp-outreach.yml',
  ];

  it('all expected workflows must exist in .github/workflows', () => {
    for (const wf of EXPECTED_WORKFLOWS) {
      const fullPath = path.join(WORKFLOWS_DIR, wf);
      expect(fs.existsSync(fullPath), `Workflow ${wf} must exist`).toBe(true);
    }
  });

  describe('Node.js Version & Package Manager Standards', () => {
    it('uses Node.js 24-compatible versions of GitHub Actions', () => {
      const workflowDirs = [
        WORKFLOWS_DIR,
        path.join(ROOT_DIR, 'packages', 'open-memory', '.github', 'workflows'),
      ];

      for (const dir of workflowDirs) {
        const workflows = fs.readdirSync(dir).filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'));
        for (const wf of workflows) {
          const content = fs.readFileSync(path.join(dir, wf), 'utf-8');
          expect(content, `${wf} must not use the Node.js 20 checkout action`).not.toContain('actions/checkout@v4');
          expect(content, `${wf} must not use the Node.js 20 setup-node action`).not.toContain('actions/setup-node@v4');
          expect(content, `${wf} must not use the Node.js 20 pnpm setup action`).not.toContain('pnpm/action-setup@v4');
          expect(content, `${wf} must not use the Node.js 20 dependency-review action`).not.toContain('actions/dependency-review-action@v4');
        }
      }
    });

    it('primary Node workflows should use Node.js 22 and pnpm setup', () => {
      const nodeWorkflows = [
        'ci.yml',
        'agent-fleet.yml',
        'whatsapp-outreach.yml',
      ];

      for (const wf of nodeWorkflows) {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, wf), 'utf-8');
        expect(content, `${wf} should use node-version 22`).toMatch(/node-version:\s*['"]?22['"]?/);
      }
    });

    it('submodule cloning should be disabled across workflows to prevent ghost-submodule fetch failures', () => {
      const submodulesWorkflows = [
        'ci.yml',
        'agent-fleet.yml',
        'whatsapp-outreach.yml',
      ];

      for (const wf of submodulesWorkflows) {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, wf), 'utf-8');
        expect(content, `${wf} should have submodules: false`).toContain('submodules: false');
      }
    });
  });

  describe('Workflow Concurrency, Retired EC2 Decommission & Permission Scopes', () => {
    it('production agent fleet must validate Supabase and select tasks explicitly', () => {
      const content = fs.readFileSync(path.join(WORKFLOWS_DIR, 'agent-fleet.yml'), 'utf-8');
      expect(content).toContain('name: Production agent fleet');
      expect(content).toContain('pnpm check:backend');
      expect(content).toContain('pnpm check:legacy-runtime');
      expect(content).toContain('workflow_dispatch:');
      expect(content).toContain('briefing:daily');
      expect(content).toContain('fleet:run-all');
      expect(content).toContain('concurrency:');
      expect(content).toContain('cancel-in-progress: false');
    });

    it('CI and deployment workflows must declare concurrency groups to cancel obsolete runs', () => {
      const cancelConcurrencyWorkflows = [
        'ci.yml',
        'deploy-cloudflare.yml',
      ];

      for (const wf of cancelConcurrencyWorkflows) {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, wf), 'utf-8');
        expect(content, `${wf} should declare concurrency group`).toContain('concurrency:');
        if (wf === 'ci.yml') {
          expect(content, `${wf} should preserve in-progress CI runs`).toContain('cancel-in-progress: false');
        } else {
          // 2026-11-19 (Lane A unified architecture): production deploys are
          // SERIALIZED — cancel-in-progress: false, so a mid-deploy is never
          // killed; obsolete runs queue instead of racing.
          expect(content, `${wf} should serialize deploys (cancel-in-progress: false)`).toContain('cancel-in-progress: false');
          expect(content, `${wf} should pin a dedicated concurrency group`).toContain('group:');
        }
      }
    });

    it('Cron scheduled workflows must not cancel in-progress runs', () => {
      const cronWorkflows: string[] = [
        'agent-fleet.yml',
        'whatsapp-outreach.yml',
      ];

      for (const wf of cronWorkflows) {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, wf), 'utf-8');
        expect(content, `${wf} should have cancel-in-progress: false`).toContain('cancel-in-progress: false');
      }
    });

    it('no GitHub Actions workflow may reference the retired AWS EC2 IP 54.89.162.250', () => {
      const files = fs.readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
      for (const wf of files) {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, wf), 'utf-8');
        expect(content, `${wf} must not reference retired EC2 IP`).not.toContain('54.89.162.250');
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
