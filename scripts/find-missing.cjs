const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const envConfig = dotenv.parse(fs.readFileSync('infra/.env', 'utf8'));
const supabase = createClient(envConfig.SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

const missing = [
  'JXXRJZNKY9B4VJEB8H4CVPQ8J0',
  '01K2SVP13TKMJV5X8H61F8DNFS',
  'TheSquares',
  'emerald-estates-e-12800698',
  'SE-PF-CCGRG2-55K',
  'MSS6ZFWB9TEWGBBC1WCGHQZ48M',
  'SE-PF-4B9MZ8-65K',
  '01K1A9MJC3W14TFTFMM5WRQ906',
  'SE-PF-4PQBP4-65K',
  'Shrouk223',
  '01K5RVE1R8V7JM12Q1CS3YKD3S',
  'Elrehab'
];

async function check() {
  for (const m of missing) {
    const { data, error } = await supabase
      .from('listings')
      .select('id, code, unit_code, pf_reference_number, title, images')
      .or(`code.ilike.%${m}%,unit_code.ilike.%${m}%,pf_reference_number.ilike.%${m}%,title.ilike.%${m}%`)
      .limit(3);
    
    if (data && data.length) {
      console.log(`MATCHED: ${m} ->`, data.map(d => ({ code: d.code, ref: d.pf_reference_number, title: d.title })));
    } else {
      // Check if m is contained in images URLs
      const { data: imgData } = await supabase
        .from('listings')
        .select('id, code, unit_code, pf_reference_number, title')
        .contains('images', [m])
        .limit(1);
      if (imgData && imgData.length) {
        console.log(`MATCHED VIA IMAGE: ${m} ->`, imgData[0].code);
      } else {
        console.log(`NOT FOUND: ${m}`);
      }
    }
  }
}
check();
