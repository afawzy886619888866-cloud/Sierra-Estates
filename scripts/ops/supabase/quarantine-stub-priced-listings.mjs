#!/usr/bin/env node
/**
 * quarantine-stub-priced-listings.mjs — DB-side remediation tooling for the
 * placeholder-price data debt surfaced by production-smoke (2026-10-20):
 *
 *   check "priced units"        : 2,606/4,828 publishable+active rows carry no price
 *   check "placeholder prices"  : 257 rows priced exactly 999 or 5,000,000 (ingest
 *                                 stubs) + 735 rows marked sale with rent-scale
 *                                 prices (< 100,000 EGP)
 *
 * What it does (default = DRY RUN, touches nothing):
 *   1. Reads public.listings through PostgREST and classifies the affected rows.
 *   2. --apply: sets publish_status='REVIEW_REQUIRED' + appends a status_history
 *      note on those rows ONLY (price, status untouched — additive, reversible).
 *      Quarantined rows leave the public map/feed until a human re-verifies them,
 *      which is exactly what the publish gate exists to enforce.
 *
 * Credentials: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env (fail-loud exit 2 if
 * missing — never a silent no-op). Run from the operator host:
 *
 *   node scripts/ops/supabase/quarantine-stub-priced-listings.mjs            # report only
 *   node scripts/ops/supabase/quarantine-stub-priced-listings.mjs --apply    # quarantine
 *
 * Anti-fabrication: the script never writes a price, never invents fields, and
 * never touches rows outside the three classified defects.
 */
const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(msg) {
  console.error(`UNCONFIGURED: ${msg}`);
  process.exit(2);
}
if (!SUPABASE_URL) fail('SUPABASE_URL missing');
if (!KEY) fail('SUPABASE_SERVICE_ROLE_KEY missing');
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(SUPABASE_URL)) fail(`SUPABASE_URL looks wrong: ${SUPABASE_URL}`);

const stubSet = new Set([999, 5_000_000]);

async function rest(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log(`quarantine-stub-priced-listings: mode=${APPLY ? 'APPLY (writes!)' : 'DRY RUN (report only)'}`);

  // Candidate set: rows currently visible on the public surface.
  const rows = await rest(
    'listings?select=id,code,price,deal_type,publish_status,status,status_history&status=eq.active&publish_status=eq.PUBLISHABLE&limit=5000',
  );
  console.log(`publishable+active rows scanned: ${rows.length}`);

  const defects = {
    stubPriced: [],        // price exactly 999 or 5,000,000
    suspiciousSale: [],    // deal_type sale + 0 < price < 100,000
    unpriced: [],          // no price at all (report only — NOT quarantined:
                           // "Price on request" is honest presentation of absence)
  };

  for (const r of rows) {
    const p = Number(r.price) || 0;
    if (stubSet.has(p)) defects.stubPriced.push(r);
    else if (p === 0) defects.unpriced.push(r);
    else if (String(r.deal_type || '').toLowerCase() === 'sale' && p > 0 && p < 100_000) {
      defects.suspiciousSale.push(r);
    }
  }

  console.log(`  stub-priced (999 / 5,000,000) : ${defects.stubPriced.length}`);
  console.log(`  suspicious sale (<100k)       : ${defects.suspiciousSale.length}`);
  console.log(`  unpriced (report only)        : ${defects.unpriced.length}`);
  for (const r of defects.stubPriced.slice(0, 10)) {
    console.log(`    stub   ${r.code || r.id} price=${r.price}`);
  }
  for (const r of defects.suspiciousSale.slice(0, 10)) {
    console.log(`    sus-s  ${r.code || r.id} price=${r.price}`);
  }

  const toQuarantine = [...defects.stubPriced, ...defects.suspiciousSale];
  if (!APPLY) {
    console.log(`\nDRY RUN: would quarantine ${toQuarantine.length} rows to REVIEW_REQUIRED.`);
    console.log('Re-run with --apply (and SUPABASE_SERVICE_ROLE_KEY set) to execute.');
    return;
  }

  const NOTE = {
    note: 'placeholder-price quarantine 2026-10-20: stub/suspicious price — re-verify before publishing',
    by: 'quarantine-stub-priced-listings.mjs',
  };
  let done = 0;
  for (const r of toQuarantine) {
    const history = Array.isArray(r.status_history) ? r.status_history : [];
    await rest(
      `listings?id=eq.${encodeURIComponent(r.id)}`,
      'PATCH',
      {
        publish_status: 'REVIEW_REQUIRED',
        status_history: [...history, { ...NOTE, at: new Date().toISOString() }],
      },
    );
    done++;
    if (done % 50 === 0) console.log(`  … ${done}/${toQuarantine.length}`);
  }
  console.log(`\nAPPLIED: ${done} rows quarantined to REVIEW_REQUIRED (price/status untouched).`);
  console.log('The public map + PF feed now exclude them until human re-verification.');
}

main().catch((err) => {
  console.error(`quarantine-stub-priced-listings FAILED: ${err.message}`);
  process.exit(1);
});
