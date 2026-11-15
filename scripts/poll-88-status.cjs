const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('apps/sierra-estates-realty/.env.local', 'utf8'));
const apiKey = env.PROPERTY_FINDER_API_KEY;
const apiSecret = env.PROPERTY_FINDER_API_SECRET;
const gateway = 'https://atlas.propertyfinder.com/v1';

const all88 = JSON.parse(fs.readFileSync('scripts/pf-88-analysis.json', 'utf8'));
const targetIds = new Set(all88.map((x) => x.id));

async function main() {
  console.log('Authenticating with Atlas...');
  const authRes = await fetch(`${gateway}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  });

  if (!authRes.ok) {
    throw new Error(`Auth failed: HTTP ${authRes.status} ${await authRes.text()}`);
  }

  const { accessToken } = await authRes.json();

  console.log('Fetching all listings from Property Finder to check status...');
  let page = 1;
  const statusMap = new Map();

  while (true) {
    const res = await fetch(`${gateway}/listings?perPage=50&page=${page}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    const data = await res.json();
    if (!data.results || data.results.length === 0) break;

    for (const r of data.results) {
      if (targetIds.has(r.id)) {
        statusMap.set(r.id, {
          id: r.id,
          reference: r.reference,
          stage: r.state?.stage,
          type: r.state?.type,
          reasons: r.state?.reasons || [],
          price: r.price,
          category: r.category,
          products: r.products,
          title: r.title?.en || r.title?.ar,
        });
      }
    }

    if (statusMap.size === targetIds.size || !data.pagination?.nextPage) break;
    page = data.pagination.nextPage;
  }

  console.log(`Matched ${statusMap.size} of ${targetIds.size} target listings.`);

  const fullReport = all88.map((item, idx) => {
    const live = statusMap.get(item.id);
    return {
      index: idx + 1,
      userInput: item.item,
      ref: item.ref,
      id: item.id,
      stage: live?.stage || 'unknown',
      stateType: live?.type || 'unknown',
      reasons: live?.reasons || [],
      price: live?.price || item.price,
      title: live?.title || item.title,
      products: live?.products || item.products,
    };
  });

  fs.writeFileSync('scripts/pf-88-final-status.json', JSON.stringify(fullReport, null, 2), 'utf8');

  // Summary counts
  const stageCounts = {};
  const failureReasons = {};

  for (const item of fullReport) {
    stageCounts[item.stage] = (stageCounts[item.stage] || 0) + 1;
    if (item.reasons && item.reasons.length > 0) {
      for (const r of item.reasons) {
        const text = r.en || r.ar || JSON.stringify(r);
        failureReasons[text] = (failureReasons[text] || 0) + 1;
      }
    }
  }

  console.log('\n=======================================');
  console.log('         STATUS SUMMARY (88 ITEMS)    ');
  console.log('=======================================');
  console.log('Stages:', stageCounts);
  console.log('\nFailure reasons encountered:');
  for (const [r, cnt] of Object.entries(failureReasons)) {
    console.log(`  - [${cnt} listings]: ${r}`);
  }
}

main().catch(console.error);
