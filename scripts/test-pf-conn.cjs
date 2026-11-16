const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('apps/sierra-estates-realty/.env.local', 'utf8'));
const apiKey = env.PROPERTY_FINDER_API_KEY;
const apiSecret = env.PROPERTY_FINDER_API_SECRET;
const gateway = env.PROPERTY_FINDER_API_GATEWAY || 'https://atlas.propertyfinder.com';

console.log('Testing PF API with gateway:', gateway);
console.log('API Key length:', apiKey ? apiKey.length : 0);

async function testAuth() {
  try {
    const res = await fetch(`${gateway}/v1/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ apiKey, apiSecret }),
    });

    console.log('Auth HTTP status:', res.status);
    const text = await res.text();
    console.log('Auth response:', text.slice(0, 300));

    if (res.ok) {
      const { accessToken } = JSON.parse(text);
      console.log('Got access token, testing /v1/credits/balance ...');
      const creditRes = await fetch(`${gateway}/v1/credits/balance`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      console.log('Credits status:', creditRes.status);
      console.log('Credits balance:', await creditRes.text());
    }
  } catch (err) {
    console.error('Test error:', err.message);
  }
}

testAuth();
