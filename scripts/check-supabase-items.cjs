const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const envConfig = dotenv.parse(fs.readFileSync('infra/.env', 'utf8'));
const supabaseUrl = envConfig.SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing in infra/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const userListRaw = `
emerald-estates-e-9956926
L K 1
emerald-estates-e-10900244
emerald-estates-e-9956916
01JSXYKSHC6QR90QAP68N1SYSX
emerald-estates-e-12089803
01K51GQAAJYYZ3AT1R75VXED6R
01K62W93C23P0Z78RYZFJN4JNY
M v A
7DWHF7TG5YC61395454KQ07KQR
Miv 1132
Water way 2 jan 29
Ram2
emerald-estates-e-9632065
Mivida-009
MovIL1
6M0YYTH93HB6G4QV4M4DJ5PV2M
emerald-estates-e-11367099
01K4WS0DM4ZFAT70EZZQ7DPX4P
emerald-estates-e-9706051
rehab11
01K2T6XPA3MEKW9GYGT2TPDR0P
MIV-12557847
emerald-estates-e-13195662
L k 2
01K5XTQ82TRZ80QT4DR0NWT1RH
Miv R 1
YEVNBV6613HTCSAS9RW2GQB0J0
Miv F3
emerald-estates-e-11367140
emerald-estates-e-11326929
01K7K61XAPHY39BDB0A24PQBP4
Miv F 1
emerald-estates-e-9632054
emerald-estates-e-10899849
emerald-estates-e-9956925
Mv rVr
HP22 dd
Hys 2 F
JXXRJZNKY9B4VJEB8H4CVPQ8J0
01JSXJJWXBXM7ABGDAHREFVYD4
D6EJRZGGGE4548BBXT0J4RCMJG
01K2SVP13TKMJV5X8H61F8DNFS
1NDA8CQB5X1X6WG39AYXHX7A6G
East1
01K7F8FA12MK5HMGCQ71781B4P
shreouk
KW4AWG2YTHDAJV8A4VRB8SVBFM
emerald-estates-e-9631941
TheSquares
emerald-estates-e-11367193
5Y14H06SACZY7D0FFXA2P5K47C
01K5RTG1FY1PPTJWYHXB65SK5D
66DF297KA16TR1BJHQJX6WKZXG
M V 1
emerald-estates-e-12800698
F 4
01K4VGT1VM7ADJ77HHZBGRG1VX
emerald-estates-e-10790886
01K690S0ZMTET6GPFZ9Z36S1YX
emerald-estates-e-12557864
SE-PF-CCGRG2-55K
emerald-estates-e-10765199
MSS6ZFWB9TEWGBBC1WCGHQZ48M
emerald-estates-e-11367241
SE-PF-4B9MZ8-65K
emerald-estates-e-11755364
01K1A9MJC3W14TFTFMM5WRQ906
01K2TCG4VX5EAEB8ABAVD61F8H
Park 25 jan tt
emerald-estates-e-9956903
S F
0BMW0NT2XSN6V75C23YXAHC580
SE-PF-4PQBP4-65K
Shrouk223
shr1144
miv f9
01K5RVE1R8V7JM12Q1CS3YKD3S
emerald-estates-e-9743549
Miv F5
emerald-estates-e-12557793
Elrehab
01K7TP499WDGNE4EC0J3SC1A3F
01K8H4PAAJERQGVMHDD2Q59DMX
Mivida-0010
emerald-estates-e-13195577
emerald-estates-e-11367070
01K1ZMW49Y86VF68JTT0Q4ZSX6
`;

const items = userListRaw.trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean);

async function run() {
  console.log('Querying Supabase listings for items...');

  const found = [];
  const notFound = [];

  for (const item of items) {
    const filter = `code.eq.${item},unit_code.eq.${item},pf_reference_number.eq.${item},id.eq.${item}`;
    const { data, error } = await supabase
      .from('listings')
      .select('id, code, unit_code, pf_reference_number, pf_status, publish_status, status, title, compound, price, deal_type')
      .or(filter)
      .limit(5);

    if (error) {
      console.error('Query error for', item, error.message);
      continue;
    }

    if (data && data.length > 0) {
      found.push({ item, records: data });
    } else {
      notFound.push(item);
    }
  }

  console.log(`Found in Supabase: ${found.length} / ${items.length}`);
  console.log(`Not directly matched: ${notFound.length}`);
  if (found.length > 0) {
    console.log('Sample found record:', JSON.stringify(found[0], null, 2));
  }
  if (notFound.length > 0) {
    console.log('Sample not found:', notFound.slice(0, 15));
  }
}

run().catch(console.error);
