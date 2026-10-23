# Owner Verification Campaign Runbook

**Added:** 2026-10-23 · **Lane:** data quality / inventory truth · **Status:** ready to run

## Why this campaign exists

The platform's public surfaces disagree about inventory size: the live database
reports ~20,000 active property records, while the Property Finder feed
publishes only **28** verified units. The 2026-09-29 `DATA_QUALITY_REPORT.md`
found the root causes: zero units carried a verification date, only ~36% of
prices were plausible for their deal type, and freshness had collapsed. No
amount of platform engineering fixes that — only owner contact does. This
campaign turns the WhatsApp outreach stack into a **verification engine**: every
call both refreshes `last_verified_at` and captures price / layout / photos in
the same touch.

## What was built

- `scripts/data-audit/build_verification_campaign.py` — regenerates the
  prioritized worklist from the in-repo Google Sheet harvest
  (`apps/sierra-estates-realty/data/online-sheet-units.json`, 2,580
  owner-direct units). Self-contained; only needs `openpyxl`.
- The generated workbook (Top-500 queue + call script + summary + review) and
  its CSV twin are written **outside the repo** — they contain owner phone
  numbers (PII) and must never be committed.

## Scoring model (0–100)

| Dimension | Points | Rule |
|---|---|---|
| Contact | 25 | valid normalized phone (hard gate — no phone, no queue) |
| Price | 25 | plausible for deal type (rent 3k–500k EGP/mo; sale 0.8M–300M) |
| Completeness | 25 | 5 pts each: compound / type / beds / baths / area |
| Freshness | 15 | lastUpdate ≤30d: 15 · ≤90d: 10 · ≤180d: 5 · older: 0 |
| Compound strength | 10 | tier-A compound (Mivida, Palm Hills, Rehab, Madinaty, …) |

Tiers: **P1 ≥ 70** (near-publishable — call first), P2 55–69, P3 < 55.
Dedup key: `phone_price` (same owner/unit re-harvested across sources).

## Latest run (2026-10-23)

- Pool after gates: **1,913** verifiable owner-direct units (530 duplicates and
  136 no-phone records excluded from 2,580).
- Top 500: **all P1**, 498/500 price-plausible — the "first 500 calls" are the
  fastest path to a trustworthy published inventory.
- Campaign math at the `sierra_master.py` quota (30 msgs / 30 min, day shift
  10:00–21:00 Cairo): ~17 working days to clear the queue; at a 55–70% contact
  rate expect **275–350 verified units** ready to publish.

## How to run

```bash
python scripts/data-audit/build_verification_campaign.py --top 500 \
    --out-dir ../sierra-campaign
```

Regenerate after every harvest refresh — ranking re-scores automatically.

## Operating the campaign (owner side)

1. **Re-share the Google Sheet** (File → Share → Anyone with the link →
   Viewer). The CSV export URL currently returns a Google login page, which
   starves both `sierra_master.py` and future harvests.
2. Pair the 4 WhatsApp lines (Evolution API, see
   `docs/EVOLUTION_WHATSAPP_RUNBOOK.md`).
3. Walk the queue in Rank order via `sierra_master.py` (or manual calls using
   the workbook's Call Script sheet).
4. After each contact, update the **Status** column (dropdown: Pending / Call
   Again / Confirmed Available / Price Updated / Sold-Rented / Wrong Number /
   Opted Out).
5. Feed confirmed units back into the ingestion path
   (`pnpm sync-all-to-supabase-and-map.mjs`) — confirmed + price-corrected
   units become feed-publishable.

## Publishing gate (unchanged)

A unit may enter the Property Finder feed only when: verified contact ·
confirmed availability · plausible price · known type · known location ·
quality score ≥ 75. The campaign exists to move units through this gate — the
gate itself is not negotiable (see `DATA_QUALITY_REPORT.md`).
