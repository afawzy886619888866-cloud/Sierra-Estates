# Sierra Estates — E2E Test Infrastructure & Verification Architecture

## 1. Overview & Quality Mandate
This document establishes the authoritative End-to-End (E2E) testing infrastructure for Sierra Estates across all 6 functional pillars and 36 inventoried features defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`.

In strict accordance with the MCD alignment protocol and opaque-box testing standards:
- **No Facade or Trivial Tests**: Every test exercises real computational logic, contracts, boundary predicates, and domain transformations.
- **No Mocking of Substance**: External network boundaries (Supabase PostgREST, OpenWA HTTP daemon, Google Calendar API) are stubbed at the network transport boundary only, allowing domain rules, validators, parsers, and data pipelines to execute their authentic code paths.
- **Deterministic 4-Tier Test Topology**: Test suites are organized into 4 rigorous tiers providing orthogonal layers of verification.

---

## 2. The 4-Tier Testing Methodology

```
┌────────────────────────────────────────────────────────────────────────┐
│               Tier 4: Real-World Operational Scenarios                 │
│   (1,000-Lead Funnel, 240 Msgs/Day Cairo Pacing, 6-Month Revenue Ramp)  │
├────────────────────────────────────────────────────────────────────────┤
│                 Tier 3: Cross-Feature Interactions                     │
│    (Sourcing → Easy Listing → Latency Penalty → Commission Engine;     │
│     DQE Deduplication → Sync Hash → Reclassification → Atlas Feed;     │
│     GIS Polygons → Centroids → Proximity Times → Map Pins)             │
├────────────────────────────────────────────────────────────────────────┤
│                 Tier 2: Boundary & Corner Cases                        │
│   (Cairo 12:00/20:00 Window Limits, 45-55s Jitter, >24h 5% Penalty,    │
│    400k/1M Rent-Resale Thresholds, >15% GEM Deal Cutoff, E.164 Egypt)  │
├────────────────────────────────────────────────────────────────────────┤
│                 Tier 1: Feature Coverage & Contracts                   │
│   (All 36 Features R1–R6, Schema Contracts, Polygon Coordinates,       │
│    Centroids, Dual BMM/Sierra Codes, 25/25/25/25 Commission Splits)    │
└────────────────────────────────────────────────────────────────────────┘
```

### Tier 1: Feature Coverage (Isolated Functional Verification)
Verifies each feature independently against its functional contract:
- **Pillar 1 (R1 - 4K GIS & Proximity Engine)**:
  - Feature 1: 4K Retina Tile Configuration (`detectRetina: true`, `maxNativeZoom: 19`, `maxZoom: 22`).
  - Feature 2: Dual Engine Map Switcher (`4k-masterplan` visualizer vs `live-gis` map).
  - Feature 3: GPS bounding polygons for all 14 target compounds (Hyde Park, Mountain View Hyde Park, Mountain View iCity, Mivida, CFC, Palm Hills New Cairo, Katameya Heights, Katameya Dunes, Eastown, Villette, Swan Lake, Taj City, The Square, Lake View) with glowing `#C9A84C`, `#10B981`, and `#00F0FF` borders.
  - Feature 4: Centroid coordinate calculation (polygon vertices mean) and permanent glowing luxury name pills.
  - Feature 5: Landmark proximity filter chips (AUC, Golden Square, 90th St, New Capital) with calibrated drive time formulas.
  - Feature 6: Live Supabase Map Pins with Rent/Resale chips, AI valuation score, GEM badges, and modal triggers.
  - Feature 7: Compounds API `/api/compounds` returning enriched polygons, centroids, drive times, and pricing.
  - Feature 8: PropertyCard badges (AI Valuation, GEM badge >15% below compound avg, Net ROI, Luxury Index, Freshness Score, Direct Owner, Old Contract).
- **Pillar 2 (R2 - Supply Engine & Smart Coding)**:
  - Feature 9: OpenWA 240 msgs/day scheduler (30 msgs/2h between 12:00–20:00 Cairo time, 45–55s typing delay, line-2 exclusion).
  - Feature 10: Verified Owners Sheet ingestion (GID 1127958606).
  - Feature 11: Cold outreach queue staging and 1-click Human-in-the-Loop Admin approval gate.
  - Feature 12: Scraper & broker group webhook ingestion hooks.
  - Feature 13: Easy Listing dual codes: BMM source code (`[O/B][CompoundInitial][AgentInitials]-[ID]`) and Sierra attribute code (`[CompoundCode]-[Rooms][Furnishing]-[Price][K/$]+[Features]`).
  - Feature 14: Acquisition latency calculation (>24h sourcing-to-CRM latency flagged with 5% commission penalty indicator).
- **Pillar 3 (R3 - Data Quality Estimation & Hybrid Sync)**:
  - Feature 15: Mandatory phone gate rejecting missing/invalid numbers and normalizing to Egyptian E.164 (`+201...`).
  - Feature 16: Zero blank cells; populating missing optional fields with string `"NULL"`.
  - Feature 17: Price sanity enforcement (capping Rent at <= 400,000 EGP/month; reclassifying Rent >= 1,000,000 EGP as Resale).
  - Feature 18: Canonical compound dictionary resolving 50+ Arabic/English aliases into canonical compound names.
  - Feature 19: DQE `sync_hash` deduplication across separate Listings, Owners, and Duplicates collections.
  - Feature 20: `Real_Available_Units` sheet tab and public catalog mirroring verified available units only.
- **Pillar 4 (R4 - AI Memory, Valuation & Media)**:
  - Feature 21: `public.unified_memory` seeded with 2026 New Cairo and Hyde Park / MVHP baseline ranges.
  - Feature 22: Automated WhatsApp photo request sweep for active units with <8–10 photos.
  - Feature 23: Admin Unanswered Alert banner and dedicated filter tab for unhandled questions (>15 mins).
  - Feature 24: Photo watermarking with Sierra Blue Navy gradient (`#0A1628`) + Burnished Gold (`#C9A84C`).
  - Feature 25: Property Finder Atlas v1 XML/API feed (`/api/feeds/property-finder`) with complete owner phone scrubbing to concierge (`+201092048333`).
- **Pillar 5 (R5 - Buyer Concierge, Scripts & Calendar Closing)**:
  - Feature 26: Admin Bot Script & Template Manager in Admin OS Settings.
  - Feature 27: Laila Buyer Concierge 7-step qualification flow with Top 3 units and adjacent compound fallback logic.
  - Feature 28: 25% commission discount voucher / $100 Elite Voucher request linking.
  - Feature 29: Top 3 matched units PDF tear-sheet generation and WhatsApp dispatch.
  - Feature 30: 3-way Google Calendar viewing booking dispatch (CEO `a.fawzy8866@gmail.com`, Team Leader, Closer).
  - Feature 31: 60-minute golden hour follow-up timer and 4-hour post-viewing satisfaction survey.
- **Pillar 6 (R6 - Commission Engine & Scaling Dashboard)**:
  - Feature 32: Full-cycle 25/25/25/25 commission split (Acquisition, Listing/Branding, Lead Qualification, Field Closing) across Bronze, Silver, Gold tiers.
  - Feature 33: Governance SLA tracking: 15–30 min lead response SLA, <2 deals/month alert, <24h CRM entry latency rule.
  - Feature 34: 6-month revenue ramp tracker against 1,000-lead funnel (750 Rent / 250 Resale).
- **Monorepo Ecosystem Verification**:
  - Feature 35: Comprehensive Opaque-Box E2E Test Suite.
  - Feature 36: Monorepo Ecosystem Build & CI Gate verification.

---

### Tier 2: Boundary & Corner Cases
Tests system behavior at extreme, edge, and invalid inputs:
- **Temporal & Schedule Boundaries**:
  - Paced Outreach: 11:59:59 Cairo time (inactive), 12:00:00 (active), 19:59:59 (active), 20:00:01 (inactive).
  - Human typing simulation jitter: minimum 45,000 ms, maximum 55,000 ms; rejecting jitter outside range.
  - CRM Acquisition Latency: 23 hours 59 minutes (penalty = 0%), 24 hours 01 minute (penalty = 5%).
- **Financial & Price Boundaries**:
  - Rent Capping: 400,000 EGP/mo (accepted as Rent), 400,001 EGP/mo (rejected or flagged), 999,999 EGP (rent review), 1,000,000 EGP (reclassified to Resale).
  - GEM Deal Threshold: Exactly 14.99% below compound average (no GEM badge), 15.01% below average (GEM badge activated).
  - Base Salary Quotas: 0 deals = 0% salary, 1 deal = 50% salary, 2 deals = 100% salary (6,000 EGP onsite / 4,000 EGP remote).
- **Geographic & GIS Coordinate Boundaries**:
  - Extreme coordinate boundaries for Greater Cairo (Lat 29.80 – 30.20, Lng 31.30 – 31.75).
  - Centroid calculation on concave and convex polygons.
  - Drive time minimum floor: `Math.max(2, Math.round(distKm * 1.35 + 2))` ensuring no drive time < 2 minutes.
- **Text & Localization Edge Cases**:
  - Phone normalization: `01001234567`, `+20 100 123 4567`, `00201001234567`, `201001234567` → `+201001234567`.
  - Rejection of international non-Egyptian numbers or landlines (`02...`, `12345`).
  - Unicode Arabic diacritics, tatweel, and alef normalization (`إيجار`, `ايجار`, `أيجار`).
  - Null/undefined/empty string cell conversion to `"NULL"`.

---

### Tier 3: Cross-Feature Interactions
Tests multi-system pipelines where output from one pillar feeds into another:
1. **Supply to Commission Chain**:
   - Raw pasted text ingested via Easy Listing → BMM code & Sierra attribute code minted → Acquisition timestamp evaluated → Latency > 24 hours detected → 5% commission penalty indicator set → Full-cycle commission calculation applies 5% penalty deduction from gross payout.
2. **DQE Ingestion to Feed & Public Catalog**:
   - Ingested listing with missing fields populated with `"NULL"` → Phone number normalized to E.164 → Rent price >= 1,000,000 EGP reclassified to Resale → `sync_hash` computed → Duplicates routed to `public.duplicates` review queue → Verified available listing synced to `Real_Available_Units` sheet tab → Property Finder Atlas XML feed generated with owner phone scrubbed to `+201092048333`.
3. **GIS Proximity to Live Unit Pins & Valuation**:
   - Target compound polygon defined → Centroid computed → Landmark drive times calculated to AUC, Golden Square, 90th St, New Capital → Live listings queried from Supabase → Price per m² compared against compound benchmark (`avgPriceSqmEgp`) → Listing price >15% below benchmark triggers glowing GEM badge on map pin and PropertyCard.
4. **Buyer Concierge to Closing Schedule Chain**:
   - Inbound WhatsApp inquiry enters Laila 7-step qualification → Client preferences captured (Compound, Budget, Bedrooms) → Matching engine scans inventory → Primary compound empty triggers adjacent compound fallback → Top 3 units selected → 25% discount voucher minted → 3-way Google Calendar invite created with CEO (`a.fawzy8866@gmail.com`), Team Leader, and Closer → 60-min golden hour timer and 4-hour post-viewing survey scheduled.

---

### Tier 4: Real-World Operational Scenarios
Simulates authentic operational scale under production conditions:
1. **1,000-Lead Funnel & 6-Month Scaling Ramp**:
   - Simulates 1,000 total leads (750 Rent / 250 Resale) transitioning through the qualification pipeline.
   - Calculates monthly conversion rates across Months 1 through 6 against stepped company targets.
   - Computes total commission revenue, company net share, and 25/25/25/25 split distribution across sales tiers (Bronze, Silver, Gold).
2. **240 Messages/Day Outreach Fleet Cycle**:
   - Simulates a 24-hour day in Africa/Cairo timezone across 2 outreach bots (Active Renting & Massive Owners).
   - Verifies 4 active 2-hour slots (12:00, 14:00, 16:00, 18:00) with 30 messages dispatched per slot per bot = 240 msgs/day total.
   - Verifies zero sends during closed window (20:00 to 12:00 next day).
   - Verifies hard exclusion of `line-2` (`201092048333`) across all batches.
3. **Catalog Syndication & Data Privacy Audit**:
   - Generates full Property Finder Atlas v1 XML payload for 50+ diverse listings.
   - Scans every XML node to assert 100% absence of private owner phone numbers.
   - Verifies every `<agent><phone>` strictly equals `+201092048333`.
   - Confirms watermarked media standards adhere to `#0A1628` and `#C9A84C`.

---

## 3. Test Suite Organization

| Test Suite File | Scope & Pillars | Key Target Features |
|---|---|---|
| `__tests__/e2e-all-pillars.test.ts` | Complete System Integration (Pillars 1–6) | All 36 features verification matrix, cross-cutting contracts, end-to-end integration workflows |
| `__tests__/e2e-gis-discovery.test.ts` | Pillar 1: 4K GIS & Proximity Engine (R1, R4) | Features 1–8: Retina tiles, dual switcher, 14 polygons, centroids, proximity drive times, live pins, PropertyCard badges |
| `__tests__/e2e-supply-and-dqe.test.ts` | Pillars 2 & 3: Supply Engine & DQE (R2, R3) | Features 9–20: 240 msgs/day schedule, typing jitter, Easy Listing dual codes, latency penalty, phone gate, DQE sync_hash |
| `__tests__/e2e-concierge-and-commission.test.ts` | Pillars 4, 5, 6: AI Memory, Concierge & Commission (R4, R5, R6) | Features 21–34: Unified memory baselines, photo sweep, 7-step Laila, 25% voucher, 3-way calendar, timers, 25/25/25/25 splits, 6-mo ramp |

---

## 4. Execution & Verification Commands

```bash
# Run all E2E test suites via root Vitest runner
pnpm test:root --run

# Run individual pillar test suites
pnpm test:root __tests__/e2e-all-pillars.test.ts
pnpm test:root __tests__/e2e-gis-discovery.test.ts
pnpm test:root __tests__/e2e-supply-and-dqe.test.ts
pnpm test:root __tests__/e2e-concierge-and-commission.test.ts

# Verify type safety across monorepo packages
pnpm type-check

# Run full CI test suite across all 24 packages
pnpm test:ci
```

---

## 5. Certification & Publication Criteria
The E2E Test Suite is certified ready when:
1. All 4 test suite files execute with **0 failures** and **0 skipped assertions**.
2. All 36 features across Pillars 1–6 have explicit, verifying assertions in Tiers 1 through 4.
3. No implementation code was modified by the Test Writer.
4. `TEST_READY.md` is published at project root summarizing the passing execution audit.
