import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Deployments & Vercel Configuration Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const WORKFLOWS_DIR = path.join(ROOT_DIR, '.github', 'workflows');
  const REALTY_APP_DIR = path.join(ROOT_DIR, 'apps', 'sierra-estates-realty');

  describe('Vercel Rate Limiting & Anti-Collision Guards', () => {
    it('root vercel.json must disable automatic git deployments to avoid rate limit collisions', () => {
      const rootVercelPath = path.join(ROOT_DIR, 'vercel.json');
      expect(fs.existsSync(rootVercelPath)).toBe(true);
      const config = JSON.parse(fs.readFileSync(rootVercelPath, 'utf-8'));
      expect(config.git).toBeDefined();
      expect(config.git.deploymentEnabled).toBe(false);
    });

    it('apps/sierra-estates-realty/vercel.json must disable automatic git deployments', () => {
      const appVercelPath = path.join(REALTY_APP_DIR, 'vercel.json');
      expect(fs.existsSync(appVercelPath)).toBe(true);
      const config = JSON.parse(fs.readFileSync(appVercelPath, 'utf-8'));
      expect(config.git).toBeDefined();
      expect(config.git.deploymentEnabled).toBe(false);
    });

    it('deploy-vercel.yml should enforce max-parallel: 1 to prevent simultaneous deploy rate limits', () => {
      const deployWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'deploy-vercel.yml'), 'utf-8');
      expect(deployWf).toContain('max-parallel: 1');
      expect(deployWf).toContain('timeout-minutes: 20');
    });

    it('deploy-vercel.yml should include 429 rate limit backoff and retry mechanisms', () => {
      const deployWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'deploy-vercel.yml'), 'utf-8');
      expect(deployWf).toContain('429');
      expect(deployWf).toContain('Rate limited');
      expect(deployWf).toContain('sleep');
    });
  });

  describe('Domain Routing & Project Matrix', () => {
    it('deploy-vercel.yml should define separate client and admin projects', () => {
      const deployWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'deploy-vercel.yml'), 'utf-8');
      expect(deployWf).toContain('role: client');
      expect(deployWf).toContain('domain: sierra-estates.net');
      expect(deployWf).toContain('role: admin');
      expect(deployWf).toContain('domain: admin.sierra-estates.net');
      expect(deployWf).toContain('apps/sierra-estates-realty');
    });

    it('deploy-vercel.yml should sync all critical environment variable categories', () => {
      const deployWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'deploy-vercel.yml'), 'utf-8');
      
      // Routing & URLs
      expect(deployWf).toContain('NEXT_PUBLIC_CLIENT_URL');
      expect(deployWf).toContain('NEXT_PUBLIC_ADMIN_URL');
      // Supabase Primary Backend
      expect(deployWf).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(deployWf).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      expect(deployWf).toContain('SUPABASE_SERVICE_ROLE_KEY');

      // Legacy Firebase environment synchronization must remain retired.
      expect(deployWf).not.toContain('FIREBASE_PROJECT_ID');
      expect(deployWf).not.toContain('FIREBASE_SERVICE_ACCOUNT_JSON');
      
      // AI & LLMs
      expect(deployWf).toContain('GOOGLE_AI_API_KEY');
      expect(deployWf).toContain('GEMINI_API_KEY');
      expect(deployWf).toContain('DEEPSEEK_API_KEY');
      
      // Property Finder & AWS
      expect(deployWf).toContain('PROPERTY_FINDER_API_KEY');
      expect(deployWf).toContain('AWS_ACCESS_KEY_ID');
      
      // Security
      expect(deployWf).toContain('SESSION_SECRET');
      expect(deployWf).toContain('SBR_SECRET_KEY');
      expect(deployWf).toContain('CRON_SECRET');
      expect(deployWf).toContain('ADMIN_API_KEY');
      
      // Communications
      expect(deployWf).toContain('TELEGRAM_BOT_TOKEN');
      expect(deployWf).toContain('WHATSAPP_API_TOKEN');
      expect(deployWf).toContain('SENDGRID_API_KEY');
    });
  });

  describe('Deployment Secret and Firebase Rule Safety', () => {
    it('does not configure server credentials as browser-visible variables', () => {
      const forbiddenNames = [
        'NEXT_PUBLIC_' + 'GEMINI_API_KEY',
        'NEXT_PUBLIC_' + 'TELEGRAM_BOT_TOKEN',
      ];
      const files = [
        path.join(ROOT_DIR, '.env.example'),
        path.join(REALTY_APP_DIR, '.env.local.example'),
        path.join(WORKFLOWS_DIR, 'deploy-vercel.yml'),
        path.join(ROOT_DIR, 'scripts', 'sync-vercel-env.js'),
        path.join(ROOT_DIR, 'scripts', 'deployment', 'push_all_vercel_envs.js'),
        path.join(ROOT_DIR, 'turbo.json'),
      ];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        for (const forbiddenName of forbiddenNames) {
          expect(content).not.toContain(forbiddenName);
        }
      }
    });

    it('ensures legacy Firebase deployment configs remain decommissioned in favor of Supabase', () => {
      expect(fs.existsSync(path.join(ROOT_DIR, 'firebase.json'))).toBe(false);
      expect(fs.existsSync(path.join(ROOT_DIR, '.firebaserc'))).toBe(false);
      expect(fs.existsSync(path.join(WORKFLOWS_DIR, 'deploy-supabase.yml'))).toBe(true);
    });

    it('fails deployments visibly when deployment credentials are absent', () => {
      const deployWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'deploy-vercel.yml'), 'utf8');
      expect(deployWf).toContain('::error::VERCEL_TOKEN or VERCEL_AUTH_TOKEN is required');
      expect(deployWf).toContain('VERCEL_TOKEN or VERCEL_AUTH_TOKEN is required to deploy this repository');
      expect(deployWf).toContain('exit 1');
    });
  });

  describe('Vercel Scripts & Deployment Tools', () => {
    it('sync-vercel-env.js should be present, valid and define client & admin env sets', () => {
      const syncScriptPath = path.join(ROOT_DIR, 'scripts', 'sync-vercel-env.js');
      expect(fs.existsSync(syncScriptPath)).toBe(true);
      const code = fs.readFileSync(syncScriptPath, 'utf-8');
      expect(code).toContain('CLIENT_ENV_VARS');
      expect(code).toContain('ADMIN_ENV_VARS');
      expect(code).toContain('syncVarsToProject');
      expect(code).toContain('429');
    });

    it('push_all_vercel_envs.js should resolve monorepo root correctly', () => {
      const pushScriptPath = path.join(ROOT_DIR, 'scripts', 'deployment', 'push_all_vercel_envs.js');
      expect(fs.existsSync(pushScriptPath)).toBe(true);
      const code = fs.readFileSync(pushScriptPath, 'utf-8');
      expect(code).toContain('apps/sierra-estates-realty/.env.local');
      expect(code).toContain('varsToAdd');
    });

    it('verify-deploy-readiness.ts should check environment and build prerequisites', () => {
      const verifyScript = path.join(ROOT_DIR, 'scripts', 'verify-deploy-readiness.ts');
      expect(fs.existsSync(verifyScript)).toBe(true);
      const code = fs.readFileSync(verifyScript, 'utf-8');
      // The script refers to the client app by path, not by package name.
      expect(code).toContain('apps/sierra-estates-realty');
    });
  });

  describe('CI-Gated Deployment & Emergency Override Safety', () => {
    it('deploy-vercel.yml must configure workflow_dispatch with emergency_override input and actions:read permission', () => {
      const deployWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'deploy-vercel.yml'), 'utf-8');
      expect(deployWf).toContain('emergency_override:');
      expect(deployWf).toContain('actions: read');
    });

    it('deploy-vercel.yml must define a gate job that blocks production deploys without successful CI or audited override', () => {
      const deployWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'deploy-vercel.yml'), 'utf-8');
      expect(deployWf).toContain('gate:');
      expect(deployWf).toContain('needs: [gate]');
      expect(deployWf).toContain('gh run list --workflow=ci.yml');
      expect(deployWf).toContain('EMERGENCY_OVERRIDE');
      expect(deployWf).toContain('AUDIT ALERT');
    });

    it('deploy-vercel.yml must preserve preview deployment behavior without requiring production CI gate', () => {
      const deployWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'deploy-vercel.yml'), 'utf-8');
      expect(deployWf).toContain('"$TARGET_ENV" = "preview"');
      expect(deployWf).toContain('CI production gate bypassed for preview environment');
    });

    it('ci.yml must trigger on push to main, pull_request, and workflow_dispatch', () => {
      const ciWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'ci.yml'), 'utf-8');
      expect(ciWf).toContain('branches: [main]');
      expect(ciWf).toContain('pull_request:');
      expect(ciWf).toContain('workflow_dispatch:');
    });

    it('ci.yml must execute the full release validation suite across deployable surface', () => {
      const ciWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'ci.yml'), 'utf-8');
      expect(ciWf).toContain('type-check');
      expect(ciWf).toContain('pnpm check:backend');
      expect(ciWf).toContain('pnpm check:public-env');
      expect(ciWf).toContain('pnpm check:legacy-runtime');
      expect(ciWf).toContain('lint');
      expect(ciWf).toContain('test:ci');
      expect(ciWf).toContain('build');
    });

    it('package.json deploy:prod must enforce pre-flight readiness checks', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
      expect(pkg.scripts['deploy:prod']).toContain('deploy:check');
      expect(pkg.scripts['deploy:prod']).toContain('vercel --prod');
    });
  });
});
