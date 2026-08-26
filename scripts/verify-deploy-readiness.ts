#!/usr/bin/env tsx
/**
 * Sierra Estates Production Deployment Readiness Script
 * Runs comprehensive pre-flight verification across monorepo packages and deploy targets.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const RESULTS: CheckResult[] = [];

function isConfigured(value: string | undefined) {
  return Boolean(value && !/^(your-|change_me|replace_me|placeholder)/i.test(value));
}

function validateProductionEnvironment() {
  const missing: string[] = [];
  const hasFirebaseAdminCredentials = Boolean(
    isConfigured(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) ||
    (isConfigured(process.env.FIREBASE_CLIENT_EMAIL) && isConfigured(process.env.FIREBASE_PRIVATE_KEY))
  );

  if (!hasFirebaseAdminCredentials) {
    missing.push('FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY');
  }

  for (const name of ['SESSION_SECRET', 'SBR_SECRET_KEY', 'CRON_SECRET']) {
    if (!isConfigured(process.env[name])) missing.push(name);
  }

  if (missing.length > 0) {
    throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
  }
}

function check(name: string, fn: () => void) {
  try {
    process.stdout.write(`⏳ Checking ${name}... `);
    fn();
    console.log('✅ PASSED');
    RESULTS.push({ name, passed: true, message: 'OK' });
  } catch (err) {
    const errorMsg = (err as Error).message || String(err);
    console.log('❌ FAILED');
    RESULTS.push({ name, passed: false, message: errorMsg });
  }
}

console.log('\n🚀 SIERRA ESTATES PRODUCTION DEPLOYMENT VERIFICATION\n');

// 1. Check root configuration files
check('Root Configuration Files', () => {
  const requiredFiles = ['package.json', 'turbo.json', 'tsconfig.json', '.amphion/config.json'];
  for (const f of requiredFiles) {
    const fullPath = path.resolve(process.cwd(), f);
    if (!fs.existsSync(fullPath)) throw new Error(`Missing ${f}`);
  }
});

// 2. Check production-only configuration before spending time on builds.
check('Production Environment Configuration', validateProductionEnvironment);

// 3. Prevent public environment variables from carrying server credentials.
check('Public Environment Safety', () => {
  execSync('node scripts/check-public-env-safety.mjs', { stdio: 'pipe' });
});

// 4. Check that root and app Firebase configurations deploy the same rules.
check('Firebase Rule Configuration', () => {
  execSync('node scripts/check-firebase-rules.mjs', { stdio: 'pipe' });
});

// 5. Check packages compilation
check('Packages Compilation & Type-Check', () => {
  execSync('pnpm turbo run build --filter="./packages/*"', { stdio: 'pipe' });
});

// 6. Check client tests
check('Client Unit & Integration Tests', () => {
  execSync('pnpm --filter sierra-estates-client-page test:ci', { stdio: 'pipe' });
});

// 7. A deployment must be reproducible from the checked-out commit.
check('Git Status & Zero Working Tree Drift', () => {
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  if (status.trim()) throw new Error('Working tree is not clean');
});

console.log('\n======================================================');
const passedCount = RESULTS.filter((r) => r.passed).length;
console.log(`📊 Result: ${passedCount}/${RESULTS.length} verification stages passed`);
console.log('======================================================\n');

if (passedCount < RESULTS.length) {
  process.exitCode = 1;
} else {
  console.log('🎉 SYSTEM READY FOR VERCEL PRODUCTION DEPLOYMENT!\n');
}
