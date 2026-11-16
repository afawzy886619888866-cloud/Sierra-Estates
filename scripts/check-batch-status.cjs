const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('apps/sierra-estates-realty/.env.local', 'utf8'));
const apiKey = env.PROPERTY_FINDER_API_KEY;
const apiSecret = env.PROPERTY_FINDER_API_SECRET;
const gateway = env.PROPERTY_FINDER_API_GATEWAY || 'https://atlas.propertyfinder.com';

async function checkIds() {
  const checkIds = [
    '01JPJ1358V5PWCMHJC23F3MX12', // L K 1
    '01JPHDG6D5AKGEF5F3NTJHPYXJ', // emerald-estates-e-10900244
    '01JP31340PMR514Z67BSE3X8P8', // Mivida-009
    'GCN044Y6N4GCJ4Y4GZJ40Z596W', // Shrouk223
    '01JPJ134EVEJYBTV0YS1NBH7RW'  // emerald-estates-e-9956926
  ];

  const authRes = await fetch(`${gateway}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  });
  const { accessToken } = await authRes.json();

  let all = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${gateway}/v1/listings?perPage=50&page=${page}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
    });
    const d = await res.json();
    all = all.concat(d.results || []);
    if (!d.pagination?.nextPage || d.results.length === 0) break;
    page = d.pagination.nextPage;
  }

  for (const id of checkIds) {
    const found = all.find(x => x.id === id);
    if (found) {
      console.log(`[${found.reference}] (id: ${id}) -> stage: ${found.state?.stage} | type: ${found.state?.type} | reasons: ${JSON.stringify(found.state?.reasons || [])}`);
    }
  }
}

checkIds().catch(console.error);
