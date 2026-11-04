# Original User Request

## Initial Request — 2026-11-04T21:22:36Z

Execute an additive, zero-regression integration across the Turborepo monorepo for Sierra Estates, wiring all 6 pillars end-to-end and verifying with real tests and builds.

Working directory: H:\Sierra Estates
Integrity mode: development

Reference: https://github.com/afawzy886619888866-cloud/Sierra-Estates.git

## Requirements

### R1. 4K Ultra-HD Glowing GIS Map & Proximity Discovery Engine
Configure Leaflet/GIS layers across `apps/sierra-estates-realty` (`components/site/CartographicMap.tsx`, `CartographicMap.module.css`, `components/client/CompoundsMap.tsx`, `/api/compounds`) with retina/4K tiles (`detectRetina: true`, `maxNativeZoom: 19`, `maxZoom: 22`), smooth toggle between 4K Masterplan Visualizer and Live Geographic GIS Map, and render GPS bounding polygons for target compounds (Hyde Park, Mountain View Hyde Park, Mountain View iCity, Mivida, CFC, Palm Hills New Cairo, Katameya Heights, Katameya Dunes, Eastown, Villette, Swan Lake, Taj City, The Square, Lake View) with glowing metallic gold (`#C9A84C`) and emerald/cyan (`#10B981` / `#00F0FF`) borders and permanent glowing compound name pills at polygon centroids. Add landmark proximity filter chips on the map header with travel time calculations, and bind map pins to live verified listings in Supabase (`public.listings`) with Rent/Resale chips, AI fair-price valuation badges, GEM badges (>15% below compound average), and 1-click unit detail and WhatsApp inquiry modals.

### R2. The Supply Engine: Owner Bots, Scrapers & Easy Listing
Configure dual-paced owner outreach bots across OpenWA multi-line pool (`:2785`, lines 1–8) pulling from the verified Owners Sheet to send 30 messages every 2 hours between 12:00 PM and 8:00 PM Africa/Cairo (240 msgs/day total) with 45–55s human typing simulation and a 1-click Human-in-the-Loop approval gate in Admin OS. Provide a Cold Outreach Queue for unverified apartment owners, automated ingestion hooks for WhatsApp Broker Groups and scrapers, and Easy Listing instant ingestion with AI entity parsing into both BMM source codes (`[O/B][CompoundInitial][AgentInitials]-[ID]`) and Sierra attribute codes (`[CompoundCode]-[Rooms][Furnishing]-[Price][K/$]+[Features]`), flagging acquisition-to-CRM latency exceeding 24 hours with a 5% commission penalty indicator.

### R3. Data Quality Estimation (DQE), Spreadsheet & Supabase Hybrid Sync
Enforce strict validation (mandatory phone gate rejecting missing numbers and normalizing to E.164, zero empty cells populated with "NULL", price sanity checks capping Rent at <= 400,000 EGP/month and reclassifying >= 1,000,000 EGP as Resale, and canonical compound dictionary mapping all Arabic/English aliases into canonical names with dropdown validation). Implement DQE deduplication using `sync_hash` across separate Listings, Owners, and Duplicates collections, pausing on duplicate matches to route to the Duplicates review queue or update timestamps, and mirroring only verified available units into the `Real_Available_Units` sheet tab and public web catalog.

### R4. AI Memory, Hyde Park/New Cairo Valuation & Photo/Alert Automation
Seed `public.unified_memory` with real 2026 New Cairo and Hyde Park / MVHP rental and resale baselines, calculating and displaying on every PropertyCard an AI Valuation badge, GEM badge (<15% below compound average), net ROI estimate, Luxury Index, Freshness Score, and Direct Owner / Old Contract badges. Automate photo requests via WhatsApp for units with fewer than 8–10 photos, implement Admin Unanswered Alert banner and tab in `admin.sierra-estates.net` for unhandled questions or missing replies, apply Sierra Blue Navy gradient (`#0A1628`) + Burnished Gold (`#C9A84C`) watermarks to uploaded photos, syndicate verified units to the Property Finder Atlas v1 XML/API feed (`/api/feeds/property-finder`) and Telegram channels, and scrub all owner mobile numbers from public pages and downloads.

### R5. Buyer Concierge Bot, Editable Scripts, 25% Discount & Calendar Closing
Provide an editable Bot Script & Template Manager in Admin OS Settings for live editing outreach, buyer qualification, and closer follow-up templates. Implement buyer bot immediate inquiry response with 24-hour owner availability verification, website request form linking 25% commission discount / $100 Elite Voucher, and 7-step qualification flow. Generate Top 3 matched units with adjacent-compound fallbacks and branded PDF tear-sheets sent via WhatsApp, alert assigned sales advisors in Admin Kanban, book viewings via Google Calendar API with 3-way dispatch to CEO, Team Leader, and Closer, trigger 60-minute golden hour follow-up timers, and dispatch 4-hour post-viewing satisfaction surveys.

### R6. Full-Cycle Commission Engine & 6-Month Scaling Dashboard
Add Full-Cycle Commission & KPI Tracker to Admin Reports with 25/25/25/25 split (Acquisition, Listing/Branding, Lead Qualification, Field Closing) across Bronze, Silver, and Gold tiers, automated governance tracking (15–30 min lead response SLA, <2 deals/month alert, <24h CRM entry latency rule), and 6-month revenue ramp tracker against the 1,000-lead funnel (750 Rent / 250 Resale) and stepped monthly revenue targets.

### R7. Integration Environment & Services Handling
Verify all integrations locally across the monorepo. Where live external services (OpenWA pool, Google Calendar API) or remote Git credentials are unreachable in the test environment, use robust test mocks, stubs, or sandbox fallbacks to ensure verification succeeds, and push commits to `origin/main` if remote credentials permit.

## Acceptance Criteria

### GIS Map & Discovery Engine
- [ ] CartographicMap and CompoundsMap support retina tiles (`detectRetina: true`, `maxNativeZoom: 19`, `maxZoom: 22`) and toggle between Masterplan Visualizer and Live Geographic GIS Map.
- [ ] Polygons for target compounds render with gold/emerald/cyan borders and permanent centroid glowing pills.
- [ ] Landmark proximity filters (New Administrative Capital, AUC, Golden Square, 90th Street) calculate and display travel time.
- [ ] Map pins render live Supabase listings with Rent/Resale, AI valuation, and GEM badges with modal triggers.

### Supply Engine & Smart Coding
- [ ] OpenWA bots enforce 240 messages/day schedule (30 msgs/2h, 12:00 PM – 8:00 PM Cairo time) with typing delay and approval gate.
- [ ] Cold outreach queue and ingestion hooks for WhatsApp broker groups and scrapers are initialized.
- [ ] Easy Listing parser extracts property attributes from raw text and outputs both BMM and Sierra attribute codes.
- [ ] Ingested listings with acquisition latency > 24 hours display the 5% commission penalty indicator.

### Data Quality & Synchronization
- [ ] Phone validation rejects submissions lacking mobile numbers and normalizes valid numbers to E.164.
- [ ] Missing optional fields populate with "NULL".
- [ ] Rent listings with price > 400,000 EGP/month are rejected or reclassified to Resale if >= 1,000,000 EGP.
- [ ] Compound dictionary normalizes Arabic/English aliases to canonical compound names.
- [ ] Duplicate check using `sync_hash` separates records into Listings, Owners, and Duplicates collections.
- [ ] Only Verified Available units synchronize to the available sheet tab and public catalog.

### Valuation, Alerts & Media
- [ ] `public.unified_memory` is seeded with 2026 New Cairo / Hyde Park rental and resale baseline ranges.
- [ ] PropertyCard displays AI Valuation badge, GEM badge when price is >15% below compound average, and calculated ROI.
- [ ] Automated WhatsApp photo request triggers for units with fewer than 8–10 photos.
- [ ] Admin alert banner and tab display conversations with unhandled questions or missing replies.
- [ ] Property Finder Atlas v1 XML/API feed (`/api/feeds/property-finder`) returns valid XML with owner phones scrubbed.

### Concierge, Scripts & Calendar Closing
- [ ] Bot scripts and templates are editable from Admin OS Settings.
- [ ] Buyer concierge handles 7-step qualification, 25% discount link, and $100 Elite Voucher.
- [ ] Top-3 matched units PDF generation and adjacent-compound fallback logic are functional.
- [ ] Viewing booking creates 3-way Google Calendar invites (CEO, Team Leader, Closer).
- [ ] 60-minute golden hour follow-up timer and 4-hour post-viewing survey workflows are wired.

### Commission Engine & Dashboard
- [ ] Admin Reports dashboard tracks 25/25/25/25 commission splits across Bronze, Silver, and Gold tiers.
- [ ] Governance SLAs (response time, deal volume, CRM entry) track and trigger alerts.
- [ ] 6-month revenue ramp tracker visualizes monthly progress against the 1,000-lead funnel targets.

### Monorepo Build & Ecosystem Verification
- [ ] `pnpm type-check` completes with exit code 0 across the monorepo.
- [ ] `pnpm test:root --run` passes with zero failing tests.
- [ ] `TURBO_UI=false CI=true pnpm turbo run build --ui=stream` succeeds with exit code 0.
- [ ] `FINAL_ECOSYSTEM_VERIFICATION.md` is generated detailing all wired endpoints, features, and test results.
- [ ] Additive commits are created and pushed to `origin/main` if git remote credentials permit.
