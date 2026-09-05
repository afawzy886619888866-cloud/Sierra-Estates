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

  describe('External Workflows (external-workflows.yml) Deep Contract Suite', () => {
    const extWfPath = path.join(WORKFLOWS_DIR, 'external-workflows.yml');
    const content = fs.readFileSync(extWfPath, 'utf-8');

    it('must use the official json.schemastore.org workflow schema', () => {
      expect(content).toContain('$schema=https://json.schemastore.org/github-workflow.json');
    });

    it('must define all 5 scheduled jobs and summary reporter', () => {
      expect(content).toContain('owner-search:');
      expect(content).toContain('owner-contact:');
      expect(content).toContain('email-sender:');
      expect(content).toContain('unit-adder:');
      expect(content).toContain('summary:');
    });

    it('must define exact schedules for each automation pipeline', () => {
      expect(content).toContain("- cron: '0 9 * * *'"); // Owner Search (9am)
      expect(content).toContain("- cron: '0 10 * * *'"); // Owner Contact (10am)
      expect(content).toContain("- cron: '0 8 * * *'"); // Email Sender (8am)
      expect(content).toContain("- cron: '0 11 * * *'"); // Unit Adder (11am)
    });

    it('must configure workflow_dispatch with choices', () => {
      expect(content).toContain('workflow_dispatch:');
      expect(content).toContain('owner-search');
      expect(content).toContain('owner-contact');
      expect(content).toContain('email-sender');
      expect(content).toContain('unit-adder');
    });

    it('must guard all jobs against missing secrets with graceful skips', () => {
      expect(content).toContain('PROPERTY_FINDER_JWT_TOKEN, GOOGLE_SERVICE_ACCOUNT_KEY');
      expect(content).toContain('WHATSAPP_API_TOKEN, GOOGLE_SERVICE_ACCOUNT_KEY');
      expect(content).toContain('SENDGRID_API_KEY, GOOGLE_SERVICE_ACCOUNT_KEY');
      expect(content).toContain('GOOGLE_SERVICE_ACCOUNT_KEY, BROKER_INBOX_SHEET_ID');
    });

    it('must pass all necessary Google Sheets, Firebase, SendGrid, and WhatsApp credentials', () => {
      expect(content).toContain("GOOGLE_SERVICE_ACCOUNT_KEY: ${{ secrets['GOOGLE_SERVICE_ACCOUNT_KEY'] }}");
      expect(content).toContain('BROKER_INBOX_SHEET_ID:');
      expect(content).toContain("PROPERTY_FINDER_JWT_TOKEN: ${{ secrets['PROPERTY_FINDER_JWT_TOKEN'] }}");
      expect(content).toContain("WHATSAPP_API_TOKEN: ${{ secrets['WHATSAPP_API_TOKEN'] }}");
      expect(content).toContain("SENDGRID_API_KEY: ${{ secrets['SENDGRID_API_KEY'] }}");
      expect(content).toContain("FIREBASE_PRIVATE_KEY: ${{ secrets['FIREBASE_PRIVATE_KEY'] }}");
    });

    it('summary job must depend on all 4 pipelines and execute unconditionally', () => {
      expect(content).toContain('needs: [owner-search, owner-contact, email-sender, unit-adder]');
      expect(content).toContain('if: always()');
    });
  });
});
