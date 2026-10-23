import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local') });
dotenv.config();

import { listRecords, getRecord } from '../packages/db/lib/records';
import { getSupabase } from '../packages/db/lib/supabase';

async function testAll() {
  console.log('Testing @sierra-estates/db record layer on live Supabase:');
  
  const compounds = await listRecords<{ name: string; zone: string; aiScore: number }>('compounds', { limit: 5 });
  console.log('✅ Compounds loaded via record layer:', compounds.length);
  compounds.forEach(c => console.log(`   - ${c.name} (${c.zone}) [Score: ${c.aiScore}]`));

  const devs = await listRecords<{ name: string; tier: string }>('developers', { limit: 5 });
  console.log('✅ Developers loaded via record layer:', devs.length);
  devs.forEach(d => console.log(`   - ${d.name} (${d.tier})`));

  const owners = await listRecords<{ ownerName: string; primaryMobile: string }>('owners', { limit: 5 });
  console.log('✅ Owners sample via record layer:', owners.length);
  owners.forEach(o => console.log(`   - ${o.ownerName} (${o.primaryMobile})`));

  const bots = await listRecords<{ id: string; status: string }>('system_status', { limit: 5 });
  console.log('✅ Bots status via record layer:', bots.length);
  bots.forEach(b => console.log(`   - ${b.id}: ${b.status}`));

  const kb = await listRecords<{ title: string; tags: string[] }>('knowledge_base', { limit: 5 });
  console.log('✅ Knowledge base via record layer:', kb.length);
  kb.forEach(k => console.log(`   - ${k.title}`));

  console.log('\n🎉 ALL SUPABASE TABLES READABLE THROUGH MONOREPO RECORD LAYER!');
}

testAll().catch(err => {
  console.error('Record layer test failed:', err);
  process.exit(1);
});
