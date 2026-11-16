# STALE LISTINGS REPORT — MASTER INVENTORY V1

**Generated:** 2026-09-29 · **Scope:** 8486 unique units

## Freshness classification (per master spec: 0–7 Fresh · 8–30 Aging · 31–60 Stale · 60+ Verification Required)

| Bucket | Units | Share |
|---|---|---|
| Fresh | 0 | 0.0% |
| Aging | 206 | 2.4% |
| Stale | 13 | 0.2% |
| Verification Required | 501 | 5.9% |
| Unknown | 7766 | 91.5% |

## Headline

- **97.4% of the inventory has never been verified** (no date recorded at any point).
- The only bulk-dated source (sheet of 20-7-2026) is now **70 days old** → all of it falls into "Verification Required".
- **No listing is Fresh.** The most recent verified batch (owner TSV, 2026-09-07) is 22 days old → "Aging".

## Verification campaign plan (the #1 data action)

**Queue size: 7898 units** (available/pending/unknown, excluding already-expired). The full prioritized queue is in `MASTER_INVENTORY_V1.xlsx → Verification Queue` (owner-direct first, then by quality score).

| Segment | Units to verify |
|---|---|
| BROKER | 6540 |
| OWNER_DIRECT | 1274 |
| PARTNER | 84 |

Top compounds to verify:

| Compound | Units to verify |
|---|---|
| New Cairo | 2923 |
| Al Rehab | 692 |
| Mivida | 692 |
| Madinaty | 680 |
| Hyde Park | 437 |
| Eastown | 392 |
| 5th Settlement | 273 |
| Villette | 210 |
| Lake View Residence | 198 |
| Mountain View iCity | 175 |
| Uptown Cairo | 154 |
| Fifth Square | 149 |
| Cairo Festival City | 140 |
| SODIC East | 127 |
| (unresolved) | 98 |
| Galleria Moon Valley | 69 |
| Katameya Heights | 65 |
| Oriana | 55 |
| 90 Avenue | 49 |
| Katameya Dunes | 42 |

## Suggested call script objective (per unit)

1. Confirm still available + set `availability`.
2. Confirm price + currency → clears `usd_suspected` and `invalid_for_deal_type` flags.
3. Capture bedrooms/bathrooms/area if missing.
4. Request 3–5 photos (WhatsApp) → clears the photo gap.
5. Record `last_verified_at` = call date → unit becomes Fresh and can enter PUBLISHABLE if quality ≥ 75.

## Post-campaign projection

If the 7898-unit campaign completes with the current quality distribution, roughly **2378 units** would sit within reach of PUBLISHABLE (quality ≥ 65 today + photos + fresh date + confirmed price on the call).
