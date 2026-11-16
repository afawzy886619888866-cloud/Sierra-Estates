const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('apps/sierra-estates-realty/.env.local', 'utf8'));
const apiKey = env.PROPERTY_FINDER_API_KEY;
const apiSecret = env.PROPERTY_FINDER_API_SECRET;
const gateway = 'https://atlas.propertyfinder.com/v1';

const listings = JSON.parse(fs.readFileSync('scripts/pf-all-listings.json', 'utf8'));

const mividaCleanImages = listings.find((l) => l.id === '01JP31340PMR514Z67BSE3X8P8')?.media?.images || [];
const approvedImagesItem4 = listings.find((l) => l.id === '01JPHTTH4WDXAJ590H2CHHSJRG')?.media?.images || [];

async function main() {
  const authRes = await fetch(`${gateway}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  });
  const { accessToken } = await authRes.json();

  const toFix = [
    {
      id: '01JR1Z3W3TM37NZHF3TD5X9VCG',
      ref: 'Miv F3',
      images: mividaCleanImages,
      price: { type: 'monthly', amounts: { monthly: 60000 } },
    },
    {
      id: '01JR1Z3VXAEE3WYQEDBRNNYEE9',
      ref: 'Mivida-0010',
      images: mividaCleanImages,
      price: { type: 'monthly', amounts: { monthly: 60000 } },
    },
    {
      id: '01JNTC2BNPEQ18C8XB2H4R0CZT',
      ref: 'emerald-estates-e-11755364',
      images: approvedImagesItem4,
      price: { type: 'monthly', amounts: { monthly: 50000 } },
    },
  ];

  for (const item of toFix) {
    const unit = listings.find((l) => l.id === item.id);
    if (!unit) continue;

    console.log(`\n--- Updating ${item.ref} (${item.id}) ---`);
    const payload = {
      ...unit,
      media: { images: item.images },
      price: item.price,
      assignedTo: { id: unit.assignedTo?.id || 79509 },
      createdBy: { id: unit.createdBy?.id || 50193 },
      assigned_to: { id: unit.assignedTo?.id || 79509 },
      created_by: { id: unit.createdBy?.id || 50193 },
    };
    delete payload.state;
    delete payload.products;
    delete payload.qualityScore;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.portals;

    const putRes = await fetch(`${gateway}/listings/${item.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    console.log(`PUT ${item.ref} status:`, putRes.status);

    const pubRes = await fetch(`${gateway}/listings/${item.id}/publish`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    console.log(`Publish ${item.ref} status:`, pubRes.status);
  }

  console.log('\nWaiting 10s for PF workers...');
  await new Promise((r) => setTimeout(r, 10000));

  const checkIds = new Set(toFix.map((x) => x.id));
  let page = 1;
  while (true) {
    const listRes = await fetch(`${gateway}/listings?perPage=50&page=${page}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
    });
    const data = await listRes.json();
    if (!data.results || data.results.length === 0) break;

    for (const r of data.results) {
      if (checkIds.has(r.id)) {
        console.log(`Listing ${r.reference} (${r.id}): ${r.state?.stage} (${r.state?.type})`);
        checkIds.delete(r.id);
      }
    }
    if (checkIds.size === 0 || !data.pagination?.nextPage) break;
    page = data.pagination.nextPage;
  }
}

main().catch(console.error);
