import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

const env = process.env;
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || env.POSTGRES_URL || null;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || null;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || null;

console.log('🧭 Canonical backend policy check');
console.log(`  backend: supabase`);
console.log(`  url: ${url ? 'configured' : 'missing'}`);
console.log(`  anon key: ${anonKey ? 'configured' : 'missing'}`);
console.log(`  service-role key: ${serviceRoleKey ? 'configured' : 'missing'}`);

if (!url || !anonKey) {
  console.error('\n❌ Canonical backend policy failed: Supabase URL and anon key are required.');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('\n❌ Canonical backend policy failed: service-role key is required for write operations.');
  process.exit(1);
}

console.log('\n✅ Supabase is configured as the canonical backend for writes.');
