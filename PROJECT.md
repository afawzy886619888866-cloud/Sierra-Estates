# Project: Sierra Estates Zero-Regression Monorepo Integration

## Architecture
- **Monorepo Engine**: Turborepo with pnpm workspaces (24 packages/apps).
- **Frontend App**: `apps/sierra-estates-realty` (Next.js App Router, Tailwind CSS, Leaflet/react-leaflet).
- **Backend & Authoritative Store**: Supabase PostgreSQL (`https://gaxfqcietzoonlmatiot.supabase.co`), `@sierra-estates/db`.
- **Background Workflows**: Node.js microservices in `workflows/` (pacing, scrapers, DQE, sheets-supabase sync).
- **Memory & Intelligence**: `public.unified_memory` shared bus, Gemini 2.5/Flash multi-modal reasoning.

## Code Layout
- `apps/sierra-estates-realty/components/site/`: User-facing client/SSR components (CartographicMap, PropertyCard, CompoundsMap).
- `apps/sierra-estates-realty/components/client/`: Dynamic client-only components (InventoryMap).
- `apps/sierra-estates-realty/lib/gis/`: GIS calculations, bounding polygons, centroids, landmark geometry.
- `apps/sierra-estates-realty/lib/server/`: Server utilities (easy-listing parser, sheets bridge).
- `apps/sierra-estates-realty/lib/services/`: Core domain services (LailaLeadIntake, commission-engine, branding, lead-timers).
- `apps/sierra-estates-realty/app/admin/views/`: Admin OS views (AlertsView, ReportsView, PropertiesConsole).
- `apps/sierra-estates-realty/components/admin/`: Admin OS components (AdminPortal, WhatsAppCommandCenter).
- `workflows/`: Background services (13-paced-outreach, 14-sheets-supabase-sync, 15-scribe-guardian, lib/).
- `packages/db/`: Supabase client, migrations, unified memory seeds.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | 4K Retina Tile Configuration | `detectRetina: true`, `maxNativeZoom: 19`, `maxZoom: 22` across CartographicMap and InventoryMap | M1 | R1 |
| 2 | Dual Engine Map Switcher | Toggle between 4K Masterplan Visualizer and Live Geographic GIS Map | M1 | R1 |
| 3 | 14 Target Compound Polygons | GPS bounding polygons with glowing `#C9A84C` and `#10B981`/`#00F0FF` borders for all 14 target compounds | M1 | R1 |
| 4 | Centroid Glowing Name Pills | Permanent glowing name pills at polygon centroids with luxury styling | M1 | R1 |
| 5 | Landmark Proximity Filter Chips | Proximity chips for AUC, Golden Square, 90th St, New Capital with travel time calculations | M1 | R1 |
| 6 | Live Supabase Map Pins & Modals | Map pins with Rent/Resale chips, AI valuation, GEM badges, and 1-click modal triggers | M1 | R1 |
| 7 | Compounds API Enrichment | `/api/compounds` returning polygons, centroids, landmark drive times, and benchmark pricing | M1 | R1 |
| 8 | PropertyCard Badges | AI valuation, GEM badge (>15% below compound avg), Net ROI, Luxury Index, Freshness Score, Direct Owner, Old Contract | M1 | R4 |
| 9 | OpenWA 240 msgs/day Scheduler | 30 msgs/2h between 12:00–20:00 Cairo time, 45–55s typing delay, line-2 exclusion | M2 | R2 |
| 10 | Verified Owners Sheet Ingestion | Workflow 13 candidate loading from verified Google Owners Sheet (GID 1127958606) | M2 | R2 |
| 11 | Cold Outreach Queue & Approval Gate | Unverified owner queue staging and 1-click Admin OS approval gate in WhatsAppCommandCenter | M2 | R2 |
| 12 | Scraper & Broker Group Hooks | Ingestion webhooks for WhatsApp broker groups with Gemini/NLP entity extraction | M2 | R2 |
| 13 | Easy Listing Dual Codes | Extraction of raw text into BMM source codes and Sierra attribute codes | M2 | R2 |
| 14 | Acquisition Latency 5% Penalty | Tracking >24h sourcing-to-CRM latency with 5% commission penalty indicator | M2 | R2 |
| 15 | Phone Gate & E.164 Normalization | Mandatory phone rejection of missing numbers and normalization to E.164 | M2 | R3 |
| 16 | NULL Empty Cell Population | Zero blank cells; populate missing optional fields with "NULL" | M2 | R3 |
| 17 | Price Sanity Enforcement | Cap Rent <= 400,000 EGP/month; reclassify Rent >= 1,000,000 EGP as Resale | M2 | R3 |
| 18 | Canonical Compound Dictionary | Map 50+ Arabic/English aliases into canonical compound names | M2 | R3 |
| 19 | DQE Deduplication & Collections | Deduplicate via `sync_hash` across separate Listings, Owners, and Duplicates collections | M2 | R3 |
| 20 | Real_Available_Units Mirroring | Synchronize only verified available units into sheet tab and public catalog | M2 | R3 |
| 21 | Unified Memory 2026 Baselines | Seed `public.unified_memory` with real 2026 New Cairo and Hyde Park / MVHP baseline ranges | M3 | R4 |
| 22 | Automated Photo Requests Sweep | Automated WhatsApp request triggers for active units with <8-10 photos | M3 | R4 |
| 23 | Admin Unanswered Alert Banner & Tab | Banner and tab in Admin OS for unhandled questions or missing replies | M3 | R4 |
| 24 | Photo Watermarking System | Sierra Blue Navy `#0A1628` + Burnished Gold `#C9A84C` watermark application | M3 | R4 |
| 25 | Property Finder Atlas v1 XML Feed | `/api/feeds/property-finder` XML with owner phone scrubbing to concierge | M3 | R4 |
| 26 | Admin Bot Script & Template Manager | Live editing interface in Admin OS Settings for outreach, qualification, and closing scripts | M4 | R5 |
| 27 | Buyer Concierge 7-Step Qualification | Laila 7-step qualification with Top 3 units and adjacent compound fallback logic | M4 | R5 |
| 28 | 25% Discount & $100 Voucher Link | Request form linking 25% commission discount / $100 Elite Voucher to Supabase | M4 | R5 |
| 29 | Branded PDF Tear-Sheets | Generation and WhatsApp dispatch of Top 3 matched units PDF tear-sheets | M4 | R5 |
| 30 | 3-Way Google Calendar Viewing | Booking with automated 3-way dispatch (CEO, Team Leader, Closer) | M4 | R5 |
| 31 | Golden Hour & Survey Timers | 60-minute golden hour follow-up timer and 4-hour post-viewing satisfaction survey | M4 | R5 |
| 32 | Full-Cycle Commission Engine | 25/25/25/25 split (Acquisition, Listing, Qualification, Closing) across Bronze, Silver, Gold | M5 | R6 |
| 33 | Governance SLA Alerts | 15–30 min response SLA, <2 deals/month alert, <24h CRM entry latency rule | M5 | R6 |
| 34 | 6-Month Revenue Ramp Dashboard | Admin Reports visualization against 1,000-lead funnel (750 Rent / 250 Resale) | M5 | R6 |
| 35 | Opaque-Box E2E Test Suite | Multi-tier test suite verifying all 6 functional pillars | M6 | R7 |
| 36 | Monorepo Ecosystem Build & CI Gate | `type-check`, `test:root`, `turbo run build`, and `FINAL_ECOSYSTEM_VERIFICATION.md` | M6 | R7 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | 4K GIS Map, Proximity & PropertyCard Badges | Features 1–8 (GIS layers, polygons, centroid pills, proximity chips, map pins, `/api/compounds`, PropertyCard badges) | none | PLANNED |
| M2 | Supply Engine, Easy Listing, DQE & Sync | Features 9–20 (OpenWA scheduling, Owners Sheet, approval gate, Easy Listing dual codes, latency penalty, phone gate, DQE duplicates) | none | PLANNED |
| M3 | AI Memory, Automation, Media & Feeds | Features 21–25 (unified_memory seeds, photo sweep, admin alerts, watermarking, Property Finder feed) | none | PLANNED |
| M4 | Buyer Concierge, Scripts & Calendar Closing | Features 26–31 (Admin script manager, Laila 7-step with adjacent fallbacks, 25% voucher, PDF tear-sheets, 3-way Google Calendar, timers) | M3 | PLANNED |
| M5 | Commission Engine & Scaling Dashboard | Features 32–34 (25/25/25/25 commission splits, SLA governance, 6-month ramp tracker in ReportsView) | M2 | PLANNED |
| M6 | E2E Test Suite & Monorepo Build Verification | Features 35–36 (Dual Track E2E suite, `TEST_READY.md`, monorepo build, `FINAL_ECOSYSTEM_VERIFICATION.md`) | M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts
### M1: GIS Engine ↔ Catalog
- `apps/sierra-estates-realty/lib/gis/compound-polygons.ts`:
  - Exports `TARGET_14_COMPOUND_POLYGONS: Record<string, CompoundGisData>`
  - Types: `polygon: [number, number][]`, `centroid: [number, number]`, `avgPriceSqmEgp: number`, `rentalYieldRange: string`.
- `apps/sierra-estates-realty/app/api/compounds/route.ts`:
  - Returns `(Compound & { polygon: [number, number][], centroid: [number, number], avgPriceSqmEgp: number, landmarkDriveTimes: Record<string, number> })[]`.

### M2: Supply Engine ↔ Easy Listing & Commission
- `apps/sierra-estates-realty/lib/server/easy-listing.ts`:
  - `parseEasyListingText(rawText: string, metadata?: { agentInitials?: string, acquiredAt?: string })`:
  - Returns `{ bmmCode: string, sierraCode: string, isLateAcquisition: boolean, commissionPenaltyPct: number }`.

### M3: AI Memory ↔ PropertyCard & Feed
- `packages/db/src/unified-memory-seeds.ts`:
  - Seeds `public.unified_memory` key `market_baseline_2026_new_cairo` and `market_baseline_2026_hyde_park`.
- `apps/sierra-estates-realty/components/site/PropertyCard.tsx`:
  - `CardListing`: `{ freshnessScore?: number, luxuryIndex?: number, isOldContract?: boolean, isGem?: boolean, discountPct?: number }`.

### M4: Buyer Concierge ↔ Calendar & Vouchers
- `apps/sierra-estates-realty/app/api/admin/schedule-viewing/route.ts`:
  - Dispatches calendar invites to `[lead.email, agent.email, 'a.fawzy8866@gmail.com']`.
- `apps/sierra-estates-realty/lib/services/LailaLeadIntakeService.ts`:
  - `findMatchesWithFallback(criteria)`: Returns primary compound matches or adjacent compound matches when primary count is 0.

### M5: Commission Engine ↔ Admin OS Reports
- `packages/shared/src/commission-engine.ts`:
  - `calculateFullCycleCommission(deal: Deal)`:
  - Returns `{ totalCommission: number, acquisition: number, listingBranding: number, qualification: number, fieldClosing: number, tier: 'Bronze' | 'Silver' | 'Gold', penaltyDeduction: number }`.
