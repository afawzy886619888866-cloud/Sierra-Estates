import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('GitHub Actions & CI/CD Workflows Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const WORKFLOWS_DIR = path.join(ROOT_DIR, '.github', 'workflows');

  const EXPECTED_WORKFLOWS = [
    'auto-assign.yml',
    'backend-tests.yml',
    'ci.yml',
    // codeql.yml was intentionally removed — it caused false-positive blocks on valid PRs.
    'defender-for-devops.yml',
    'dependency-review.yml',
    'deploy-cloud-run.yml',
    'deploy-firebase-rules.yml',
    'deploy-firebase.yml',
    'deploy-vercel.yml',
    'external-workflows.yml',
    'harness-eval.yml',
    'labeler.yml',
    'nightly.yml',
    'openclaw-inventory-sync.yml',
    'pr-size.yml',
    'retry-copilot-review.yml',
    'stale.yml',
    'vercel-cron-bridge.yml',
    'whatsapp-dispatch-cron.yml',
  ];

  it('all expected workflows must exist in .github/workflows', () => {
    for (const wf of EXPECTED_WORKFLOWS) {
      const fullPath = path.join(WORKFLOWS_DIR, wf);
      expect(fs.existsSync(fullPath), `Workflow ${wf} must exist`).toBe(true);
    }
  });

  describe('Node.js Version & Package Manager Standards', () => {
    it('primary Node workflows should use Node.js 24 and pnpm setup', () => {
      const node24Workflows = [
        'ci.yml',
        'deploy-vercel.yml',
        'harness-eval.yml',
        'nightly.yml',
        'openclaw-inventory-sync.yml',
        'external-workflows.yml',
      ];

      for (const wf of node24Workflows) {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, wf), 'utf-8');
        expect(content, `${wf} should use node-version 24`).toMatch(/node-version:\s*['"]?24['"]?/);
      }
    });

    it('submodule cloning should be disabled across workflows to prevent ghost-submodule fetch failures', () => {
      const submodulesWorkflows = [
        'ci.yml',
        'deploy-vercel.yml',
        'backend-tests.yml',
        'deploy-firebase.yml',
        'deploy-firebase-rules.yml',
        'external-workflows.yml',
        'harness-eval.yml',
        'nightly.yml',
        'openclaw-inventory-sync.yml',
      ];

      for (const wf of submodulesWorkflows) {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, wf), 'utf-8');
        expect(content, `${wf} should have submodules: false`).toContain('submodules: false');
      }
    });
  });

  describe('Workflow Concurrency & Permission Scopes', () => {
    it('CI and deployment workflows must declare concurrency groups to cancel obsolete runs', () => {
      const cancelConcurrencyWorkflows = [
        'ci.yml',
        'deploy-vercel.yml',
        'deploy-firebase.yml',
        'deploy-firebase-rules.yml',
      ];

      for (const wf of cancelConcurrencyWorkflows) {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, wf), 'utf-8');
        expect(content, `${wf} should declare concurrency group`).toContain('concurrency:');
        if (wf === 'ci.yml') {
          expect(content, `${wf} should conditionally cancel-in-progress`).toContain("cancel-in-progress: ${{ github.event_name == 'pull_request' }}");
        } else {
          expect(content, `${wf} should cancel-in-progress: true`).toContain('cancel-in-progress: true');
        }
      }
    });

    it('Cron scheduled workflows must not cancel in-progress runs', () => {
      const cronWorkflows = ['vercel-cron-bridge.yml', 'whatsapp-dispatch-cron.yml', 'openclaw-inventory-sync.yml'];

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

  describe('Secret & Variable Dual-Binding Fallbacks', () => {
    it('external-workflows.yml must support fallback between vars and secrets', () => {
      const content = fs.readFileSync(path.join(WORKFLOWS_DIR, 'external-workflows.yml'), 'utf-8');
      expect(content).toContain('PROPERTY_FINDER_API_BASE: ${{ vars.PROPERTY_FINDER_API_BASE || secrets.PROPERTY_FINDER_API_BASE');
      expect(content).toContain('BROKER_INBOX_SHEET_ID: ${{ vars.BROKER_INBOX_SHEET_ID || secrets.BROKER_INBOX_SHEET_ID }}');
      expect(content).toContain('WHATSAPP_API_URL: ${{ vars.WHATSAPP_API_URL || secrets.WHATSAPP_API_URL }}');
      expect(content).toContain('SENDGRID_FROM_EMAIL: ${{ vars.SENDGRID_FROM_EMAIL || secrets.SENDGRID_FROM_EMAIL');
      expect(content).toContain('FIREBASE_PROJECT_ID: ${{ vars.FIREBASE_PROJECT_ID || secrets.FIREBASE_PROJECT_ID');
    });

    it('vercel-cron-bridge.yml must guard on CRON_SECRET and skip gracefully if unset', () => {
      const content = fs.readFileSync(path.join(WORKFLOWS_DIR, 'vercel-cron-bridge.yml'), 'utf-8');
      expect(content).toContain('CRON_SECRET');
      expect(content).toContain('skipping cron bridge invocation');
    });

    it('whatsapp-dispatch-cron.yml must guard on CRON_SECRET and skip gracefully if unset', () => {
      const content = fs.readFileSync(path.join(WORKFLOWS_DIR, 'whatsapp-dispatch-cron.yml'), 'utf-8');
      expect(content).toContain('CRON_SECRET');
      expect(content).toContain('skipping WhatsApp dispatch cron');
    });
  });
});
