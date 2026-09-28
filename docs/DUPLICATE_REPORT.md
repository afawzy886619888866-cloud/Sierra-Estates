# DUPLICATE REPORT — MASTER INVENTORY V1

**Generated:** 2026-09-29 · **3602 duplicate records** collapsed into canonical units (29.8% of 12088 source records)

## Method

1. **Exact fingerprint**: sha1(compound · property_type · deal_type · bedrooms · area-bucket(10m²) · price-bucket(5k rent / 250k sale)). Applied only to records with *evidence* (price + beds-or-area); low-evidence records are never merged, only flagged.
2. **Near-duplicate**: same (compound, property_type, deal_type, bedrooms) with price within ±5% and area within ±10% (or area unknown).
3. **Winner selection**: PARTNER > OWNER_DIRECT > BROKER > UNKNOWN, then quality score, then completeness. Photos from losing records are merged into the winner.
4. Every duplicate row is preserved in the CSV with `publish_status=DUPLICATE` and `duplicate_of=<canonical unit_id>` — nothing is deleted.

## Results

| Metric | Value |
|---|---|
| Exact fingerprint duplicates | 0 |
| Near duplicates | 3602 |
| Total duplicates | 3602 |
| Unique units | 8486 |

## Duplicates by segment

| Duplicate segment | Count |
|---|---|
| BROKER | 3014 |
| OWNER_DIRECT | 570 |
| PARTNER | 18 |

## Cross-segment consolidation (where the loser and winner differ)

| Duplicate of | Kept as | Count |
|---|---|---|
| BROKER | BROKER | 2074 |
| BROKER | ? | 627 |
| OWNER_DIRECT | OWNER_DIRECT | 517 |
| BROKER | OWNER_DIRECT | 241 |
| BROKER | PARTNER | 72 |
| OWNER_DIRECT | ? | 39 |
| PARTNER | PARTNER | 17 |
| OWNER_DIRECT | PARTNER | 14 |
| PARTNER | ? | 1 |

## Interpretation & caveats

- A duplicate rate of 29.8% is expected: the same unit circulates across owner intake, multiple broker WhatsApp groups, and team listings.
- **Near-dupes can over-merge** genuinely distinct units that share compound, type, beds and price (common in large compounds with homogeneous stock). Near-dupes are therefore *review candidates*, not deletions — the Verification Queue should confirm them first.
- The 2 TSVs contributed overlapping owner-direct records; their photos were merged into the surviving canonical units.
