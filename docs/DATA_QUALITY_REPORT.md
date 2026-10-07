# DATA QUALITY REPORT — MASTER INVENTORY V1

**Generated:** 2026-09-29 · **Scope:** 8486 unique units after deduplication (12088 source records)

## Executive verdict

**The inventory is NOT yet trustworthy enough to publish a single unit.** Zero units pass the publishability gate. The three blockers, in order of business impact:

1. **Freshness collapse** — 97.4% of units have no verification date at all, and the only dated bulk (501 units from the 20-7-2026 sheet) is now 70+ days old. A re-verification campaign is the single highest-leverage data action.
2. **Price integrity** — only **36.3%** of units carry a price that is plausible for their deal type. 3844 are missing/zero, 1274 sit below the plausible sale floor, and 282 carry a price of the wrong scale (rent↔sale confusion, e.g. 8,500,000 EGP "rent").
3. **Contact reachability** — 79.0% of units have a dialable phone after normalization, but 1786 do not; almost all source WhatsApp URLs were malformed and had to be rebuilt.

**Recommended action:** work the Verification Queue (Excel tab 3, sorted owner-direct first) — every call both refreshes `last_verified_at` and can fix price/beds/photos in the same touch.

## Quality score distribution (unique units, avg 53.1/100)

| Score band | Units | Share |
|---|---|---|
| 0–9 | 0 | 0.0% |
| 10–19 | 32 | 0.4% |
| 20–29 | 70 | 0.8% |
| 30–39 | 2264 | 26.7% |
| 40–49 | 1548 | 18.2% |
| 50–59 | 1428 | 16.8% |
| 60–69 | 901 | 10.6% |
| 70–79 | 2239 | 26.4% |
| 80–89 | 4 | 0.0% |
| 90–99 | 0 | 0.0% |

## Field completeness

| Field | Populated | Missing | Coverage |
|---|---|---|---|
| price (valid EGP) | 3081 | 5405 | 36.3% |
| compound (resolved) | 8359 | 127 | 98.5% |
| property type | 8377 | 109 | 98.7% |
| bedrooms | 5173 | 3313 | 61.0% |
| bathrooms | 1060 | 7426 | 12.5% |
| area (sqm) | 4649 | 3837 | 54.8% |
| furnishing | 6224 | 2262 | 73.3% |
| valid phone | 6700 | 1786 | 79.0% |
| contact name | 8314 | 172 | 98.0% |
| photos | 3 | 8483 | 0.0% |
| verification date | 219 | 8267 | 2.6% |

## Price integrity detail

| Finding | Units | Share | Example pattern |
|---|---|---|---|
| Valid for deal type | 3081 | 36.3% | rent 3k–500k / sale 0.5M–500M EGP |
| Missing / zero / price-on-call | 3844 | 45.3% | `0` stored on 3,210 source rows |
| Below plausible sale floor | 1274 | 15.0% | sale rows at 25k–500k (rent-scale values) |
| Wrong scale for deal type | 282 | 3.3% | rent rows at 8.5M; sale rows at 50 |
| USD (unconfirmed) | 5 | 0.1% | identifiers like `MD-3F-1400USD` |

**Auto-corrections applied (traceable, never silent):** sale prices stored as millions (e.g. `7.6` → 7,600,000 EGP) were multiplied out and stamped in `price_fix_applied`. Rent prices in the 100–3,000 band are flagged `usd_suspected` (likely USD rents) but were NOT converted — fixing them requires a phone confirmation.

## By segment

| Segment | Units | Valid price | Valid phone | No photos | Avg quality |
|---|---|---|---|---|---|
| BROKER | 6540 | 2520 | 5734 | 6540 | 54 |
| OWNER_DIRECT | 1862 | 477 | 966 | 1859 | 48 |
| PARTNER | 84 | 84 | 0 | 84 | 70 |

## Top compounds (by unit count)

| Compound | Units | Fresh ≤30d | Valid price | Valid phone | With beds | With photos | Avg quality |
|---|---|---|---|---|---|---|---|
| New Cairo | 3074 | 54 | 996 | 2548 | 1680 | 1 | 51 |
| Madinaty | 792 | 57 | 182 | 512 | 276 | 1 | 47 |
| Al Rehab | 786 | 46 | 201 | 471 | 297 | 0 | 48 |
| Mivida | 702 | 3 | 295 | 615 | 524 | 0 | 56 |
| Hyde Park | 451 | 1 | 211 | 361 | 327 | 0 | 57 |
| Eastown | 399 | 3 | 190 | 359 | 328 | 1 | 59 |
| 5th Settlement | 277 | 0 | 152 | 238 | 197 | 0 | 60 |
| Uptown Cairo | 214 | 26 | 28 | 132 | 78 | 0 | 45 |
| Villette | 210 | 0 | 122 | 178 | 183 | 0 | 62 |
| Lake View Residence | 205 | 3 | 100 | 182 | 183 | 0 | 61 |
| Mountain View iCity | 175 | 0 | 96 | 159 | 159 | 0 | 62 |
| Fifth Square | 158 | 2 | 94 | 122 | 140 | 0 | 64 |
| Cairo Festival City | 154 | 1 | 72 | 117 | 121 | 0 | 58 |
| SODIC East | 128 | 0 | 59 | 114 | 85 | 0 | 57 |
| Galleria Moon Valley | 83 | 0 | 48 | 57 | 70 | 0 | 60 |
| Katameya Heights | 65 | 0 | 35 | 58 | 60 | 0 | 62 |
| Oriana | 56 | 0 | 23 | 50 | 50 | 0 | 60 |
| 90 Avenue | 50 | 0 | 36 | 45 | 43 | 0 | 66 |
| Katameya Dunes | 42 | 0 | 14 | 38 | 34 | 0 | 57 |
| The Waterway | 41 | 1 | 15 | 40 | 29 | 0 | 56 |
| El Shorouk City | 35 | 2 | 10 | 24 | 13 | 0 | 49 |
| Sheikh Zayed | 29 | 0 | 8 | 29 | 26 | 0 | 57 |
| New Capital | 28 | 5 | 2 | 20 | 11 | 0 | 43 |
| Swan Lake Residence | 24 | 0 | 7 | 9 | 14 | 0 | 44 |
| North Coast | 20 | 0 | 6 | 19 | 20 | 0 | 56 |

## Structural source defects (root causes)

1. **Column-shift corruption** in source sheets: person names in code columns, postal codes (`46126`) in compound, phone numbers (`12001400200`) in price, dates in compound.
2. **Two different price storage conventions** (millions with decimals vs. absolute EGP) and **two currencies** (EGP/USD) mixed in one column with no unit marker.
3. **Phones stored as floats** (`1022844661.0`) and **WhatsApp URLs built by dropping digits** (`wa.me/228446610`).
4. **Four overlapping status vocabularies** (`Available`, `active`, `Pending`, `No answer`, free-text Arabic).
5. **Zero photos** in the master XLSX — photos exist only in the 302-row owner TSV.
