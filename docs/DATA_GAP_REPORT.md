# DATA GAP REPORT — Sierra Blu Master Inventory

**Date:** 2026-09-29 · **Sources inspected:** `data/Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx` (11,488 rows × 15 cols), `owners_rent_tab_separated.tsv` (298 rows × 17 cols), `owners_rent_with_photos.tsv` (331 rows × 20 cols), committed `apps/sierra-estates-realty/lib/inventory/snapshot.json` (11,017 units).

---

## 1. Canonical model vs current data

The master spec requires a canonical model with `unit_id, public_code, compound, area, district, property_type, deal_type, price, currency, bedrooms, bathrooms, area_sqm, furnishing, view, floor, finishing, owner_or_broker, source, source_url, availability, last_verified_at, photos, latitude, longitude, quality_score`.

Current "All Master Listings" sheet has only 15 columns:

| Canonical field | XLSX column | Coverage |
|---|---|---|
| unit_id / public_code | Identifier / Code | ~full (mixed formats: `MT-B14-3U-8.34M`, `ONN170`, `OSA445`) |
| owner_or_broker | Segment / Channel | full (Direct Owner / Broker / Team) — **not present in DB** |
| deal_type | Deal Type | full (Rent/Resale/Sale) — mixed with 'Resale' as both deal & channel |
| compound | Compound | full (unnormalized AR/EN: "Sodic", "New Cairo", Arabic values) |
| property_type | Property Type | partial (many blanks, mixed AR/EN) |
| price | Price (EGP) | present but **unvalidated** (see §2) |
| area_sqm | Area (sqm) | sparse |
| bedrooms / bathrooms | Beds / Baths | sparse (baths mostly empty) |
| furnishing/finishing | Furnishing / Finishing | mixed AR/EN free text |
| owner contact | Contact Name / Phone / WhatsApp | present, **malformed** (see §2) |
| availability | Status / Availability | free text: "Available", "No answer", "Available for Rent", "Pending" |
| source | Source Heritage | partial ("20-7-2026 Sheet") |
| **MISSING:** district, view, floor, currency, photos*, lat/lng*, last_verified_at, quality_score, source_url (WA link only) | — | lat/lng only via the import script's 80-entry hardcoded compound table; photos only in the 332-row TSV |

## 2. Data quality defects found (direct inspection)

| Defect | Example | Count (est.) | Impact |
|---|---|---|---|
| **Deal-type/price mismatch** — Rent rows carrying sale-scale prices | Row 1: `Madinaty, Rent, 8,500,000 EGP` | To be quantified in Phase 1 | Bot would present absurd rents |
| **Phone numbers stored as floats** | `1022844661.0` | Most rows | Unusable for dial/WhatsApp |
| **Malformed WhatsApp URLs** | `https://wa.me/228446610` (missing `20` country code) | Many rows | Broken CTA links |
| **Mixed AR/EN** in compound, furnishing, notes | `تشطيبات شركه` | Widespread | Search/filter misses |
| Missing area/beds/baths | Row 2/3 have None | Majority of broker sheets | Weak matching |
| **No verification date** on any row | — | 100% | No freshness possible |
| Contradictory embed — notes field contains a different deal type | Row 1 notes: `property_type: SALE` while Deal Type = Rent | To quantify | Trust |
| snapshot.json (11,017) ≠ XLSX (11,488) | −471 delta | — | Drift between DB and source |

## 3. Gaps blocking the Definition of Done

1. **No freshness system at all** — nothing records when a listing was last verified; the spec's Fresh/Aging/Stale/Verify buckets cannot be computed.
2. **No publishability gate driven by quality** — rows enter `listings` with `source_channel` only; nothing computes a quality score in the base path (011's `compute_listing_dq` exists but 011 is unapplied/unverified on live DB).
3. **No owner/broker classification column in the DB** — the segment lives only in the XLSX "Segment / Channel" column and is lost on import (script maps to `source_channel` free text).
4. **Two orphan files** (root TSVs) contain 331 owner-direct rows with photos that are not in the DB (no importer).
5. **No photo coverage** except the 332-row TSV (`Photo URLs` column) and PropertyFinder URLs embedded in SEED_LISTINGS.
6. **No district-level geography** — area is a free-text compound name; lat/lng only exists for 80 hardcoded compounds in the import script.
7. **Deduplication unproven** — XLSX was deduped by `ref_id` at import time, but cross-source duplicates (same unit in Broker Rent + Direct Owners) are undetected; ≥5 competing dedupe keys exist in code.

## 4. Immediate quantification needed (Phase 1 scope)

- % rows with valid price for their deal type (rent plausibility: 5k–500k EGP; sale plausibility: 1M–200M EGP)
- % rows with valid phone (11-digit Egyptian mobile `01xxxxxxxxx` after normalization)
- % rows with bedrooms / bathrooms / area
- duplicate count within XLSX and vs TSVs (compound + type + beds + area + price ±5%)
- freshness impossible now → set `last_verified_at` = import date + flag all as "Verification Required" initially
- owner/broker split and how much owner-direct inventory exists (the strategic differentiator)

*This report feeds directly into `DATA_QUALITY_REPORT.md` which will contain the full quantified audit.*
