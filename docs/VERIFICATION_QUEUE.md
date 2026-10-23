# VERIFICATION QUEUE — Phase C (C3–C6)

```text
PHASE:   C — Inventory Activation (queue construction; live verification BLOCKED on credentials)
STATUS:  IN PROGRESS (queue built from real data; outreach not yet executed)
DATE:    2026-09-29
INPUT:   data/MASTER_INVENTORY_V1.csv (Phase-1 pipeline, re-derived 2026-09-29 — 12,088 records → 8,486 unique / 3,602 duplicates / 0 PUBLISHABLE)
BUILDER: scripts/data-audit/build_verification_queue.py
OUTPUTS: data/VERIFICATION_QUEUE_V1.csv (8,246 rows) · data/VERIFICATION_QUEUE_V1.xlsx (Pilot Shortlist / Full Queue / Summary tabs)
```

Nothing in the queue is fabricated: every field comes from the pipeline's
actual data. Missing values stay missing and are listed as verification work.

---

## Queue construction (C3)

Excluded: 3,602 DUPLICATE + 240 EXPIRED → **queue = 8,246 unique units.**

Priority groups exactly per the activation plan:

| Group | Class | Units |
|---|---|---|
| 1 | OWNER_DIRECT | 1,622 |
| 2 | PARTNER | 84 |
| 3 | BROKER with quality_score ≥ 75 (high quality) | 5 |
| 4 | REMAINING BROKER | 6,535 |

Within each group, units are ranked by **readiness (satisfied C6 gate
criteria, desc) → sub-priority score → quality score**, where sub-priority =
quality + 25 (reachable phone) + 20 (valid price) + 15 (bedrooms present) +
15 (compound resolved) — exactly the plan's "high quality + reachable contact
+ price present + beds present + strong compound".

## Publishing gate model (C6)

Readiness counts these 8 criteria (mirrors `assign_publish_status()` in
`build_master_inventory.py`, plus the plan's C5 photo minimum):

```text
1 available            availability == 'available'
2 valid price          price_validity == 'valid'
3 valid property type  property_type != Unknown
4 usable location      compound resolved
5 valid contact        phone_state == 'valid'
6 acceptable quality   quality_score >= 75
7 fresh verification   freshness in (Fresh, Aging)   ← currently true for 0 queue units
8 photos               photo_count >= 3              ← currently true for 0 queue units
```

**Missing-criteria histogram (of 8):** 2→87 · 3→226 · 4→5,915 · 5→1,798 ·
6→179 · 7→30 · 8→11. **Best readiness: 6/8 (87 units)** — consistent with the
pipeline's 0 PUBLISHABLE: no unit has fresh verification or photos today.

## Pilot shortlist — first 50 (the initial "50 verified units" target)

The top 50 are all:

```text
class        : OWNER_DIRECT (group 1)
phone        : valid for 50/50
price        : valid for 50/50 (27 sale / 23 rent)
compounds    : Al Rehab 13 · New Cairo 10 · Madinaty 7 · 5th Settlement 4 · Hyde Park 3 · CFC 2 · Fifth Square 2 · Mivida 2 · SODIC East 2 · Eastown 1 + others
missing      : exactly two items each — fresh verification + photos
```

**Each pilot unit is one verification call + one photo set away from
PUBLISHABLE.** The full shortlist (100 units — 50 target + 50 pipeline) is in
`data/VERIFICATION_QUEUE_V1.xlsx → Pilot Shortlist` with per-unit contact,
price, checklist and source columns.

## Verification capture protocol (C4)

Each call must capture/confirm (per-unit checklist is pre-computed in the
`verify_checklist` column):

```text
available? · price? + currency? · property type? · bedrooms? · bathrooms?
area? · furnishing? · photos (3–5 real minimum, 10–15 HD preferred — C5)
owner/broker name? · reachable phone? · compound/location?
```

On completion, set per unit (columns already exist on `public.listings` via
migration 013): `last_verified_at`, `availability`, `quality_score`,
`publish_status`.

## Execution path (once credentials exist)

1. Import/write verified results — the Phase-2 importer
   (`scripts/data-audit/import-master-inventory.mjs`, DRY-RUN by default,
   `--write` to apply, upsert on `ref_id`) remains the canonical path into
   `public.listings`.
2. Re-run the pipeline + queue after each verification batch — statuses and
   readiness re-derive deterministically.
3. Publish gate: a unit goes live only when all 8 criteria pass
   (`publish_status = 'PUBLISHABLE'`).
4. Scale order: 50 → 100 → 250 → 500 (do NOT wait for 8,486).

## BLOCKERS (Rule D)

- **Live verification outreach is BLOCKED**: WhatsApp outbound credentials
  (Meta/OpenWA) and calling capacity are not available in this environment.
- **DB write-back is BLOCKED**: Supabase service-role key absent — verified
  results cannot be persisted to `public.listings` from here.
- **Photos**: master inventory contains none; every unit needs real
  photography collected during calls (never fabricated — Rule B).

## Next actions

1. Ops: run the Pilot Shortlist (50 owner-direct calls) using the XLSX.
2. Eng: merge `fix/public-publish-status-enforcement` (public visibility must
   show ONLY PUBLISHABLE; removes fabricated display fallbacks) **before or
   with** the first publish batch — see ACTIVATION_BASELINE blocker #2.
3. Re-run `build_verification_queue.py` after each batch; track readiness.
