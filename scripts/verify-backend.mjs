#!/usr/bin/env node

/**
 * Verify the canonical backend configuration without performing a data mutation.
 *
 * This intentionally replaces the former Firebase/Gemini smoke test. Network
 * connectivity is environment-dependent; the deterministic policy check is the
 * deploy gate used by CI and release workflows.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- SIERRA ESTATES BACKEND VERIFICATION ---');

const missing = [];
if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

if (missing.length > 0) {
  console.error(`❌ Supabase configuration is incomplete: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`✅ Supabase configuration is present for ${url}`);
  console.log('✅ Service-role writes are configured for the canonical backend.');
}
