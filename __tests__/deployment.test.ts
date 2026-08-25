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
      expect(deployWf).toContain('NEXT_PUBLIC_SITE_URL');
      
      // Firebase
      expect(deployWf).toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
      expect(deployWf).toContain('FIREBASE_PROJECT_ID');
      expect(deployWf).toContain('FIREBASE_SERVICE_ACCOUNT_JSON');
      
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
      expect(code).toContain('sierra-estates-client-page');
    });
  });
});
