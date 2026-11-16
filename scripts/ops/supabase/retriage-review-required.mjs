#!/usr/bin/env node
'use strict';
/**
 * retriage-review-required.mjs — follow-up to the 2026-10-20/21 placeholder-price
 * quarantine (1,078 rows in REVIEW_REQUIRED) and companion to the source fix
 * merged in PR #64 (WA rent/sale lexicon + price-scale guard).
 *
 * What this does (default = DRY RUN, touches nothing):
 *   1. Pages through ALL public.listings rows in publish_status
 *      'REVIEW_REQUIRED' (status=active), pulling deal_type, price,
 *      status_history, description, and raw_data.
 *   2. Re-classifies each row with the FIXED classifier (the same shared
 *      rent/sale lexicon + scale rules now shipped in
 *      scripts/import-whatsapp-chat.mjs) against the best available source
 *      text: raw_data.raw_message > description.
 *   3. Buckets every row:
 *        A. lexicon_repairable — stored deal_type='sale'/'resale' but the
 *           raw text clearly says rent (new lexicon): the original mis-tag.
 *           Mechanically repairable once a human spot-checks.
 *        B. scale_repairable  — deal_type consistent with text but the
 *           price scale contradicts the text's own magnitude (e.g. sale ad
 *           'مطلوب 45' stored as 45,000 instead of 45M, or rent ad stored
 *           ×1000). Mechanically repairable once a human spot-checks.
 *        C. still_stub        — price still 999 / 5,000,000 or no price
 *           evidence in text: nothing mechanical to do — human review.
 *        D. no_text           — no raw_message and no description: nothing
 *           to re-classify against — human review.
 *        E. already_consistent — text agrees with stored deal_type and
 *           price scale: quarantine reason may predate the current values;
 *           human review to decide re-publish.
 *   4. --apply: appends ONE status_history note per row recording its bucket
 *      and the re-classification evidence (deal_type_from_text, price_from_text).
 *      It NEVER changes price, deal_type, publish_status, or status — the
 *      publish decision stays with the human reviewer. Reversible (notes are
 *      additive), idempotent (skips rows already carrying this note's `by`).
 *
 * Anti-fabrication: writes nothing but a history note; invents no values;
 * exits 2 loudly when credentials are missing.
 *
 * Credentials: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env.
 *   node scripts/ops/supabase/retriage-review-required.mjs            # report
 *   node scripts/ops/supabase/retriage-review-required.mjs --apply    # annotate
 */
import { classifyDealType, parseWhatsAppExport, extractUnitDetails } from '../../import-whatsapp-chat.mjs';

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
const NOTE_BY = 'retriage-review-required.mjs (PR #64 follow-up, 2026-11-13)';

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

function sourceTextOf(r) {
  const raw = r.raw_data || {};
  const rawMsg = typeof raw.raw_message === 'string' ? raw.raw_message : '';
  return (rawMsg || r.description || '').trim();
}

/** Reparse a row's source text through the FIXED pipeline. */
function reclassify(text) {
  if (!text || text.length < 20) return null;
  const messages = parseWhatsAppExport(`[11/13/26, 8:00:00 AM] Owner: ${text.replace(/\n?\[(?=\d)/g, '\n[')}`);
  const msg = messages[0];
  if (!msg) return null;
  const unit = extractUnitDetails(msg, 'retriage');
  if (!unit) return null;
  return { dealType: unit.dealType, price: unit.price };
}

function bucketOf(r, verdict) {
  const storedDeal = String(r.deal_type || '').toLowerCase();
  const p = Number(r.price) || 0;
  if (stubSet.has(p) || (p === 0 && (!verdict || !verdict.price))) return 'still_stub';
  if (!verdict) return 'no_text';
  const textDeal = String(verdict.dealType || '').toLowerCase();
  if ((storedDeal === 'sale' || storedDeal === 'resale') && textDeal === 'rent') {
    return 'lexicon_repairable';
  }
  if (verdict.price > 0 && p > 0 && verdict.price !== p) return 'scale_repairable';
  return 'already_consistent';
}

async function main() {
  console.log(`retriage-review-required: mode=${APPLY ? 'APPLY (writes history notes!)' : 'DRY RUN (report only)'}`);

  const PAGE = 1000;
  const HARD_CAP = 20_000;
  const rows = [];
  for (let offset = 0; offset < HARD_CAP; offset += PAGE) {
    const page = await rest(
      `listings?select=id,code,deal_type,price,publish_status,status,status_history,description,raw_data&status=eq.active&publish_status=eq.REVIEW_REQUIRED&order=id.asc&limit=${PAGE}&offset=${offset}`,
    );
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  console.log(`REVIEW_REQUIRED rows scanned: ${rows.length}`);

  const buckets = { lexicon_repairable: [], scale_repairable: [], still_stub: [], no_text: [], already_consistent: [] };
  const annotated = [];
  for (const r of rows) {
    const text = sourceTextOf(r);
    const verdict = reclassify(text);
    const bucket = bucketOf(r, verdict);
    buckets[bucket].push(r);
    annotated.push({ r, bucket, verdict, text });
  }

  console.log('\nRe-triage buckets:');
  for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padEnd(20)}: ${v.length}`);
  console.log('\nSamples (up to 5 per bucket):');
  for (const [k, v] of Object.entries(buckets)) {
    for (const r of v.slice(0, 5)) {
      const a = annotated.find((x) => x.r.id === r.id);
      console.log(`  ${k.padEnd(20)} ${r.code || r.id} deal=${r.deal_type} price=${r.price} → text: deal=${a?.verdict?.dealType ?? '–'} price=${a?.verdict?.price ?? '–'} | text="${(a?.text || '').slice(0, 60).replace(/\n/g, ' ')}"`);
    }
  }

  if (!APPLY) {
    const repairable = buckets.lexicon_repairable.length + buckets.scale_repairable.length;
    console.log(`\nDRY RUN: would append re-triage history notes to ${rows.length} rows (${repairable} mechanically repairable candidates for human spot-check).`);
    console.log('Re-run with --apply to annotate (no price/deal_type/publish_status changes).');
    return;
  }

  let done = 0;
  const CONCURRENCY = 15;
  let cursor = 0;
  async function worker() {
    while (cursor < annotated.length) {
      const { r, bucket, verdict } = annotated[cursor++];
      const history = Array.isArray(r.status_history) ? r.status_history : [];
      if (history.some((h) => h && h.by === NOTE_BY)) { done++; continue; }
      await rest(`listings?id=eq.${encodeURIComponent(r.id)}`, 'PATCH', {
        status_history: [...history, {
          note: `re-triage 2026-11-13 (fixed WA classifier, PR #64): bucket=${bucket}`
            + (verdict ? `; text says deal_type=${verdict.dealType}, price=${verdict.price}` : '; no parseable source text')
            + ' — price/deal_type/publish_status untouched; human re-verification still required.',
          by: NOTE_BY,
          at: new Date().toISOString(),
        }],
      });
      done++;
      if (done % 100 === 0 || done === annotated.length) console.log(`  ... ${done}/${annotated.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`\nAPPLIED: ${done} rows annotated with re-triage buckets (nothing else touched).`);
}

main().catch((err) => {
  console.error('retriage failed:', err.message);
  process.exit(1);
});
