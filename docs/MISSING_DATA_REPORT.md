# MISSING DATA REPORT — MASTER INVENTORY V1

**Generated:** 2026-09-29 · **Scope:** 8486 unique units

## Missing-field ranking (worst first)

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

## Critical gaps and remediation

| Gap | Impact on journey | Remediation |
|---|---|---|
| Verification date (97.4% missing) | **Publishability = 0.** No unit can be shown with honest freshness | Verification campaign (queue in XLSX tab 3); each call sets `last_verified_at` |
| Price (45.3% missing/zero) | Bot cannot filter by budget | Ask price on the verification call; import from owner's WhatsApp thread |
| Bedrooms (39.0% missing) | Weakens hard filters (min beds) | Same call; or infer from area + type with human confirmation |
| Photos (100.0% missing) | No property-first presentation | Only 302 TSV rows carry photos today; photo collection must join the verification workflow |
| Bathrooms (87.5% missing) | Soft ranking only | Low priority |
| Area sqm (45.2% missing) | Price-per-sqm sanity + matching quality | Same call; also blocks near-dupe precision |
| Valid phone (21.0% missing) | Unit cannot be actioned (viewing/outreach) | Phone exists in source for most; normalization failed on malformed values |
| Furnishing (26.7% unknown) | Soft preference matching | Ask on verification call |

## Fields with NO source data at all (V1)

- **View, floor** — no source column captures them; add to intake form and bot qualification.
- **Unit-level GPS** — only compound centroids are available (79 compounds). Unit-level coordinates require map pinning or developer data.
- **source_url** (public listing URL) — sources are private sheets/WhatsApp; no public listing links exist except the rebuilt WhatsApp links.
- **availability date / move-in-ready date** — not captured anywhere.

## Segment split of the gaps

| Segment | Units | No price | No beds | No photos | Unverified |
|---|---|---|---|---|---|
| BROKER | 6540 | 2764 | 2238 | 6540 | 6540 |
| OWNER_DIRECT | 1862 | 1080 | 1073 | 1859 | 1643 |
| PARTNER | 84 | 0 | 2 | 84 | 84 |
