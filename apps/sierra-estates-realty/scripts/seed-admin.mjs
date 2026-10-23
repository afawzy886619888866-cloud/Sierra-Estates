#!/usr/bin/env node
/**
 * SIERRA ESTATES — ADMIN SEEDING SCRIPT (SUPABASE AUTHORITATIVE)
 *
 * Provisions or updates an administrative user in Supabase Auth and the
 * public.profiles table. This grants access to the staff admin portal.
 *
 * Usage:
 *   node scripts/seed-admin.mjs <email-or-uid> [--role admin] [--name "Full Name"] [--password "SecretPass"]
 *   pnpm --filter sierra-estates-client-page seed:admin -- ops@sierra-estates.net
 *
 * Credentials (loaded from .env.local or environment):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

// Load environment from workspace root and app local envs
[
  path.resolve(ROOT, '.env.local'),
  path.resolve(ROOT, '.env'),
  path.resolve(__dirname, '../.env.local'),
].forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
});

const ADMIN_PORTAL_ROLES = ['owner', 'agent', 'manager', 'admin', 'superadmin'];

function usage(message) {
  if (message) console.error(`❌ ${message}\n`);
  console.error('Usage: node scripts/seed-admin.mjs <email-or-uid> [--role admin] [--name "Full Name"] [--password "SecretPass"]');
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { target: '', role: 'admin', name: '', password: '' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--role') opts.role = String(argv[++i] ?? '').trim().toLowerCase();
    else if (arg === '--name') opts.name = String(argv[++i] ?? '').trim();
    else if (arg === '--password') opts.password = String(argv[++i] ?? '').trim();
    else if (arg.startsWith('--role=')) opts.role = arg.slice(7).trim().toLowerCase();
    else if (arg.startsWith('--name=')) opts.name = arg.slice(7).trim();
    else if (arg.startsWith('--password=')) opts.password = arg.slice(11).trim();
    else if (arg.startsWith('--')) usage(`Unknown flag: ${arg}`);
    else if (!opts.target) opts.target = arg.trim();
    else usage(`Unexpected argument: ${arg}`);
  }
  if (!opts.target) usage('Missing target email or uid.');
  if (!ADMIN_PORTAL_ROLES.includes(opts.role)) {
    usage(`Invalid role "${opts.role}". Expected one of: ${ADMIN_PORTAL_ROLES.join(', ')}`);
  }
  return opts;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL). Refusing to fall back to a hardcoded project URL — set it in .env.local.');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY. Cannot seed admin user without service role privileges.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function resolveOrCreateUser(target, name, password) {
  const isEmail = target.includes('@');
  if (isEmail) {
    const targetEmail = target.toLowerCase();
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Failed to list Supabase users: ${listError.message}`);
    }

    const found = (listData.users || []).find((u) => u.email?.toLowerCase() === targetEmail);
    if (found) {
      return found;
    }

    // Create user in Supabase Auth
    const finalPass = password || process.env.ADMIN_BOOTSTRAP_PASSWORD || 'SierraAdmin2026!Secure';
    console.log(`ℹ️ User not found in Supabase Auth. Creating new user: ${targetEmail}`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: targetEmail,
      password: finalPass,
      email_confirm: true,
      user_metadata: { full_name: name || 'Sierra Staff' },
    });

    if (createError || !createData?.user) {
      throw new Error(`Failed to create Supabase Auth user: ${createError?.message}`);
    }

    return createData.user;
  }

  // Target is UID
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(target);
  if (userError || !userData?.user) {
    throw new Error(`No Supabase user found with UID "${target}": ${userError?.message}`);
  }

  return userData.user;
}

async function main() {
  const { target, role, name, password } = parseArgs(process.argv.slice(2));

  console.log('🔐 Sierra Estates — Admin Seeding (Supabase)');
  console.log('═══════════════════════════════════════════');
  console.log(`📡 Connected to: ${supabaseUrl}`);

  const user = await resolveOrCreateUser(target, name, password);

  // Fetch existing profile if any
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const now = new Date().toISOString();
  const email = (user.email || existingProfile?.email || target).toLowerCase();
  const fullName = name || existingProfile?.full_name || user.user_metadata?.full_name || email.split('@')[0] || 'Sierra Staff';

  const profilePayload = {
    id: user.id,
    email,
    full_name: fullName,
    role,
    avatar_url: existingProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
    metadata: {
      source: 'seed-admin-supabase',
      approvedBy: process.env.SEED_ADMIN_ACTOR || 'seed-admin-script',
      updatedAt: now,
    },
  };

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' });

  if (upsertError) {
    throw new Error(`Failed to upsert Supabase profile: ${upsertError.message}`);
  }

  console.log('═══════════════════════════════════════════');
  console.log(existingProfile ? '♻️  Updated existing public.profiles record' : '🆕 Created new public.profiles record');
  console.log(`   id        : ${user.id}`);
  console.log(`   email     : ${email}`);
  console.log(`   name      : ${fullName}`);
  console.log(`   role      : ${existingProfile?.role ? `${existingProfile.role} → ${role}` : role}`);
  console.log('\n✅ Done. This account can now sign in to the admin portal via Supabase.');
}

main().catch((err) => {
  console.error('\n❌ SEEDING FAILED:', err?.message || err);
  process.exit(1);
});
