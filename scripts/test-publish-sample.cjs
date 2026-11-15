const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('apps/sierra-estates-realty/.env.local', 'utf8'));
const apiKey = env.PROPERTY_FINDER_API_KEY;
const apiSecret = env.PROPERTY_FINDER_API_SECRET;
const gateway = env.PROPERTY_FINDER_API_GATEWAY || 'https://atlas.propertyfinder.com';

const all88 = JSON.parse(fs.readFileSync('scripts/pf-88-analysis.json', 'utf8'));

async function testBatch() {
  const authRes = await fetch(`${gateway}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  });
  const { accessToken } = await authRes.json();

  // Test 5 listings with different prices / types
  const sample = [
    all88.find(x => x.ref === 'L K 1'), // 30k
    all88.find(x => x.ref === 'emerald-estates-e-10900244'), // 35k
    all88.find(x => x.ref === 'Miv 1132'), // 50k
    all88.find(x => x.ref === 'Mivida-009'), // 40k
    all88.find(x => x.price?.type === 'sale') // sale
  ].filter(Boolean);

  console.log(`Testing publish for ${sample.length} sample listings...`);

  for (const item of sample) {
    console.log(`\n--- Publishing ${item.id} (${item.ref}) price:`, item.price, '---');
    const pubRes = await fetch(`${gateway}/v1/listings/${item.id}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log('Publish HTTP:', pubRes.status);
    const pubBody = await pubRes.text();
    console.log('Publish Body:', pubBody);
  }

  console.log('\nWaiting 6 seconds for PF workers to process...');
  await new Promise(r => setTimeout(r, 6000));

  const listRes = await fetch(`${gateway}/v1/listings?perPage=50`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
  });
  const listData = await listRes.json();

  console.log('\n--- Checking status of published samples ---');
  for (const item of sample) {
    const found = listData.results?.find(r => r.id === item.id);
    if (found) {
      console.log(`Listing ${item.id} (${item.ref}):`);
      console.log('  Stage:', found.state?.stage);
      console.log('  Type:', found.state?.type);
      console.log('  Reasons:', found.state?.reasons);
    } else {
      console.log(`Listing ${item.id} (${item.ref}) not in first 50 results`);
    }
  }
}

testBatch().catch(console.error);
