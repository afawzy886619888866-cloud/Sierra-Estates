const fs = require('fs');

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
const allListings = JSON.parse(fs.readFileSync('scripts/pf-all-listings.json', 'utf8'));

const analysis = [];

for (const item of items) {
  const norm = item.toLowerCase().replace(/\s+/g, ' ');
  const normNoSpaces = item.toLowerCase().replace(/[\s\-_]/g, '');

  const found = allListings.find(l => {
    const id = String(l.id || '').toLowerCase();
    const ref = String(l.reference || '').toLowerCase().replace(/\s+/g, ' ');
    const refNoSpaces = String(l.reference || '').toLowerCase().replace(/[\s\-_]/g, '');

    return id === norm || ref === norm || id === normNoSpaces || refNoSpaces === normNoSpaces;
  });

  if (found) {
    analysis.push({
      item,
      id: found.id,
      ref: found.reference,
      category: found.category,
      type: found.type,
      offeringType: found.offeringType,
      price: found.price,
      stage: found.state?.stage,
      stateType: found.state?.type,
      reasons: found.state?.reasons,
      products: found.products,
      title: found.title?.en || found.title?.ar,
      qualityScore: found.qualityScore
    });
  }
}

console.log('Total analyzed:', analysis.length);

// Reason distribution
const reasonMap = {};
for (const a of analysis) {
  const rList = a.reasons || [];
  const text = rList.map(r => r.en || r.ar || JSON.stringify(r)).join('; ') || 'No reason specified';
  reasonMap[text] = (reasonMap[text] || 0) + 1;
}
console.log('\n--- Reasons why they are taken down ---');
console.log(reasonMap);

// Products distribution
const prodMap = {};
for (const a of analysis) {
  const prods = Object.keys(a.products || {}).join('+') || 'none';
  prodMap[prods] = (prodMap[prods] || 0) + 1;
}
console.log('\n--- Current products on these listings ---');
console.log(prodMap);

fs.writeFileSync('scripts/pf-88-analysis.json', JSON.stringify(analysis, null, 2), 'utf8');
