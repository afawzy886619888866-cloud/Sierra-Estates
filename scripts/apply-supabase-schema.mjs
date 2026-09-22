import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'REDACTED-PROJECT';

async function run() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  SIERRA ESTATES — SUPABASE MASTER SCHEMA DEPLOYMENT');
  console.log('══════════════════════════════════════════════════════\n');

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
