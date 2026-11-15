const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const env = dotenv.parse(fs.readFileSync('apps/sierra-estates-realty/.env.local', 'utf8'));
const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!sbUrl || !sbKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(sbUrl, sbKey);
const final88 = JSON.parse(fs.readFileSync('scripts/pf-88-final-status.json', 'utf8'));
const allPfListings = JSON.parse(fs.readFileSync('scripts/pf-all-listings.json', 'utf8'));

async function main() {
  console.log(`Starting Supabase sync for ${final88.length} live Property Finder units...`);

  let updatedCount = 0;
  let insertedCount = 0;
  const nowIso = new Date().toISOString();

  for (let i = 0; i < final88.length; i++) {
    const item = final88[i];
    const pfData = allPfListings.find((l) => l.id === item.id);

    const priceAmt =
      item.price?.amounts?.monthly ||
      item.price?.amounts?.sale ||
      item.price?.amounts?.daily ||
      pfData?.price?.amounts?.monthly ||
      pfData?.price?.amounts?.sale ||
      0;

    const mode = item.price?.type === 'sale' || pfData?.price?.type === 'sale' ? 'sale' : 'rent';
    const bedrooms = pfData?.bedrooms ? parseInt(String(pfData.bedrooms), 10) || 0 : 0;
    const bathrooms = pfData?.bathrooms ? parseInt(String(pfData.bathrooms), 10) || 0 : 0;
    const area = pfData?.size || 0;
    const compoundName = pfData?.developer || pfData?.location?.name || 'New Cairo';
    const propertyType = pfData?.type || 'apartment';
    const furnishing = pfData?.furnishingType || 'unfurnished';
    const finishing = pfData?.finishingType || 'fully-finished';

    const images = (pfData?.media?.images || [])
      .map((img) => img?.original?.url)
      .filter(Boolean);

    // Check if listing already exists by pf_reference_number or code
    const { data: existing } = await supabase
      .from('listings')
      .select('id, pf_reference_number, code')
      .or(`pf_reference_number.eq.${item.id},code.eq.${item.ref}`)
      .limit(1);

    const basePayload = {
      title: pfData?.title?.en || item.title || `${propertyType} in ${compoundName}`,
      title_ar: pfData?.title?.ar || undefined,
      description: pfData?.description?.en || undefined,
      description_ar: pfData?.description?.ar || undefined,
      compound: compoundName,
      property_type: propertyType,
      deal_type: mode,
      price: priceAmt,
      price_currency: 'EGP',
      bedrooms,
      bathrooms,
      area_sqm: area,
      furnishing_status: furnishing,
      finishing_type: finishing,
      images,
      img: images[0] || null,
      status: 'active',
      publish_status: 'PUBLISHABLE',
      stale: false,
      freshness_score: 99,
      pf_reference_number: item.id,
      source_channel: 'property_finder',
      updated_at: nowIso,
    };

    if (existing && existing.length > 0) {
      // Keep existing code intact to respect code immutability trigger
      const { error } = await supabase
        .from('listings')
        .update(basePayload)
        .eq('id', existing[0].id);

      if (!error) updatedCount++;
      else console.error(`Error updating ${item.ref}:`, error.message);
    } else {
      const { error } = await supabase
        .from('listings')
        .insert({
          ...basePayload,
          code: item.ref,
          created_at: nowIso,
        });

      if (!error) insertedCount++;
      else console.error(`Error inserting ${item.ref}:`, error.message);
    }
  }

  console.log(`\n[✓] Supabase Sync Completed:`);
  console.log(`    - Updated existing listings: ${updatedCount}`);
  console.log(`    - Inserted new listings:     ${insertedCount}`);
  console.log(`    - Total synchronized:        ${updatedCount + insertedCount} / ${final88.length}`);
}

main().catch(console.error);
