Execute an additive, zero-regression integration across the Turborepo monorepo for Sierra Estates, wiring all 6 pillars end-to-end and verifying with real tests and builds for [OPEN: What is the primary purpose of this work: production, showcase, evaluation, or exploration?].

Working directory: H:\Sierra Estates
Integrity mode: [OPEN: Which of these should the team NOT be allowed to do? (a) Copy code from existing open-source projects for core logic, (b) Use pre-built libraries or frameworks for core functionality, (c) Run external scripts or delegate execution to other tools, (d) Read test source code to understand expected behaviour before implementing, (e) None of these: no restrictions, any approach that works]

## Requirements

### R1. 4K Ultra-HD Glowing GIS Map & Proximity Discovery Engine
Configure Leaflet/GIS layers in `apps/sierra-estates-realty` with retina/4K tiles (`detectRetina: true`, `maxNativeZoom: 19`, `maxZoom: 22`), smooth toggle between 4K Masterplan Visualizer and Live Geographic GIS Map, and render GPS bounding polygons for target compounds with glowing metallic gold and emerald/cyan borders and permanent glowing compound name pills at polygon centroids. Add landmark proximity filter chips on the map header with travel time calculations, and bind map pins to live verified listings in Supabase with valuation/GEM chips and inquiry modals.

### R2. The Supply Engine: Owner Bots, Scrapers & Easy Listing
Configure dual-paced owner outreach bots across OpenWA multi-line pool (:2785) sending 30 messages every 2 hours between 12:00 PM and 8:00 PM Africa/Cairo (240 msgs/day total) with human typing simulation and approval gate, cold outreach queue, and scrapers. Implement Easy Listing instant ingestion with AI entity parsing, dual smart code generation (BMM source code and Sierra attribute code), and CRM entry latency tracking (>24h penalty flag).

### R3. Data Quality Estimation (DQE), Spreadsheet & Supabase Hybrid Sync
Enforce strict validation (mandatory E.164 phone normalization, zero empty cells populated with "NULL", price sanity checks reclassifying >= 1M EGP to Resale and <= 400k EGP for Rent, and canonical compound dictionary mapping aliases). Implement DQE deduplication using `sync_hash` across separate Listings, Owners, and Duplicates collections, mirroring only verified available units to public views and the available sheet tab.

### R4. AI Memory, Hyde Park/New Cairo Valuation & Photo/Alert Automation
Seed `public.unified_memory` with real 2026 New Cairo and Hyde Park / MVHP rental and resale baselines, calculating AI valuation badges, GEM badges (<15% below compound avg), ROI estimates, luxury indices, and freshness scores. Automate photo requests via WhatsApp for units with fewer than 8-10 photos, implement Admin Unanswered Alerts banner/tab, apply Sierra Blue Navy + Burnished Gold watermarks, generate Property Finder XML feed, and scrub owner phone numbers from public/download surfaces.

### R5. Buyer Concierge Bot, Editable Scripts, 25% Discount & Calendar Closing
Provide editable bot script manager in Admin OS Settings. Implement 24-hour verification and 7-step buyer qualification flow with 25% online submission discount / $100 Elite Voucher. Generate Top 3 matched units with fallback recommendations and branded PDF tear-sheet, alert sales advisors in Admin Kanban, book viewings via Google Calendar API with 3-way dispatch (CEO, Team Leader, Closer), and trigger 60-minute golden hour follow-up timer and 4-hour post-viewing satisfaction survey.

### R6. Full-Cycle Commission Engine & 6-Month Scaling Dashboard
Add Full-Cycle Commission & KPI Tracker to Admin Reports with 25/25/25/25 split across Bronze, Silver, and Gold tiers, automated governance rules (response SLA, deal volume alerts, CRM entry latency), and 6-month revenue ramp tracker against the 1,000-lead funnel.

[OPEN: External services and git push mode: perform live interactions and push to origin/main if available, or test locally and mock when services/remotes are not reachable?]

## Verification Resources
[OPEN: Are there additional test suites, scripts, or reference datasets beyond the listed pnpm type-check, test:root, and turbo build?]

## Acceptance Criteria

### GIS Map & Discovery
- [ ] 4K retina tiles toggle between Masterplan Visualizer and Live Geographic GIS Map with maxZoom 22.
- [ ] GPS bounding polygons and centroid glowing pills render for all target New Cairo compounds.
- [ ] Landmark proximity filters calculate travel times and highlight nearest compounds.
- [ ] Map pins link to Supabase listings with Rent/Resale, AI valuation, and GEM badges.

### Supply Engine & Ingestion
- [ ] OpenWA bots enforce 240 msgs/day schedule (30 msgs/2h, 12 PM - 8 PM Cairo time) with typing delay and approval gate.
- [ ] Easy Listing parses raw text into structured attributes and generates both BMM and Sierra attribute smart codes.
- [ ] Acquisition-to-CRM latency > 24 hours flags the commission penalty indicator.

### Data Quality & Sync
- [ ] All submitted phone numbers normalize to E.164 and submissions without phones are rejected.
- [ ] Missing optional fields populate with "NULL".
- [ ] Rent listings > 400,000 EGP are blocked or reclassified to Resale if >= 1,000,000 EGP.
- [ ] Compound aliases map to canonical compound names via dictionary.
- [ ] Duplicate detection via `sync_hash` routes matches to Duplicates collection and updates timestamps.

### Valuation & Media Automation
- [ ] `public.unified_memory` seeded with 2026 New Cairo rental/resale price baselines.
- [ ] Property cards display AI Valuation badge, GEM badge when <15% below compound avg, and ROI metrics.
- [ ] Missing photos (<8-10) trigger automated WhatsApp media requests.
- [ ] Admin alert banner flags unanswered owner/client conversations.
- [ ] Property Finder XML/API feed routes correctly and public endpoints mask owner contact info.

### Concierge & Booking
- [ ] Bot scripts are editable from Admin OS Settings.
- [ ] Buyer concierge executes 7-step qualification and offers commission discounts.
- [ ] Top-3 matched units PDF generates and sends via WhatsApp with Kanban alert.
- [ ] Viewing appointments create 3-way Google Calendar invites (CEO, Team Leader, Closer).
- [ ] 60-minute follow-up timer and 4-hour post-viewing survey trigger as specified.

### Commission & Scaling Dashboard
- [ ] Admin Reports dashboard tracks 25/25/25/25 commission splits and governance SLAs.
- [ ] 6-month revenue ramp displays monthly metrics against the 1,000-lead funnel.

### Build & Test Verification
- [ ] `pnpm type-check` passes with zero errors across the monorepo.
- [ ] `pnpm test:root --run` executes and passes with zero test failures.
- [ ] `TURBO_UI=false CI=true pnpm turbo run build --ui=stream` completes with exit code 0.
- [ ] `FINAL_ECOSYSTEM_VERIFICATION.md` is generated detailing all integrated components and verification results.
