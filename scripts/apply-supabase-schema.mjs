import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const token = process.env.SUPABASE_ACCESS_TOKEN;

/**
 * Target project ref — explicit env only. The previous hardcoded fallback
 * ('gaxfqcietzoonlmatiot') silently targeted one specific project; consistent
 * with packages/db credential resolution, we refuse to guess.
 */
function resolveProjectRef() {
  const explicit = (process.env.SUPABASE_PROJECT_REF || '').trim();
  if (explicit) return explicit;
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const derived = url.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1];
  return derived || '';
}

const projectRef = resolveProjectRef();

async function run() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  SIERRA ESTATES — SUPABASE MASTER SCHEMA DEPLOYMENT');
  console.log('══════════════════════════════════════════════════════\n');

  if (!projectRef) {
    console.error('❌ Target project unspecified. Set SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL — refusing to fall back to a hardcoded project ref.');
    process.exit(1);
  }
  if (!token) {
    console.error('❌ Missing SUPABASE_ACCESS_TOKEN (Supabase platform access token) — cannot reach the Management API.');
    process.exit(1);
  }

  const schemaPath = path.join(ROOT, 'supabase/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema not found: ${schemaPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log(`📖 Loaded supabase/schema.sql (${(sql.length / 1024).toFixed(1)} KB)...`);

  console.log(`🚀 Applying schema to Supabase project [${projectRef}] via Management API...`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ Schema deployment failed (${res.status}):`, errorText);
    process.exit(1);
  }

  const result = await res.json();
  console.log('✅ Master schema applied successfully!');

  // Verify created tables
  console.log('\n🔍 Verifying all public tables in Supabase...');
  const verifyRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    })
  });

  if (verifyRes.ok) {
    const tables = await verifyRes.json();
    console.log(`📊 Total public tables now: ${tables.length}`);
    console.log(tables.map(t => t.table_name).join(', '));
  }
}

run().catch(err => {
  console.error('Fatal error during schema apply:', err);
  process.exit(1);
});
