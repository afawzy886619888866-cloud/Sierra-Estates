/**
 * stage-approved-rent-unit.js — Stages and publishes user-approved Rent listings
 * to Supabase (publish_status='PUBLISHABLE', pf_status='approved') and generates
 * the Property Finder Atlas v1 ad JSON payload.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { buildPropertyFinderRentPayload, validateRentListingForPropertyFinder } = require('./propertyfinder-rent-ad');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('[stage-rent] Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const UNIT_ID = '8c5fb3c2-98d2-4419-91db-ab639c730911';
const CANONICAL_CODE = 'HP-5F-175K';

const AD_DETAILS = {
  title: 'Luxury Standalone Villa for Rent in Hyde Park New Cairo - 400m²',
  title_ar: 'فيلا مستقلة فاخرة للإيجار في هايد بارك التجمع الخامس - 400 م²',
  description: `Prestigious standalone villa for rent in Hyde Park, New Cairo.

• Built-up Area: 400 sqm
• Bedrooms: 5 Master Bedrooms
• Bathrooms: 5 High-end Bathrooms
• Finishing & Furnishing: Ultra Super Lux, Fully Furnished
• View & Garden: Private spacious garden overlooking open landscape
• Monthly Rent: 175,000 EGP/month
• Certified Reference Code: ${CANONICAL_CODE}

For private viewings and verified inquiries with Sierra Estates:
Call or WhatsApp: +20 109 204 8333`,
  description_ar: `فيلا مستقلة راقية للإيجار في كمبوند هايد بارك (Hyde Park) بالتجمع الخامس، القاهرة الجديدة.

• المساحة: 400 م²
• عدد الغرف: 5 غرف نوم ماستر
• عدد الحمامات: 5 حمامات بتشطيب فندقي
• التشطيب والتأثيث: تشطيب ألترا سوبر لوكس، مفروشة بالكامل بأثاث فاخر
• الحديقة والإطلالة: حديقة خاصة واسعة وإطلالة مباشرة على لاندسكيب مفتوح
• القيمة الإيجارية الشهرية: 175,000 ج.م / شهرياً
• كود الوحدة المعتمد: ${CANONICAL_CODE}

للمعاينة والتنسيق المباشر مع مستشاري Sierra Estates:
تواصل عبر الواتساب أو الهاتف: 01092048333`
};

async function main() {
  console.log(`[stage-rent] Fetching unit ${UNIT_ID}...`);
  const { data: unit, error: fetchErr } = await sb
    .from('listings')
    .select('*')
    .eq('id', UNIT_ID)
    .single();

  if (fetchErr || !unit) {
    console.error('[stage-rent] Error fetching unit:', fetchErr?.message);
    process.exit(1);
  }

  // Validate unit with Property Finder gates
  const validation = validateRentListingForPropertyFinder({
    ...unit,
    code: CANONICAL_CODE,
    furnishing_status: 'furnished'
  });
  console.log(`[stage-rent] Validation: valid=${validation.isValid}, errors=${validation.errors.length}`);

  // Build Atlas v1 payload
  const pfPayload = buildPropertyFinderRentPayload({
    ...unit,
    code: CANONICAL_CODE,
    title: AD_DETAILS.title,
    title_ar: AD_DETAILS.title_ar,
    description: AD_DETAILS.description,
    description_ar: AD_DETAILS.description_ar,
    furnishing_status: 'furnished'
  });

  // Save payload to disk
  const outDir = path.join(__dirname, '..', '.state', 'pf-staged-ads');
  fs.mkdirSync(outDir, { recursive: true });
  const payloadPath = path.join(outDir, `${CANONICAL_CODE}.json`);
  fs.writeFileSync(payloadPath, JSON.stringify(pfPayload, null, 2), 'utf8');
  console.log(`[stage-rent] Wrote Property Finder Atlas v1 payload to ${payloadPath}`);

  // Update Supabase listing record without mutating immutable `code`
  const updatePayload = {
    pf_reference_number: CANONICAL_CODE,
    sbr_code: CANONICAL_CODE,
    reference_code: CANONICAL_CODE,
    title: AD_DETAILS.title,
    title_ar: AD_DETAILS.title_ar,
    description: AD_DETAILS.description,
    description_ar: AD_DETAILS.description_ar,
    publish_status: 'PUBLISHABLE',
    pf_status: 'approved',
    furnishing_status: 'furnished',
    verified_at: new Date().toISOString(),
    verified_by: 'user_approved_showcase',
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: updated, error: updateErr } = await sb
    .from('listings')
    .update(updatePayload)
    .eq('id', UNIT_ID)
    .select('id, code, publish_status, pf_status, pf_reference_number')
    .single();

  if (updateErr) {
    console.error('[stage-rent] Failed to update listing in Supabase:', updateErr.message);
    process.exit(1);
  }

  console.log('[stage-rent] Successfully updated Supabase listing:', updated);
}

main().catch((err) => {
  console.error('[stage-rent] Fatal error:', err);
  process.exit(1);
});
