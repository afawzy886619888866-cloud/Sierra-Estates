const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('apps/sierra-estates-realty/.env.local', 'utf8'));
const apiKey = env.PROPERTY_FINDER_API_KEY;
const apiSecret = env.PROPERTY_FINDER_API_SECRET;
const gateway = 'https://atlas.propertyfinder.com/v1';

const listings = JSON.parse(fs.readFileSync('scripts/pf-all-listings.json', 'utf8'));

const validAmenities = new Set([
  'balcony', 'barbecue-area', 'built-in-wardrobes', 'central-ac', 'childrens-play-area',
  'childrens-pool', 'concierge', 'conference-room', 'covered-parking', 'dining-in-building',
  'electricity', 'fibre-optics', 'fixed-phone', 'flood-drainage', 'kitchen-appliances',
  'lobby-in-building', 'maid-service', 'maids-room', 'networked', 'no-services',
  'pets-allowed', 'private-garden', 'private-gym', 'private-jacuzzi', 'private-pool',
  'sanitation', 'security', 'shared-gym', 'shared-pool', 'shared-spa', 'study',
  'vastu-compliant', 'view-of-landmark', 'view-of-water', 'walk-in-closet', 'waters'
]);

const mividaCleanImages = listings.find((l) => l.id === '01JP31340PMR514Z67BSE3X8P8')?.media?.images || [];

async function main() {
  const authRes = await fetch(`${gateway}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  });
  const { accessToken } = await authRes.json();

  // Unit 1: L k 2 -> 75k EGP
  console.log('\n--- Updating 1/3: L k 2 ---');
  const lk2 = listings.find((l) => l.id === '01JNQ7QEF0QJPEK1ERQHWJRX23');
  if (lk2) {
    const payload1 = {
      ...lk2,
      price: { type: 'monthly', amounts: { monthly: 75000 } },
      assignedTo: { id: lk2.assignedTo?.id || 79509 },
      createdBy: { id: lk2.createdBy?.id || 50193 },
      assigned_to: { id: lk2.assignedTo?.id || 79509 },
      created_by: { id: lk2.createdBy?.id || 50193 },
    };
    delete payload1.state;
    delete payload1.products;
    delete payload1.qualityScore;
    delete payload1.createdAt;
    delete payload1.updatedAt;
    delete payload1.portals;

    const putRes = await fetch(`${gateway}/listings/${lk2.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload1),
    });
    console.log('PUT L k 2 status:', putRes.status);
    const pubRes = await fetch(`${gateway}/listings/${lk2.id}/publish`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    console.log('Publish L k 2 status:', pubRes.status);
  }

  // Unit 2: emerald-estates-e-11367193 -> Clean Images + 60k
  console.log('\n--- Updating 2/3: emerald-estates-e-11367193 ---');
  const p11367193 = listings.find((l) => l.id === '01JR1Z3XSFCM9S95ZWS1WVBRX0');
  if (p11367193) {
    const payload2 = {
      ...p11367193,
      media: { images: mividaCleanImages },
      price: { type: 'monthly', amounts: { monthly: 60000 } },
      assignedTo: { id: p11367193.assignedTo?.id || 79509 },
      createdBy: { id: p11367193.createdBy?.id || 50193 },
      assigned_to: { id: p11367193.assignedTo?.id || 79509 },
      created_by: { id: p11367193.createdBy?.id || 50193 },
    };
    delete payload2.state;
    delete payload2.products;
    delete payload2.qualityScore;
    delete payload2.createdAt;
    delete payload2.updatedAt;
    delete payload2.portals;

    const putRes = await fetch(`${gateway}/listings/${p11367193.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload2),
    });
    console.log('PUT 11367193 status:', putRes.status);
    const pubRes = await fetch(`${gateway}/listings/${p11367193.id}/publish`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    console.log('Publish 11367193 status:', pubRes.status);
  }

  // Unit 3: Shrouk223 -> Filtered Amenities + 25M
  console.log('\n--- Updating 3/3: Shrouk223 ---');
  const shrouk = listings.find((l) => l.id === 'GCN044Y6N4GCJ4Y4GZJ40Z596W');
  if (shrouk) {
    const cleanAmenities = (shrouk.amenities || []).filter((a) => validAmenities.has(a));
    const payload3 = {
      ...shrouk,
      amenities: cleanAmenities,
      price: { type: 'sale', amounts: { sale: 25000000 } },
      assignedTo: { id: shrouk.assignedTo?.id || 79509 },
      createdBy: { id: shrouk.createdBy?.id || 50193 },
      assigned_to: { id: shrouk.assignedTo?.id || 79509 },
      created_by: { id: shrouk.createdBy?.id || 50193 },
    };
    delete payload3.state;
    delete payload3.products;
    delete payload3.qualityScore;
    delete payload3.createdAt;
    delete payload3.updatedAt;
    delete payload3.portals;
    delete payload3.numberOfMortgageYears;
    delete payload3.paymentMethods;

    const putRes = await fetch(`${gateway}/listings/${shrouk.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload3),
    });
    console.log('PUT Shrouk223 status:', putRes.status);
    if (!putRes.ok) {
      console.log('PUT Shrouk223 error:', await putRes.text());
    } else {
      const pubRes = await fetch(`${gateway}/listings/${shrouk.id}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      console.log('Publish Shrouk223 status:', pubRes.status);
    }
  }

  console.log('\nWaiting 10s for PF workers...');
  await new Promise((r) => setTimeout(r, 10000));

  // Check their status
  const checkIds = new Set([
    '01JNQ7QEF0QJPEK1ERQHWJRX23',
    '01JR1Z3XSFCM9S95ZWS1WVBRX0',
    'GCN044Y6N4GCJ4Y4GZJ40Z596W'
  ]);

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
