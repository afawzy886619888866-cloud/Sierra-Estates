const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('apps/sierra-estates-realty/.env.local', 'utf8'));
const apiKey = env.PROPERTY_FINDER_API_KEY;
const apiSecret = env.PROPERTY_FINDER_API_SECRET;
const gateway = env.PROPERTY_FINDER_API_GATEWAY || 'https://atlas.propertyfinder.com';

async function testPublishOne() {
  const allListings = JSON.parse(fs.readFileSync('scripts/pf-all-listings.json', 'utf8'));
  const testListing = allListings.find(l => l.reference === 'emerald-estates-e-9956926');

  if (!testListing) {
    console.error('Test listing not found');
    return;
  }

  console.log('Testing publish for:', testListing.id, testListing.reference);
  console.log('Current state:', testListing.state);

  const authRes = await fetch(`${gateway}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  });
  const { accessToken } = await authRes.json();

  const publishRes = await fetch(`${gateway}/v1/listings/${testListing.id}/publish`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  console.log('Publish status code:', publishRes.status);
  const text = await publishRes.text();
  console.log('Publish response:', text);

  // If publish succeeded or returned status, let's also check get listing state
  if (publishRes.ok) {
    const checkRes = await fetch(`${gateway}/v1/listings/${testListing.id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
    });
    const checkData = await checkRes.json();
    console.log('Updated state:', checkData.state);
    console.log('Updated products:', checkData.products);
  }
}

testPublishOne().catch(console.error);
