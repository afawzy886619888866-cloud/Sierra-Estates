const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('apps/sierra-estates-realty/.env.local', 'utf8'));
const apiKey = env.PROPERTY_FINDER_API_KEY;
const apiSecret = env.PROPERTY_FINDER_API_SECRET;
const gateway = env.PROPERTY_FINDER_API_GATEWAY || 'https://atlas.propertyfinder.com';

async function run() {
  const authRes = await fetch(`${gateway}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  });
  const { accessToken } = await authRes.json();
  const res = await fetch(`${gateway}/v1/listings?perPage=10`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
  });
  const data = await res.json();
  data.results.forEach(r => {
    console.log(r.id, '| ref:', r.reference, '| stage:', r.state?.stage, '| products:', JSON.stringify(r.products));
  });
}
run().catch(console.error);
