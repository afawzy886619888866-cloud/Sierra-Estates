const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('apps/sierra-estates-realty/.env.local', 'utf8'));
const apiKey = env.PROPERTY_FINDER_API_KEY;
const apiSecret = env.PROPERTY_FINDER_API_SECRET;
const gateway = env.PROPERTY_FINDER_API_GATEWAY || 'https://atlas.propertyfinder.com';

async function check() {
  const authRes = await fetch(`${gateway}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  });
  const { accessToken } = await authRes.json();
  const res = await fetch(`${gateway}/v1/listings?perPage=100`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
  });
  const data = await res.json();
  const found = data.results?.find(r => r.id === '01JPJ134EVEJYBTV0YS1NBH7RW');
  console.log('Listing details:', found ? {
    id: found.id,
    ref: found.reference,
    category: found.category,
    type: found.type,
    offeringType: found.offeringType,
    price: found.price,
    state: found.state,
    reasons: JSON.stringify(found.state?.reasons, null, 2),
    products: found.products
  } : 'Not found in first 100');
}
check().catch(console.error);
