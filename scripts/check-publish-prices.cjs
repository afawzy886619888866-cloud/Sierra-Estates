const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('apps/sierra-estates-realty/.env.local', 'utf8'));
const apiKey = env.PROPERTY_FINDER_API_KEY;
const apiSecret = env.PROPERTY_FINDER_API_SECRET;
const gateway = env.PROPERTY_FINDER_API_GATEWAY || 'https://atlas.propertyfinder.com';

async function checkPrices() {
  const authRes = await fetch(`${gateway}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  });
  const { accessToken } = await authRes.json();
  const res = await fetch(`${gateway}/v1/listings/01JPJ134EVEJYBTV0YS1NBH7RW/upgrades`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
  });
  console.log('Upgrades Status:', res.status);
  console.log('Upgrades Response:', await res.text());
}
checkPrices().catch(console.error);
