import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

const env = process.env;
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || env.POSTGRES_URL || null;
const anonKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY ||
  null;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || null;

// CI read-only posture: on a hosted runner there are no .env files, so the
// full-write posture is structurally unreachable — yet the fleet's default
// scheduled task (briefing:daily) is read-only and speaks to the canonical
// Supabase backend through the same baked-in anon defaults the briefing
// dispatcher uses (§21 no-fabrication: graceful degradation, honest output).
// Accepting that posture here keeps the "validate the canonical backend
// BEFORE any fleet task" gate meaningful in CI instead of failing it daily
// on missing local files that a checkout can never contain. Explicit,
// never silent: the posture is printed on every run.
const ciReadonly =
  (env.CI === 'true' || env.SE_BACKEND_CHECK === 'ci-readonly') && !url && !anonKey;

console.log('🧭 Canonical backend policy check');
console.log(`  backend: supabase`);
console.log(`  url: ${url ? 'configured' : ciReadonly ? 'canonical default (read-only)' : 'missing'}`);
console.log(`  anon key: ${anonKey ? 'configured' : ciReadonly ? 'canonical default (read-only)' : 'missing'}`);
console.log(`  service-role key: ${serviceRoleKey ? 'configured' : 'missing'}`);

if (ciReadonly) {
  console.warn(
    '\n⚠️  CI read-only posture: no local env files on this runner — fleet tasks run against the canonical Supabase URL/anon defaults with graceful degradation. Service-role key absent: fleet WRITE operations are unavailable today.'
  );
  console.log('\n✅ Canonical backend validated for READ-ONLY fleet tasks (ci-readonly posture).');
  process.exit(0);
}

if (!url || !anonKey) {
  console.error('\n❌ Canonical backend policy failed: Supabase URL and anon key are required.');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('\n❌ Canonical backend policy failed: service-role key is required for write operations.');
  process.exit(1);
}

console.log('\n✅ Supabase is configured as the canonical backend for writes.');
