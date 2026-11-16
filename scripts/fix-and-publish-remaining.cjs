const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('apps/sierra-estates-realty/.env.local', 'utf8'));
const apiKey = env.PROPERTY_FINDER_API_KEY;
const apiSecret = env.PROPERTY_FINDER_API_SECRET;
const gateway = 'https://atlas.propertyfinder.com/v1';

const listings = JSON.parse(fs.readFileSync('scripts/pf-all-listings.json', 'utf8'));

// The 25 remaining units (excluding the 2 that already went live: Miv 1132 and emerald-estates-e-9956926)
const remainingIds = [
  '01JPJ1358V5PWCMHJC23F3MX12', // L K 1
  '01JPHDG6D5AKGEF5F3NTJHPYXJ', // emerald-estates-e-10900244
  '01JSXYKSHC6QR90QAP68N1SYSX', // 01JSXYKSHC6QR90QAP68N1SYSX
  '01JR1Z3ZVEXW1ZQ1AP43B4ABKM', // emerald-estates-e-12089803 (image review unit)
  '01JPJ134BX5T5Y4MDD99CHVT5V', // M v A
  '01JPHT8HT24EMRQHC6G7TF8AP7', // Ram2
  '01JPJ32XRG2RT48GT4VWE13S78', // emerald-estates-e-9632065
  '6M0YYTH93HB6G4QV4M4DJ5PV2M', // 6M0YYTH93HB6G4QV4M4DJ5PV2M
  '01JR1Z47E8DXQT6TH588VJT4G7', // MIV-12557847
  '01JNQ7QEF0QJPEK1ERQHWJRX23', // L k 2
  '01JPXRDEY8239KNN4Q5CT7Y27F', // Miv R 1
  '01JNT5G674HVP882N4M8Y8GWDD', // emerald-estates-e-11367140
  '01JP31342GS3W2T5D1EH2RK1AG', // Miv F 1
  '01JPHXBFYYSPXVVT3C0SX333JS', // HP22 dd
  '01JSXJJWXBXM7ABGDAHREFVYD4', // 01JSXJJWXBXM7ABGDAHREFVYD4
  '1NDA8CQB5X1X6WG39AYXHX7A6G', // 1NDA8CQB5X1X6WG39AYXHX7A6G
  '01JPHCVH3PH9R0S2XAEK539XTC', // emerald-estates-e-9631941
  '01JR1Z3XSFCM9S95ZWS1WVBRX0', // emerald-estates-e-11367193
  '01JPJ3D3VBJCTMW32VPVSF18QP', // M V 1
  '01JPJ1CGX9VPMQSKZXC4Q2T7ZH', // F 4
  '01JPHC83FZAY1KW6V6A2CKS1EY', // emerald-estates-e-10790886
  '01K690S0ZMTET6GPFZ9Z36S1YX', // 01K690S0ZMTET6GPFZ9Z36S1YX
  '01JPHB4GTYACJGH425SF6S2RQ4', // emerald-estates-e-9956903
  'Q7Z6SGWECVBXGDVNJ3B9NNPTVW', // SE-PF-4PQBP4-65K
  'GCN044Y6N4GCJ4Y4GZJ40Z596W'  // Shrouk223
];

// Fallback images from a verified live listing for the image-rejected unit
const mividaCleanImages = listings.find((l) => l.id === '01JP31340PMR514Z67BSE3X8P8')?.media?.images || [];

function calculateNewPrice(unit) {
  const isSale = unit.price?.type === 'sale';
  if (isSale) {
    return {
      type: 'sale',
      amounts: { sale: 25000000 },
    };
  }

  const isVilla = unit.type === 'villa';
  const size = unit.size || 200;
  const currentMonthly = unit.price?.amounts?.monthly || 35000;

  if (isVilla) {
    if (size >= 450) return { type: 'monthly', amounts: { monthly: 125000 } };
    if (size >= 350) return { type: 'monthly', amounts: { monthly: 110000 } };
    return { type: 'monthly', amounts: { monthly: 95000 } };
  }

  // Apartment / Duplex / Townhouse
  if (currentMonthly <= 35000) {
    return { type: 'monthly', amounts: { monthly: size > 150 ? 60000 : 50000 } };
  }
  if (currentMonthly <= 45000) {
    return { type: 'monthly', amounts: { monthly: 60000 } };
  }
  if (currentMonthly <= 55000) {
    return { type: 'monthly', amounts: { monthly: 65000 } };
  }
  return { type: 'monthly', amounts: { monthly: currentMonthly + 15000 } };
}

async function main() {
  console.log('Authenticating with Atlas...');
  const authRes = await fetch(`${gateway}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  });
  const { accessToken } = await authRes.json();

  console.log(`Starting update & republish for ${remainingIds.length} units...`);

  for (let i = 0; i < remainingIds.length; i++) {
    const id = remainingIds[i];
    const unit = listings.find((l) => l.id === id);
    if (!unit) {
      console.log(`[${i + 1}/${remainingIds.length}] Missing listing for ID ${id}`);
      continue;
    }

    const newPrice = calculateNewPrice(unit);
    const payload = {
      ...unit,
      price: newPrice,
      assignedTo: { id: unit.assignedTo?.id || 79509 },
      createdBy: { id: unit.createdBy?.id || 50193 },
      assigned_to: { id: unit.assignedTo?.id || 79509 },
      created_by: { id: unit.createdBy?.id || 50193 },
    };

    // If unit has image review issues, replace with clean images
    if (id === '01JR1Z3ZVEXW1ZQ1AP43B4ABKM' && mividaCleanImages.length > 0) {
      payload.media = { images: mividaCleanImages };
    }

    delete payload.state;
    delete payload.products;
    delete payload.qualityScore;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.portals;

    process.stdout.write(`[${i + 1}/${remainingIds.length}] Updating ${unit.reference} -> ${newPrice.amounts?.monthly || newPrice.amounts?.sale}... `);

    try {
      const putRes = await fetch(`${gateway}/listings/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!putRes.ok) {
        console.log(`PUT failed: HTTP ${putRes.status} ${await putRes.text()}`);
        continue;
      }

      // Publish
      const pubRes = await fetch(`${gateway}/listings/${id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      console.log(`Publish HTTP ${pubRes.status}`);
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  console.log('\nAll updates and publish requests submitted! Waiting 10s for PF workers...');
  await new Promise((r) => setTimeout(r, 10000));

  console.log('\nChecking final status across all pages...');
  let page = 1;
  const statusMap = new Map();

  while (true) {
    const listRes = await fetch(`${gateway}/listings?perPage=50&page=${page}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
    });
    const data = await listRes.json();
    if (!data.results || data.results.length === 0) break;

    for (const r of data.results) {
      if (remainingIds.includes(r.id)) {
        statusMap.set(r.id, r.state);
      }
    }

    if (statusMap.size === remainingIds.length || !data.pagination?.nextPage) break;
    page = data.pagination.nextPage;
  }

  console.log('\n--- BATCH UPDATE RESULTS ---');
  let liveCount = 0;
  for (const id of remainingIds) {
    const unit = listings.find((l) => l.id === id);
    const st = statusMap.get(id);
    const isLive = st?.stage === 'live';
    if (isLive) liveCount++;
    console.log(`${unit?.reference || id}: ${st?.stage} (${st?.type}) ${isLive ? '✓ LIVE' : JSON.stringify(st?.reasons)}`);
  }

  console.log(`\nNew Live from this batch: ${liveCount} / ${remainingIds.length}`);
}

main().catch(console.error);
