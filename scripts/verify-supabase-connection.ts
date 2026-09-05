import dotenv from 'dotenv';
import path from 'path';

// Load .env.local from apps/sierra-estates-realty
dotenv.config({ path: path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local') });
dotenv.config(); // fallback

import { resolveSupabaseUrl, isSupabaseConfigured, isSupabaseAdminConfigured, getSupabase } from '../packages/db/lib/supabase';
import { listRecords } from '../packages/db/lib/records';

async function checkConnection() {
  console.log('====================================================');
  console.log('🔍 Checking Supabase Credentials & Database Connectivity');
  console.log('====================================================');

  const url = resolveSupabaseUrl();
  const configured = isSupabaseConfigured();
  const adminConfigured = isSupabaseAdminConfigured();

  console.log(`- Supabase URL: ${url}`);
  console.log(`- Anon Key Configured: ${configured}`);
  console.log(`- Service Role Key Configured: ${adminConfigured}`);

  if (!configured && !adminConfigured) {
    console.log('⚠️ No live credentials in environment; running in offline mock mode.');
    return;
  }

  try {
    console.log('\nQuerying public listings catalog via Supabase client...');
    const client = getSupabase();
    const { data, error, count } = await client
      .from('listings')
      .select('id, title, price, compound, bedrooms', { count: 'exact' })
      .limit(5);

    if (error) {
      console.warn('Query returned error:', error.message);
    } else {
      console.log(`✅ Connection Successful! Found ${count ?? data?.length ?? 0} total properties in catalog.`);
      if (data && data.length > 0) {
        console.log('Sample properties:');
        data.forEach((p: any, i: number) => {
          console.log(`  ${i + 1}. [${p.compound || 'New Cairo'}] ${p.title || 'Luxury Unit'} - ${p.price ? Number(p.price).toLocaleString() + ' EGP' : 'Price on request'}`);
        });
      }
    }
  } catch (err: any) {
    console.warn('Database query encountered exception:', err.message);
  }
}

checkConnection();
