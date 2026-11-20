import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Deployments & Vercel Configuration Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const WORKFLOWS_DIR = path.join(ROOT_DIR, '.github', 'workflows');
  const REALTY_APP_DIR = path.join(ROOT_DIR, 'apps', 'sierra-estates-realty');

  describe('Vercel Git Integration', () => {
    it('Vercel project configs must stay retired (no vercel.json resurrection)', () => {
      // Hosting contract (2026-11-18): production runs on Cloudflare Workers.
      // The root + app vercel.json files were removed with the Vercel
      // retirement — these guards keep them from coming back by accident.
      expect(fs.existsSync(path.join(ROOT_DIR, 'vercel.json'))).toBe(false);
      expect(fs.existsSync(path.join(REALTY_APP_DIR, 'vercel.json'))).toBe(false);
      expect(fs.existsSync(path.join(ROOT_DIR, '.vercelignore'))).toBe(false);
      // The Cloudflare contract that replaced them:
      expect(fs.existsSync(path.join(REALTY_APP_DIR, 'wrangler.jsonc'))).toBe(true);
      expect(fs.existsSync(path.join(ROOT_DIR, 'deploy', 'wrangler.jsonc'))).toBe(true);
    });

    it('Vercel deploy workflows are deleted (retirement completed 2026-11-20)', () => {
      for (const wf of ['deploy-vercel.yml', 'deploy-admin-retry.yml']) {
        expect(fs.existsSync(path.join(WORKFLOWS_DIR, wf)), `${wf} must not exist`).toBe(false);
      }
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

  });

  describe('Cloudflare Scripts & Deployment Tools', () => {
    it('deploy-cloudflare.yml must fail visibly when Cloudflare credentials are absent', () => {
      const deployWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'deploy-cloudflare.yml'), 'utf8');
      expect(deployWf).toContain('::error::Missing CLOUDFLARE_API_TOKEN secret or CLOUDFLARE_ACCOUNT_ID variable.');
      expect(deployWf).toContain('exit 1');
    });

    it('deploy-cloudflare.yml must enforce the strict single-project lock (no accidental worker creation)', () => {
      const deployWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'deploy-cloudflare.yml'), 'utf8');
      expect(deployWf).toContain('ALLOW_CREATE_NEW_WORKER');
      expect(deployWf).toContain('does not exist (HTTP $HTTP_CODE). Creating a brand-new Cloudflare project is blocked');
      expect(deployWf).toContain('exit 1');
    });

    it('deploy-cloudflare.yml must verify the live deployment (health + apex)', () => {
      const deployWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'deploy-cloudflare.yml'), 'utf8');
      expect(deployWf).toContain('https://sierra-estates.net/api/health');
      expect(deployWf).toContain('Apex returned HTTP');
    });

    it('package.json must not reference the retired Vercel CLI', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
      const vercelScripts = Object.entries(pkg.scripts).filter(([, cmd]) =>
        /\bvercel\b/.test(cmd as string),
      );
      expect(vercelScripts, `scripts still referencing the Vercel CLI: ${vercelScripts.map(([n]) => n).join(', ')}`).toEqual([]);
    });

    it('retired Vercel support scripts stay deleted', () => {
      expect(fs.existsSync(path.join(ROOT_DIR, 'scripts', 'deployment', 'push_all_vercel_envs.js'))).toBe(false);
      expect(fs.existsSync(path.join(ROOT_DIR, 'scripts', 'sync-vercel-env.js'))).toBe(false);
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

    it('deploy-cloudflare.yml must gate production deploys on a green CI run for the exact commit', () => {
      const deployWf = fs.readFileSync(path.join(WORKFLOWS_DIR, 'deploy-cloudflare.yml'), 'utf-8');
      expect(deployWf).toContain('CI gate (production) · audit + block');
      expect(deployWf).toContain('needs: gate');
      expect(deployWf).toContain('gh run list --workflow=ci.yml');
      expect(deployWf).toContain('Production deploy BLOCKED');
    });
  });
});
