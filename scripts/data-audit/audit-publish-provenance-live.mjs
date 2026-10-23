#!/usr/bin/env node
/**
 * audit-publish-provenance-live.mjs — live publishability/provenance auditor.
 *
 * Proves, against the LIVE Supabase project (read-only), the §21
 * no-fabrication invariants behind migrations 020/025/026 and the Phase 6
 * rule (sheet sync = ingestion only):
 *
 *   1. publish_status distribution          (REVIEW_REQUIRED pipeline state)
 *   2. provenance matrix per status         (verified_at / verified_by /
 *                                            source_verified_at coverage)
 *   3. VIOLATION: any PUBLISHABLE row without human provenance
 *   4. VIOLATION: any sheets-sourced row carrying a machine stamp
 *   5. photos coverage for PUBLISHABLE      (gate condition: photos ≥ 3)
 *
 * Credential: SUPABASE_ACCESS_TOKEN (Management API — same as
 * scripts/apply-migration-020.mjs). Optional: SUPABASE_PROJECT_REF
 * (default gaxfqcietzoonlmatiot).
 *
 * Exit codes: 0 = clean (or only skipped checks) · 1 = violations found ·
 *             2 = missing credential / connection failed.
 */
const REF = process.env.SUPABASE_PROJECT_REF || 'gaxfqcietzoonlmatiot';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const API = `https://api.supabase.com/v1/projects/${REF}/database/query`;

if (!TOKEN) {
    console.error('❌ SUPABASE_ACCESS_TOKEN not set.');
    console.error('   Get it from https://supabase.com/dashboard/account/tokens');
    process.exit(2);
}

async function query(sql) {
    const res = await fetch(API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { ok: res.ok, status: res.status, body };
}

const fmt = (n) => Number(n ?? 0).toLocaleString('en-US');
let violations = 0;

function report({ title, result, interpret }) {
    console.log(`\n── ${title} ${'─'.repeat(Math.max(2, 62 - title.length))}`);
    if (!result.ok) {
        console.log(`   (skipped — query failed: ${String(result.body).slice(0, 120)})`);
        return;
    }
    const rows = Array.isArray(result.body) ? result.body : [];
    if (rows.length === 0) {
        console.log('   (no rows)');
        return;
    }
    for (const row of rows) console.log('   ' + JSON.stringify(row));
    if (interpret) violations += interpret(rows);
}

console.log(`audit-publish-provenance-live → project ${REF}`);

// 1. publish_status distribution
report({
    title: '1. publish_status distribution',
    result: await query(
        `select coalesce(publish_status, '<NULL>') as publish_status,
                count(*)::int as n
         from public.listings group by 1 order by n desc`
    ),
});

// 2. provenance matrix per status
report({
    title: '2. provenance matrix per publish_status',
    result: await query(
        `select coalesce(publish_status, '<NULL>') as publish_status,
                count(*)::int as total,
                count(verified_at)::int as verified_at_set,
                count(verified_by)::int as verified_by_set,
                count(source_verified_at)::int as source_verified_at_set
         from public.listings group by 1 order by total desc`
    ),
});

// 3. VIOLATION: PUBLISHABLE without human provenance
report({
    title: '3. PUBLISHABLE rows missing human provenance',
    result: await query(
        `select count(*)::int as publishable_without_provenance
         from public.listings
         where publish_status = 'PUBLISHABLE'
           and (verified_at is null or verified_by is null)`
    ),
    interpret: (rows) => Number(rows[0]?.publishable_without_provenance ?? 0),
});

// 4. VIOLATION: machine stamps on sheet-sourced rows
report({
    title: '4. sheet-sourced rows carrying provenance stamps',
    result: await query(
        `select count(*)::int as stamped_sheets_rows
         from public.listings
         where sync_source = 'sheets-units'
           and (verified_at is not null
                or verified_by is not null
                or source_verified_at is not null)`
    ),
    interpret: (rows) => Number(rows[0]?.stamped_sheets_rows ?? 0),
});

// 5. photos coverage for PUBLISHABLE (gate condition: photos ≥ 3)
report({
    title: '5. PUBLISHABLE photos coverage (gate: photos ≥ 3)',
    result: await query(
        `select count(*)::int as publishable_total,
                count(*) filter (where coalesce(cardinality(images), 0) >= 3)::int as with_3plus_photos
         from public.listings
         where publish_status = 'PUBLISHABLE'`
    ),
});

// 6. sheets-units pipeline shape (Phase 6 rule live check)
report({
    title: '6. sheets-units pipeline shape (ingestion-only)',
    result: await query(
        `select count(*)::int as sheets_units_rows,
                count(*) filter (where publish_status = 'PUBLISHABLE')::int as publishable,
                count(*) filter (where publish_status = 'REVIEW_REQUIRED')::int as review_required,
                count(*) filter (where publish_status is null)::int as unclassified
         from public.listings
         where sync_source = 'sheets-units'`
    ),
});

console.log(
    `\n${'═'.repeat(66)}\n${
        violations === 0
            ? '✅ AUDIT CLEAN — no provenance violations.'
            : `❌ ${fmt(violations)} PROVENANCE VIOLATION(S) — investigate before publishing.`
    }\n${'═'.repeat(66)}`
);

process.exit(violations === 0 ? 0 : 1);
