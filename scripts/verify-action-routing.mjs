#!/usr/bin/env node
/**
 * Sierra Estates — Action Routing & Deployment Target Dispatch Guard
 * 
 * Verifies that any modified or staged files route cleanly to their designated
 * architectural targets without cross-boundary leaks or misconfigurations.
 * 
 * Target Domains:
 * 1. [CLIENT]     apps/sierra-estates-realty -> Vercel Client (sierra-estates-client-portal)
 * 2. [ADMIN]      apps/sierra-estates-realty/app/admin -> Vercel Admin (sierra-estates-admin-page)
 * 3. [DATABASE]   supabase/ & packages/db -> Supabase PostgreSQL (gaxfqcietzoonlmatiot)
 * 4. [AUTOMATION] apps/automations & infra/ -> Background Workers & Cron Jobs
 * 5. [SHARED]     packages/* & shared configs -> Monorepo Core
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();

console.log('══════════════════════════════════════════════════════════════════════');
console.log('  SIERRA ESTATES — ARCHITECTURAL ACTION ROUTING & DISPATCH GUARD       ');
console.log('══════════════════════════════════════════════════════════════════════\n');

// 1. Get changed / staged / untracked files
let changedFiles = [];
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
  changedFiles = gitStatus
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter((file) => fs.existsSync(path.resolve(ROOT, file)));
} catch (e) {
  changedFiles = [];
}

if (changedFiles.length === 0) {
  console.log('ℹ️  No modified files detected in working tree. Auditing active boundaries...\n');
} else {
  console.log(`🔍 Auditing ${changedFiles.length} modified file(s):\n`);
}

const targets = {
  client: [],
  admin: [],
  database: [],
  automation: [],
  shared: [],
  other: [],
};

const violations = [];

for (const file of changedFiles) {
  const norm = file.replace(/\\/g, '/');

  if (norm.startsWith('apps/sierra-estates-realty/app/admin') || norm.startsWith('apps/sierra-estates-realty/app/api/admin') || norm.startsWith('apps/admin-dashboard')) {
    targets.admin.push(norm);

    // Rule: Admin API routes must have an auth guard
    if (norm.endsWith('/route.ts') || norm.endsWith('/route.js')) {
      const content = fs.readFileSync(path.resolve(ROOT, file), 'utf-8');
      const hasAuth =
        content.includes('verifyAdminRequest') ||
        content.includes('requireRole') ||
        content.includes('auth-guard') ||
        content.includes('session');
      if (!hasAuth) {
        violations.push(`[ADMIN BREACH] ${norm} does not enforce authentication.`);
      }
    }
  } else if (norm.startsWith('apps/sierra-estates-realty')) {
    targets.client.push(norm);

    // Rule: Client components must never reference service role keys
    if (norm.endsWith('.tsx') || norm.endsWith('.ts')) {
      const content = fs.readFileSync(path.resolve(ROOT, file), 'utf-8');
      if (content.includes('"use client"') || content.includes("'use client'")) {
        if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
          violations.push(`[SECURITY BREACH] Client component ${norm} references SUPABASE_SERVICE_ROLE_KEY.`);
        }
      }
    }
  } else if (norm.startsWith('supabase/') || norm.startsWith('packages/db')) {
    targets.database.push(norm);

    // Rule: Database operations must never use retired Firebase writes
    if (norm.endsWith('.ts') || norm.endsWith('.js') || norm.endsWith('.sql')) {
      const content = fs.readFileSync(path.resolve(ROOT, file), 'utf-8');
      if (content.includes("from 'firebase-admin/firestore'") || content.includes("from 'firebase/firestore'")) {
        violations.push(`[DATABASE POLICY BREACH] ${norm} introduces retired Firestore imports.`);
      }
    }
  } else if (norm.startsWith('apps/automations') || norm.startsWith('infra/')) {
    targets.automation.push(norm);
  } else if (norm.startsWith('packages/')) {
    targets.shared.push(norm);
  } else {
    targets.other.push(norm);
  }
}

// Display target dispatch report
if (targets.client.length) {
  console.log(`  🌐 [Client Portal Target] -> Vercel: sierra-estates-client-portal (sierra-estates.net)`);
  targets.client.forEach((f) => console.log(`      • ${f}`));
}
if (targets.admin.length) {
  console.log(`  🛡️  [Admin Portal Target]  -> Vercel: sierra-estates-admin-page (admin.sierra-estates.net)`);
  targets.admin.forEach((f) => console.log(`      • ${f}`));
}
if (targets.database.length) {
  console.log(`  🗄️  [Supabase Target]      -> PostgreSQL: https://gaxfqcietzoonlmatiot.supabase.co`);
  targets.database.forEach((f) => console.log(`      • ${f}`));
}
if (targets.automation.length) {
  console.log(`  ⚙️  [Automation Target]    -> Background Workers & N8N Webhooks`);
  targets.automation.forEach((f) => console.log(`      • ${f}`));
}
if (targets.shared.length) {
  console.log(`  📦 [Monorepo Packages]    -> @sierra-estates/* Shared Libraries`);
  targets.shared.forEach((f) => console.log(`      • ${f}`));
}
if (targets.other.length) {
  console.log(`  🔧 [Project Config]       -> Root / Tools / Docs`);
  targets.other.forEach((f) => console.log(`      • ${f}`));
}

// 2. Monorepo Structural Sanity Check
const masterSchema = path.join(ROOT, 'supabase', 'schema.sql');
if (!fs.existsSync(masterSchema)) {
  violations.push('Missing authoritative supabase/schema.sql master schema.');
}

const clientPkg = path.join(ROOT, 'apps', 'sierra-estates-realty', 'package.json');
if (!fs.existsSync(clientPkg)) {
  violations.push('Missing apps/sierra-estates-realty/package.json client root.');
}

const vercelConfig = path.join(ROOT, 'vercel.json');
if (!fs.existsSync(vercelConfig)) {
  violations.push('Missing root vercel.json deployment configuration.');
}

// Final Verdict
console.log('\n──────────────────────────────────────────────────────────────────────');
if (violations.length > 0) {
  console.error(`❌ ROUTING DISPATCH FAILED — ${violations.length} architectural violation(s):\n`);
  violations.forEach((v) => console.error(`   ❌ ${v}`));
  console.error('\nAction halted to prevent broken deployments or security leaks.\n');
  process.exit(1);
} else {
  console.log('✅ ALL ACTIONS & DEPLOYMENT TARGETS ARE STRICTLY ROUTED & WIRED.\n');
  process.exit(0);
}
