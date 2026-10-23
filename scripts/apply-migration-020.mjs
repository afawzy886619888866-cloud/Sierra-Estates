#!/usr/bin/env node
/**
 * apply-migration-020.mjs — Phase D live cutover (surgical path).
 *
 * Applies ONLY supabase/migrations/20261002_020_public_publish_gate.sql —
 * the Phase D public publish gate (RLS policy + gated RPC) — to the live
 * Supabase project via the Management API, then runs the RLS verification
 * harness (supabase/tests/run-rls-tests.sh) which re-checks the live
 * pg_policies row and the anon-role view with the same token.
 *
 * This is the documented runbook from docs/ACTIVATION_BASELINE.md blocker #2:
 *   apply migration 020 → verify (pnpm test:rls)
 *
 * Why surgical (vs `pnpm deploy:supabase`, which applies the whole schema):
 *   - the runbook names migration 020 specifically;
 *   - migration 021 provisions portal accounts — a deliberate act that
 *     should not ride along on a visibility-gate cutover;
 *   - both are idempotent, so the full-schema path remains available later.
 *
 * Credential: SUPABASE_ACCESS_TOKEN (same token as apply-supabase-schema.mjs;
 * also accepted as a CLI arg for one-shot use: node apply-migration-020.mjs sbp_...).
 * Optional: SUPABASE_PROJECT_REF (default gaxfqcietzoonlmatiot).
 *
 * Exit codes: 0 applied (or already applied) + verification PASS
 *             1 apply or verification failed
 *             2 missing credential
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase', 'migrations', '20261002_020_public_publish_gate.sql');
const HARNESS = path.join(ROOT, 'supabase', 'tests', 'run-rls-tests.sh');

const tokenArg = process.argv[2]?.startsWith('sbp_') ? process.argv[2] : null;
const token = tokenArg || process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || 'gaxfqcietzoonlmatiot';
const API = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

if (!token) {
    console.error('❌ SUPABASE_ACCESS_TOKEN not set (or passed as sbp_... CLI arg).');
    console.error('   Get it from https://supabase.com/dashboard/account/tokens');
    process.exit(2);
}
if (!fs.existsSync(MIGRATION)) {
    console.error(`❌ Migration not found: ${MIGRATION}`);
    process.exit(1);
}

async function query(sql) {
    const res = await fetch(API, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { ok: res.ok, status: res.status, body };
}

function die(msg) {
    console.error(`❌ ${msg}`);
    process.exit(1);
}

console.log('══════════════════════════════════════════════════════');
console.log('  SIERRA ESTATES — PHASE D LIVE CUTOVER (migration 020)');
console.log('  public publish gate: RLS policy + gated RPC');
console.log('══════════════════════════════════════════════════════\n');

// 0. Pre-flight: is the gate already live? (idempotent re-run friendliness)
const pre = await query(
    `SELECT policyname, qual FROM pg_policies
     WHERE schemaname='public' AND tablename='listings'
       AND policyname='Public can view active listings';`
);
if (!pre.ok) die(`pre-flight pg_policies query failed (${pre.status}): ${JSON.stringify(pre.body).slice(0, 300)}`);
const preRows = Array.isArray(pre.body) ? pre.body : [];
const preGated = preRows.some((r) => String(r.qual || '').includes('publish_status'));
console.log(`Pre-flight: policy row present=${preRows.length > 0}, already gated on publish_status=${preGated}`);

if (preGated) {
    console.log('✅ Publish gate already live on the database — skipping apply (idempotent).');
} else {
    // 1. Apply the migration (both statements are DROP IF EXISTS + CREATE —
    //    idempotent by design; no data is touched).
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    console.log(`Applying ${path.relative(ROOT, MIGRATION)} (${(sql.length / 1024).toFixed(1)} KB) to [${projectRef}]...`);
    const applied = await query(sql);
    if (!applied.ok) die(`apply failed (${applied.status}): ${JSON.stringify(applied.body).slice(0, 500)}`);
    console.log('✅ Migration applied.');

    // 2. Post-apply verification of the policy row.
    const post = await query(
        `SELECT policyname, qual FROM pg_policies
         WHERE schemaname='public' AND tablename='listings'
           AND policyname='Public can view active listings';`
    );
    if (!post.ok) die(`post-apply pg_policies query failed (${post.status})`);
    const postRows = Array.isArray(post.body) ? post.body : [];
    const postGated = postRows.some((r) => String(r.qual || '').includes('publish_status'));
    if (!postGated) die('policy exists but qual does not mention publish_status — unexpected');
    console.log('✅ Post-apply: live policy now requires (status=active AND publish_status=PUBLISHABLE) OR is_staff().');
}

// 3. Full harness (offline + live checks) — same token flows through env.
console.log('\nRunning RLS verification harness (pnpm test:rls)...');
try {
    execFileSync('bash', [HARNESS], {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: token, SUPABASE_PROJECT_REF: projectRef },
    });
} catch (err) {
    die(`RLS harness failed — inspect output above (exit ${err.status ?? '?'})`);
}

console.log('\n══════════════════════════════════════════════════════');
console.log('  PHASE D LIVE CUTOVER COMPLETE — public surface now');
console.log('  gated to PUBLISHABLE units at the DATABASE layer.');
console.log('══════════════════════════════════════════════════════');
process.exit(0);
