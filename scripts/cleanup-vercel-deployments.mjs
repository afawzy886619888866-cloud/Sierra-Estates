import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

for (const p of ['.env', '.env.local', 'apps/sierra-estates-realty/.env.local']) {
  const full = path.resolve(process.cwd(), p);
  if (fs.existsSync(full)) {
    dotenv.config({ path: full, override: true });
  }
}

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_AUTH_TOKEN;
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID || 'team_UvdJ5ezVTaqEKyhqZ5QVqOKJ';

if (!VERCEL_TOKEN) {
  console.error('VERCEL_TOKEN not found');
  process.exit(1);
}

function vercelRequest(method, endpoint) {
  return new Promise((resolve, reject) => {
    const urlPath = `${endpoint}${endpoint.includes('?') ? '&' : '?'}teamId=${VERCEL_ORG_ID}`;
    const req = https.request({
      hostname: 'api.vercel.com',
      port: 443,
      path: urlPath,
      method,
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`🧹 [Vercel Storage Clean] Starting cleanup on team ${VERCEL_ORG_ID}...`);

  // Fetch up to 100 recent deployments
  const res = await vercelRequest('GET', '/v6/deployments?limit=100');
  const deployments = res.data?.deployments || [];
  console.log(`Total deployments retrieved: ${deployments.length}`);

  // Group by project
  const byProject = {};
  for (const d of deployments) {
    const proj = d.name || 'unknown';
    if (!byProject[proj]) byProject[proj] = [];
    byProject[proj].push(d);
  }

  let deletedCount = 0;
  let skippedCount = 0;

  for (const [projName, deps] of Object.entries(byProject)) {
    console.log(`\nAnalyzing project: ${projName} (${deps.length} deployments)...`);

    // Sort descending by creation date
    deps.sort((a, b) => b.created - a.created);

    let preservedProdCount = 0;

    for (const d of deps) {
      const isProd = d.target === 'production' && d.state === 'READY';

      // Keep latest 2 production ready deployments per project for rollback safety
      if (isProd && preservedProdCount < 2) {
        preservedProdCount++;
        console.log(`  [PRESERVE] Prod #${preservedProdCount}: ${d.uid} (${new Date(d.created).toISOString()}) - ${d.url}`);
        skippedCount++;
        continue;
      }

      // Delete cancelled, failed, preview, or older production deployments
      console.log(`  [DELETE] ${d.uid} | state: ${d.state} | target: ${d.target || 'preview'} | date: ${new Date(d.created).toISOString()}`);
      
      const delRes = await vercelRequest('DELETE', `/v13/deployments/${d.uid}`);
      if (delRes.status === 200 || delRes.status === 204) {
        deletedCount++;
        console.log(`    ✓ Deleted successfully`);
      } else {
        console.log(`    ✗ Delete status ${delRes.status}:`, delRes.data?.error?.message || delRes.data);
      }
      await sleep(150); // rate-limit friendly
    }
  }

  console.log(`\n🎉 [Vercel Storage Clean] Finished! Deleted ${deletedCount} unnecessary deployments, preserved ${skippedCount} active deployments.`);
}

main().catch(console.error);
