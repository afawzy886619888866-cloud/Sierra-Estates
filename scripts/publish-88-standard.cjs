const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('apps/sierra-estates-realty/.env.local', 'utf8'));
const apiKey = env.PROPERTY_FINDER_API_KEY;
const apiSecret = env.PROPERTY_FINDER_API_SECRET;
const gateway = 'https://atlas.propertyfinder.com/v1';

const all88 = JSON.parse(fs.readFileSync('scripts/pf-88-analysis.json', 'utf8'));

async function main() {
  console.log('Authenticating with Atlas at', `${gateway}/auth/token...`);
  const authRes = await fetch(`${gateway}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  });

  if (!authRes.ok) {
    throw new Error(`Auth failed: HTTP ${authRes.status} ${await authRes.text()}`);
  }

  const { accessToken } = await authRes.json();
  console.log('Got access token. Starting publishing batch of 88 listings in standard mode...');

  const results = [];

  for (let i = 0; i < all88.length; i++) {
    const item = all88[i];
    process.stdout.write(`[${i + 1}/${all88.length}] Publishing ${item.ref} (${item.id})... `);

    try {
      const pubRes = await fetch(`${gateway}/listings/${item.id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const bodyText = await pubRes.text();
      let bodyJson = {};
      try {
        bodyJson = JSON.parse(bodyText);
      } catch (e) {}

      console.log(`HTTP ${pubRes.status} (${bodyJson.state?.type || bodyText.slice(0, 50)})`);
      results.push({
        index: i + 1,
        ref: item.ref,
        id: item.id,
        httpStatus: pubRes.status,
        response: bodyJson,
      });
    } catch (err) {
      console.log('ERROR:', err.message);
      results.push({
        index: i + 1,
        ref: item.ref,
        id: item.id,
        error: err.message,
      });
    }

    // Rate limit delay: 200ms
    await new Promise((r) => setTimeout(r, 200));
  }

  fs.writeFileSync('scripts/pf-publish-batch-results.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('\nAll 88 publish requests sent! Initial responses saved to scripts/pf-publish-batch-results.json.');
}

main().catch(console.error);
