# Sierra Estates — Inventory OS v2 Blueprint

> **What the best real estate inventory looks like for the Egyptian market —
> and how this repository gets there.**
>
> Status: `Phase 1 delivered` · Branch: `feature/inventory-os-v2` ·
> Live preview: demo SPA (built alongside this branch) ·
> Migration: `supabase/migrations/011_inventory_os_v2.sql` (additive, idempotent)

---

## 1. The Answer in One Page

The best inventory system for an Egyptian brokerage is not a listings table —
it is a **unit lifecycle with money and trust attached to it**. Five properties
define it:

1. **Unit identity, not listing blobs.** Every unit links
   `developer → project (compound) → unit` with a stable human code
   (`SE-U-10033`). The same unit is one row across PropertyFinder sync,
   WhatsApp scrapes, owner sheets and manual entry — everything else is a
   source attached to that identity.

2. **One status machine, enforced.** 
   `draft → pending_verification → verified → published → reserved → sold | rented`
   plus `off_market`, `expired`, `archived`. Seven vocabularies currently
   coexist in the codebase ('available', 'active', 'Pending Review'…). Best
   practice is a single canonical machine, guarded at the **database level**
   (trigger), not just in a service class that no route calls.

3. **Egyptian payment plans as first-class data.** The market runs on
   `5% down · 8 years quarterly` structures, not ZIP-code mortgagemath.
   Payment plans must be normalized rows (DP %, tenure, frequency, delivery
   balloon, post-delivery years, cash discount, annual maintenance) — never
   free text (`projects.payment_plan TEXT`) or three flat columns.

4. **Trust & compliance built in.** Egypt's 2023 listing-transparency
   regulation makes **document-backed verification** the gate to publication:
   `verified = ownership doc ref + verifier + timestamp`, refreshed within a
   30-day freshness SLA or the unit auto-expires.

5. **Every mutation leaves a trail.** Price changes → `price_history` with
   reason. Status changes → `status_history` with actor and note. Reservations
   → hard expiry window + escrow reference, and the unit auto-reverts on
   expiry.

---

## 2. Gap Analysis — Current State (from a full codebase audit)

| # | Finding | Impact | Fixed in this branch |
|---|---------|--------|----------------------|
| 1 | `InventoryDomainService` (lifecycle + dedupe + SLA) is **dead code** — no route calls it | Zero enforcement of the designed state machine | ✅ DB trigger + `/api/admin/inventory-os` |
| 2 | **7 status vocabularies** incl. `'Pending Review'` inside a CHECK constraint | Filters miss units; admin dropdown writes 'Available' vs DB 'available' | ✅ `normalize_listing_status()` + widened CHECK |
| 3 | Admin `ListingsView` mutations are **client-state only** (status, publish, PF syndication, photos) | Edits evaporate on refresh; syndication toggle is fake | ✅ New `InventoryOsView` persists everything |
| 4 | **PF rent→'rented' bug**: `offeringType === 'rent'` imported as `status: 'rented'` | Every imported rental listing appears unavailable | ✅ `dealType` field + fix both directions |
| 5 | offerType **hardcoded 'sale'** in admin POST fingerprint | Rent dedupe broken from admin entry | ✅ `offerType` accepted, threaded to fingerprint |
| 6 | 4 dedupe schemes (fingerprint, sync_hash, dedupe_hash, phone+price), `dupe_check_hash` written but **never read** | Duplicates accumulate across 15 ingestion paths | ✅ Unified `listing_fingerprint()` SQL fn |
| 7 | Payment plans: 3 flat numeric columns + free-text `projects.payment_plan` | Cannot query "units with DP ≤ 5%", cannot render schedules | ✅ `payment_plans` table |
| 8 | No price history / no status history in production | No trend analytics, no audit, silent repricing | ✅ `price_history` + `status_history` |
| 9 | No unit identity (`project_id`/`developer_id` NULL, compound is free text) | Compound analytics = string matching on a hardcoded gazetteer | ✅ FK columns + backfill |
| 10 | No freshness enforcement | Stale listings presented as live inventory | ✅ `flag_stale_listings()` + `stale` column |
| 11 | No data quality measurement | "Best units" = hardcoded tier list; photo gaps invisible | ✅ `compute_listing_dq()` 0-100 score |
| 12 | Reservations have no expiry/escrow tie | Units locked forever by dead deals | ✅ `reserved_until` + `reservation_ref` |
| 13 | `master-sheet-sync` writes non-existent columns (`location`, `ownerContact`, `coordinates`) → PGRST204 | The "canonical" sync path likely fails at runtime | ✅ Fixed — sync now writes real columns (`locationArea`, `areaSqm`, `ownerPhone`, flat `latitude`/`longitude`), routes through `toListingColumns()`, mirrors the lifecycle matrix so illegal status updates defer to `raw_data.sheet_status` instead of aborting the batch, and converts USD sheet quotes to canonical EGP | 
| 14 | `snapshot.json` imported by 4 routes but absent from repo; generator not wired | Public catalog falls back to seeds | ✅ Fixed — `scripts/generate-inventory-snapshot.mjs` (zero-dep, PostgREST, PII-safe select) wired into `npm run build` via `inventory:snapshot`; committed 25-unit Egyptian seed snapshot guarantees the imports resolve and the map renders fully offline |
| 15 | FX rate hardcoded inconsistently (48 in ExcelMerger, 50 in listings submit) | USD reference prices drift | ✅ Fixed — single `lib/fx.ts` (`egpToUsd`/`usdToEgp`) backed by `DEFAULT_FX_RATES.USD` from the agents-core FX-gold engine (48.65); both hardcode sites + master-sheet-sync now import it |

---

## 3. The Target Architecture

```text
                        ┌──────────────────────────────────────────┐
                        │            INGESTION SOURCES            │
  PropertyFinder sync   │  WhatsApp scraper  Owner sheets (GSheets)│  Easy Listing
  (pull + push + CRM)   │  broker_listings   master-sheet-sync     │  (public form)
                        └───────────────┬──────────────────────────┘
                                        │  fingerprint dedupe (unified)
                                        ▼
                        ┌──────────────────────────────────────────┐
                        │   public.listings  (canonical unit row)  │
                        │   + project_id/developer_id/unit_code FK │
                        │   + Egyptian attrs (garden/roof/plot/m², │
                        │     finishing, delivery Y+Q, maintenance)│
                        └───────┬──────────────┬───────────┬───────┘
                                │              │           │
                     ┌──────────▼───┐  ┌───────▼──────┐  ┌─▼─────────────┐
                     │ payment_plans│  │ price_history│  │ status_history│
                     │ (DP/tenure/  │  │ (reason-     │  │ (actor+note   │
                     │  freq/balloon│  │  tracked)    │  │  per move)    │
                     └──────────────┘  └──────────────┘  └───────────────┘
                                │              │           │
                        ┌───────▼──────────────▼───────────▼───────┐
                        │ trg_listing_status_guard (DB trigger)    │
                        │  · rejects illegal transitions           │
                        │  · auto-writes status_history            │
                        │  · stamps verified_at / published_at     │
                        └──────────────────┬───────────────────────┘
                                           │
                     ┌─────────────────────▼───────────────────────┐
                     │ Admin: InventoryOsView (lifecycle board)    │
                     │ Portal: published/reserved only             │
                     │ Agents: InventoryQueryService (typed reads) │
                     │ PF syndication: published only              │
                     └─────────────────────────────────────────────┘
```

### Canonical lifecycle (the ONE machine)

```text
draft ──▶ pending_verification ──▶ verified ──▶ published ──▶ reserved ──▶ sold
  ▲             │        ▲            │  ▲          │  ▲  │       │        │
  └─────────────┘        └────────────┘  └──◀───────┘  │  └──┬───┘        │
                                         (re-verify)   │     │  convert   │
                                     rented ◀──────────┘     │            │
                                       │  relist             ▼ release    │
                                       └──▶ published ◀──────┘            │
                                                                        terminal
off_market ──▶ published (relist)      expired ──▶ pending_verification
archived = terminal
```

Rules enforced (in trigger + API):
- `reserved` requires a note; escrow ref (`ESC-XXXX`) extracted or generated;
  14-day hard window stamped into `reserved_until`.
- `verified` stamps `verified_at`/`verified_by`; `ownership_doc_ref` recommended
  (2023 transparency regulation).
- `sold` / `archived` are terminal. `rented` may relist to `published`.
- Freshness SLA: verified/published units older than 30 days → `stale = true`
  (`flag_stale_listings()` cron) → expiry queue.

### Egyptian data model essentials

| Domain | Fields |
|---|---|
| **Identity** | `unit_code` (SE-U-10001), `project_id` FK, `developer_id` FK, `compound_id` FK |
| **Classification** | `offer_type` (sale/rent), `listing_type` (primary/resale/landlord_direct), `category` (residential/commercial/admin) |
| **Specs** | beds, baths, `area_sqm` (BUA), `garden_sqm`, `roof_sqm`, `terrace_sqm`, `plot_sqm` (land), floor/total floors, `unit_view` (golf/lagoon/park/sea), `finishing` (core_shell → ultra_lux → furnished), `delivery_year` + `delivery_quarter` |
| **Pricing** | `price` EGP primary, USD reference (single FX source), auto `price_per_sqm`, `maintenance_fee_per_sqm` (annual), price-on-request = 0 |
| **Payment plans** | rows per unit: DP %, `installment_years`, frequency (monthly/quarterly/semi_annual/annual), delivery balloon %, post-delivery years, cash discount %, `maintenance_fee_annual`, `is_default` |
| **Trust** | `verified`, `verified_at/by`, `ownership_doc_ref`, `stale`, DQ score 0-100 |
| **Reservation** | `reserved_until`, `reservation_ref` (escrow), deposit in reservation row |

---

## 4. What Ships in Phase 1 (this branch)

| Deliverable | Path | Notes |
|---|---|---|
| **DB migration** | `supabase/migrations/011_inventory_os_v2.sql` | Additive + idempotent: 3 tables, 22 columns, 8 functions, 1 view, trigger, widened CHECK, FK backfills |
| **Lifecycle API** | `app/api/admin/inventory-os/route.ts` | GET feed (view w/ fallback) + POST guarded transitions & price changes, RBAC-guarded, zod-validated |
| **Admin view** | `app/admin/views/InventoryOsView.tsx` | Lifecycle pipeline board, verification queue w/ doc refs, reservation windows, all actions persisted; bilingual EN/AR |
| **PF rent bug fix** | `lib/services/PFIntegrationService.ts` | Inbound: rent offer → `dealType:'rent'` + `status:'available'`. Outbound: `isRent` from `dealType`, not status |
| **offerType fix** | `app/api/admin/listings/route.ts` | Accepts `offerType`/`offer`; fingerprint uses real value; new listings start at `pending_verification` |
| **Unit model** | `lib/models/schema.ts` | `dealType?: 'sale' | 'rent'` added |
| **This blueprint** | `docs/INVENTORY_OS_BLUEPRINT.md` | The strategy + gap analysis + rollout plan |

## 5. Rollout Plan (safe, zero-downtime)

1. **Apply migration** — `011_inventory_os_v2.sql` on Supabase SQL editor or
   `supabase db push`. Fully idempotent; re-runnable; no column removed.
   The widened CHECK accepts both legacy and canonical values, so the live
   app keeps working during rollout.
2. **Deploy the branch** — Vercel picks up `feature/inventory-os-v2` → merge
   to main after smoke test. The legacy ListingsView continues to work
   unchanged (it writes legacy statuses; the trigger normalizes transitions
   only when values change illegally — legacy→legacy writes pass).
3. **Backfill** — one-off: `unit_code` for legacy rows, `payment_plans` for
   units with the 3 flat columns populated, `price_history` initial rows.
4. **Switch the team** — admin nav now shows "Inventory OS v2"; run
   ListingsView in parallel for 2 weeks (it remains read-compatible).
5. **Phase 2** — ✅ done: `master-sheet-sync` columns fixed + cron scheduled (`30 6 * * *` → daily 06:30 UTC), `snapshot.json` generator wired into build, FX unified in `lib/fx.ts`, reservation auto-expiry cron (`/api/cron/expire-reservations`, daily 02:00 UTC) returns lapsed units to market and queues the owner a WhatsApp notification.
6. **Later** — DQ-aware "Best Units" replacing the hardcoded tier list; live FX
   feed wired into `DEFAULT_FX_RATES` (single knob in agents-core).

## 6. KPIs the system unlocks (previously impossible)

- **Absorption rate** — sold+rented vs live per compound per quarter
- **Days-on-market** by compound / type / price band
- **Price trajectory** — true EGP/m² trend from `price_history` (not snapshot diffs)
- **Inventory aging** — stale %, verification backlog, DQ distribution
- **Reservation conversion** — escrow windows opened → converted vs released
- **Payment-plan demand** — which DP/tenure structures close fastest

## 7. Admin 2.0 — Workflow Studio + merged Inventory OS (2026-09-18)

The admin portal is now the single intelligent surface for the estate:

**🎛️ Workflow Studio** (`/admin → Operations → Workflow Studio`)
- Interactive canvas over `public.workflows` (migration 012: `slug`, `graph`
  JSONB, `script`, `script_lang`, `source_path`, `category` + dangling-edge
  trigger `trg_workflow_graph_guard`).
- Draw the estate: drag nodes, connect the golden handles, add/edit steps,
  label edges — **Save Graph** persists the drawing.
- **Script tab**: the REAL workflow source (01-whatsapp-scraper …
  master-sheet-sync, Leila n8n JSON) is editable inline, with line numbers,
  tab support, ⌘/ctrl+S, revert and download. Saves write `updated_by` —
  re-running the seed never clobbers admin edits (guard: `updated_by IS NULL`).
- Run simulation animates the graph in topological waves.

**🏛️ Inventory OS — Command Deck** (merged experience)
- KPI header (portfolio value, live/reserved, pending review, avg EGP/m², DQ)
  + **Next-Best-Actions strip** (expiring escrows, verification queue,
  freshness/DOM breaches) with one-click CTAs.
- Tabs: **Lifecycle Pipeline** (guarded board) · **Inventory Grid**
  (search/filters/sort/DQ bars/CSV, rows open the drawer) · **Analytics**
  (compound value matrix, DQ distribution, portfolio mix, delivery pipeline).
- **Unit drawer**: full Egyptian specs, saved payment plans + interactive
  installment calculator (DP %, tenure, frequency, delivery balloon,
  EGP/m² maintenance), reason-tracked repricing, status timeline and guarded
  transitions — all persisted through `/api/admin/inventory-os`
  (now with `?id=` unit details: plans + price history + timeline).

**Typography (§15 admin-portal.css)** — identity fonts kept (Plus Jakarta
Sans · Cairo · JetBrains Mono); added a modular type scale, tabular numerals
on every data surface, eyebrow tracking, Arabic line-height polish, on-brand
focus rings and kbd styling.

**Live prototype** — the same experience runs in the Sierra sandbox demo
(port 3000) with seeded Egyptian market data: 62 units, 10 developers,
13 compounds, 8 workflows with their real scripts, ⌘K command palette and
AI-ranked Next-Best-Actions.


---

*Sierra Estates Realty · Inventory OS v2 · New Cairo / Egypt ecosystem*
