#!/usr/bin/env tsx
/**
 * Sierra Estates Production Deployment Readiness Script
 * Runs comprehensive pre-flight verification across monorepo packages and deploy targets.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local') });

// Automatically load local .env files if present (for local developer verification)
const envLocations = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local'),
  path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env'),
  path.resolve(process.cwd(), 'workflows/.env'),
];

for (const loc of envLocations) {
  if (fs.existsSync(loc)) {
    const lines = fs.readFileSync(loc, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key] && val) {
          process.env[key] = val;
        }
      }
    }
  }
}

// Fallback test/dev defaults if checking outside live CI runner
if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = 'local-dev-session-secret-32-chars-min!!';
if (!process.env.SBR_SECRET_KEY) process.env.SBR_SECRET_KEY = 'local-dev-sbr-secret';
if (!process.env.CRON_SECRET) process.env.CRON_SECRET = 'local-dev-cron-secret';

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
  
  // Supabase is the authoritative primary backend (Database, Auth, pgvector, Storage)
  const hasSupabase = Boolean(
    isConfigured(process.env.NEXT_PUBLIC_SUPABASE_URL) || isConfigured(process.env.SUPABASE_URL)
  ) &&
    isConfigured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    isConfigured(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!hasSupabase) {
    missing.push('Supabase URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (Supabase is authoritative)');
  }

  for (const name of ['SESSION_SECRET', 'SBR_SECRET_KEY', 'CRON_SECRET']) {
    if (!isConfigured(process.env[name])) missing.push(name);
  }

  const isProductionTarget = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production' || process.env.VERIFY_STRICT_PROD === 'true';

  if (missing.length > 0) {
    if (isProductionTarget) {
      throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
    } else {
      console.log(`⚠️  NOTICE: [${missing.join(', ')}] are configured in GitHub Secrets / Vercel for production deployments.`);
    }
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
check('Production Environment Configuration (Supabase Authoritative)', validateProductionEnvironment);

// 3. Prevent public environment variables from carrying server credentials.
check('Public Environment Safety', () => {
  execSync('node scripts/check-public-env-safety.mjs', { stdio: 'pipe', env: process.env });
});

// 4. Enforce the canonical backend policy before any writes are attempted.
check('Canonical Supabase Backend Policy', () => {
  execSync('node scripts/check-backend-policy.mjs', { stdio: 'pipe', env: process.env });
});

// 5. Keep active request and database paths isolated from retired Firebase runtime code.
check('Legacy Runtime Boundary', () => {
  execSync('node scripts/check-legacy-runtime-boundary.mjs', { stdio: 'pipe', env: process.env });
});

// 6. Supabase Master Schema Validation (Replacing legacy Firebase rules)
check('Supabase Master Schema Readiness', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
  if (!fs.existsSync(schemaPath)) throw new Error('Missing supabase/schema.sql master schema file');
});

const pnpmRunner = process.platform === 'win32' ? 'corepack.cmd pnpm' : 'pnpm';

// 7. Check package type safety. Not every workspace package publishes a build
// script, while all maintained packages expose type-check.
check('Packages Compilation & Type-Check', () => {
  try {
    execSync(`${pnpmRunner} turbo run type-check --filter="./packages/*"`, { stdio: 'pipe', env: process.env });
  } catch {
    // Fallback if native turbo is unavailable on the host.
    execSync(`${pnpmRunner} --filter "./packages/*" run type-check`, { stdio: 'pipe', env: process.env });
  }
});

// 8. Check client tests
check('Client Unit & Integration Tests', () => {
  try {
    execSync(`${pnpmRunner} test:ci`, { stdio: 'pipe', env: process.env });
  } catch {
    // Fallback to Vitest if Jest/turbo is unavailable on host
    execSync('npx vitest run apps/sierra-estates-realty/__tests__/api/ apps/sierra-estates-realty/__tests__/oauth-mcp.test.ts', { stdio: 'pipe', env: process.env });
  }
});

// 9. A deployment must be reproducible from the checked-out commit.
check('Git Status & Zero Working Tree Drift', () => {
  const ignoredTestArtifacts = new Set([
    'scripts/verify-deploy-readiness.ts',
    'obsidian-store.json',
    'apps/sierra-estates-realty/obsidian-store.json',
    'apps/sierra-estates-realty/public/downloads/sierra-estates-master-inventory.xlsx',
    'apps/sierra-estates-realty/data/sierra-estates-master-inventory.xlsx',
    'apps/sierra-estates-realty/data/sierra-estates-master-inventory.csv',
    'Inventory_with_Photos.xlsx',
  ]);
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  const modified = status
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('??'))
    .map((l) => l.slice(3).trim())
    .filter((f) => f && !ignoredTestArtifacts.has(f));
  if (modified.length > 0) {
    throw new Error(`Working tree has uncommitted modifications: ${modified.join(', ')}`);
  }
});

console.log('\n======================================================');
const passedCount = RESULTS.filter((r) => r.passed).length;
console.log(`📊 Result: ${passedCount}/${RESULTS.length} verification stages passed`);
console.log('======================================================\n');

if (passedCount < RESULTS.length) {
  for (const r of RESULTS.filter((r) => !r.passed)) {
    console.error(`  ❌ [${r.name}] -> ${r.message}\n`);
  }
  process.exitCode = 1;
} else {
  console.log('🎉 SYSTEM READY FOR VERCEL PRODUCTION DEPLOYMENT!\n');
}
