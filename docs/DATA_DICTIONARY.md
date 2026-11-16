# DATA DICTIONARY — MASTER_INVENTORY_V1

**Generated:** 2026-09-29 · **Rows:** 12088 total (8486 unique + 3602 duplicates) · **Sources:** `All Master Listings` XLSX (11,488), `owners_rent_tab_separated.tsv` (298), `owners_rent_with_photos.tsv` (302)

## Field definitions

| Column | Type | Description | Source / Derivation |
|---|---|---|---|
| `unit_id` | string | Stable canonical ID `SB-<fingerprint12>`; identical values = same physical unit | sha1(compound, property_type, deal_type, beds, area-bucket, price-bucket) |
| `public_code` | string | Human-facing code from source sheet (e.g. `MAD-R-2424`), may be empty | Source `Identifier / Code` |
| `compound` | string | Canonical compound name (79-compound gazetteer, AR/EN/slug variants mapped) | Normalized from source; **unresolvable values stay empty (never defaulted)** |
| `area` | string | Greater zone: New Cairo / Fifth Settlement / El Shorouk / Madinaty / 6th of October / North Coast / New Capital / Greater Cairo | Derived from compound |
| `district` | string | Sub-zone (compound name or district) | Derived from compound |
| `property_type` | enum | Apartment, Standalone Villa, Townhouse, Twin House, Duplex, Penthouse, Studio, Chalet, Commercial / Office, Retail / Shop, Ground / Garden Unit, Roof / Penthouse, Land / Plot, Building, Unknown | Normalized AR/EN; junk values (deal words, finishing words) → Unknown |
| `deal_type` | enum | `rent` / `sale` | Source `Deal Type` normalized (Resale → sale) |
| `deal_subtype` | enum | `rent` / `resale` / `primary` / `unknown` | Preserves original segmentation |
| `price` | number | Price in stated currency | Parsed; storage conventions fixed only when unambiguous (see `price_fix_applied`) |
| `currency` | enum | EGP / USD | USD only when identifier contains `USD`/`$` evidence |
| `price_validity` | enum | `valid` (rent 3k–500k / sale 500k–500M EGP) · `missing` · `suspicious_low` · `invalid_for_deal_type` (e.g. 8.5M on rent row) · `usd_unconfirmed` | Rule engine |
| `price_fix_applied` | string | `sale_millions_notation_x1e6` when sale price < 100 stored as millions (e.g. 7.6 → 7,600,000) | Traceability column — no silent edits |
| `usd_suspected` | bool | Rent price 100–3,000 range suggests USD (e.g. `MD-3F-1400USD` = 1,400 USD/mo) but unconfirmed | Flag for verification call |
| `bedrooms` / `bathrooms` | int | Counts | Normalized numerics |
| `area_sqm` | int | Built-up area m² | Source |
| `furnishing` | enum | furnished / semi_furnished / unfurnished / fully_finished / semi_finished / core_shell / unknown | AR/EN normalized |
| `finishing` | enum | Finishing-only subset (company/red-brick state) | Derived |
| `view`, `floor` | string | Reserved (empty in V1 — not present in sources) | Future: from richer intake |
| `owner_or_broker` | enum | OWNER_DIRECT / BROKER / PARTNER / UNKNOWN | Source segment |
| `contact_name` | string | Owner/broker name (AR or EN as recorded) | Source |
| `phone` | string | E.164 (`+2010…`) or empty | Normalized from float/strings; invalid → empty |
| `phone_state` | enum | valid / invalid / missing | Rule engine |
| `whatsapp` | URL | `https://wa.me/20…` **rebuilt from normalized phone** (source URLs were malformed, e.g. `wa.me/228446610`) | Derived |
| `availability` | enum | available / pending / no_answer / follow_up / not_available / archived / excluded / unknown | Normalized status |
| `last_verified_at` | date | Best-known verification date (sheet date `20-7-2026`, TSV `Updated At`, team unit date) or empty | **Empty = never verified** |
| `freshness` | enum | Fresh 0–7d · Aging 8–30d · Stale 31–60d · Verification Required 60+d · Unknown (no date) | Computed vs 2026-09-29 |
| `photos` | URL list | Comma-separated photo URLs (only owner TSV rows carry them) | Source |
| `photo_count` | int | Number of photo URLs | Derived |
| `latitude` / `longitude` | number | Compound centroid from the 79-compound coordinate table (unit-level precision not available in V1) | Gazetteer |
| `quality_score` | 0–100 | Weighted: completeness 40 + price validity 20 + location 10 + photos 10 + freshness 10 + source reliability 10 | Rule engine (below) |
| `publish_status` | enum | PUBLISHABLE / REVIEW_REQUIRED / STALE / INCOMPLETE / EXPIRED / DUPLICATE | Decision cascade (below) |
| `source` | string | `file::sheet-heritage` provenance | Derived |
| `source_url` | URL | Canonical contact link (WhatsApp) | Derived |
| `fingerprint` | string | Dedupe key (see unit_id) | Derived |
| `duplicate_of` | string | unit_id of the canonical record this row duplicates | Dedupe engine |
| `notes` | string | Original heritage/notes text | Source |

## Quality score formula

| Component | Weight | Scoring |
|---|---|---|
| Field completeness | 40 | price 10 · compound 4 · property_type 4 · beds 4 · baths 2 · area 4 · furnishing 3 · contact name 2 · valid phone 3 · WhatsApp 2 · notes 2 |
| Price validity | 20 | valid 20 · suspicious_low 5 · else 0 |
| Location validity | 10 | compound + coords 10 · compound only 6 · unresolved 0 |
| Photo availability | 10 | any photo 10 |
| Freshness | 10 | Fresh 10 · Aging 7 · Stale 4 · Verification Required/Unknown 1 |
| Source reliability | 10 | Partner 10 · Owner-direct 8 · Broker 5 · Unknown 3 |

## Publishability cascade (first match wins)

1. `DUPLICATE` — fingerprint matched a canonical record
2. `EXPIRED` — availability = not_available / archived / excluded / sold / rented
3. `INCOMPLETE` — no price, unresolved compound/property type, no beds AND no area, or price invalid for deal type
4. `STALE` — quality ≥ 55 but freshness Stale / Verification Required / Unknown
5. `PUBLISHABLE` — quality ≥ 75 AND Fresh/Aging AND available AND valid phone
6. `REVIEW_REQUIRED` — everything else

## Enumerations (canonical value sets)

- **property_type:** Apartment · Standalone Villa · Townhouse · Twin House · Duplex · Penthouse · Studio · Chalet · Commercial / Office · Retail / Shop · Ground / Garden Unit · Roof / Penthouse · Land / Plot · Building · Unknown
- **owner_or_broker:** OWNER_DIRECT · BROKER · PARTNER · UNKNOWN
- **publish_status:** PUBLISHABLE · REVIEW_REQUIRED · STALE · INCOMPLETE · EXPIRED · DUPLICATE
- **freshness:** Fresh · Aging · Stale · Verification Required · Unknown
- **availability:** available · pending · no_answer · follow_up · not_available · archived · excluded · unknown
- **currency:** EGP · USD
