# 04 — Growth ideas, marketing angles, and enhancements

## A. Market context (researched 19 Jul 2026)
Egypt PropTech platform market ≈ USD 1.2 B, Cairo-dominated. 2026 trends: AI predictive pricing (85%+ claimed accuracy on major compounds), fully automated sales funnels (lead → appointment), smart/eco compound features in New Cairo & Sheikh Zayed as buyer draws. Competitors: Property Finder, Aqarmap, Nawy, Sakan, Makanak, et al.

## B. Product ideas supported by EXISTING backend (fast wins)
1. **AVM / "Sierra Price Index" page** — new-cairo-market-stats + roi-service already exist; publish a monthly compound price index. Competitors sell this; it's also the strongest SEO magnet.
2. **Automated proposal PDFs on WhatsApp** — pdf-export-service (staged) + whatsapp-queue + proposals API = closer sends branded investment PDF in-chat. All parts exist once staged files land.
3. **Down-payment reservation flow** — payment-service (staged) + stripe-payments MCP → "reserve this unit with EGP X" link. New revenue line; requires legal review.
4. **Saved views for brokers** — DSL parser (staged) enables shareable filtered views (`visibility: broker`).
5. **Eco/smart-compound tags** — trend-aligned filter; listing-normalize already extracts finishing/amenities; add tag taxonomy.

## C. Marketing / ads angles ("the ads we can make")
- "The first AI real-estate ecosystem in Egypt" is already the site's claim — back it with a demo video of the S1–S10 pipeline (WhatsApp message → matched proposal in minutes).
- Retarget with AI score: "This villa scores 9.6 — see why." AI-score badges are already on cards.
- Bilingual (AR/EN) WhatsApp-first CTAs — infra already exists; competitors are web-form-first.
- Monthly "New Cairo Market Pulse" report (from §B1) as lead magnet + PR.

## D. Enhancements — INVENTORY focus (owner asked specifically)
`InventoryService.ts` is 1.7 KB with 2 methods (getProperty, getFeaturedListings) while the platform's actual inventory logic is scattered: listing-normalize (11.5 KB), sync-engine (13 KB), PFIntegrationService, houyez seed data, /api/listings, /api/compounds.

**Proposed: consolidate into a real Inventory domain service:**
- `search(criteria)` w/ pagination + semantic fallback (search-service exists)
- `upsertFromSource(source, payload)` — one entry point for PF sync, WhatsApp scrape, Sheets, manual admin (today each path writes Firestore differently → drift)
- **Status lifecycle:** draft → verified → published → reserved → sold/rented (no lifecycle exists today; "1,900+ verified listings" claim needs a verified flag)
- **Dedupe:** hash(compound+type+area+price band) — reuse Gravity dedupe idea from 01
- Freshness SLA: auto-expire/flag listings not re-verified in N days (MaintenanceMonitor can host)
- Availability integrity: reserved-unit locks tied to payment-service escrow

## E. Repo-health enhancements (repeated for the record)
1. Purge firebase/ (296 MB) + .venv/ (151 MB) + _unused_archive/ (66 MB) AFTER extracting staged files.
2. Fix stale README ("frontend removed" is false).
3. Decide fate of duplicate admin (apps/admin-dashboard vs (admin) routes).
4. Rotate exposed OpenClaw token (arc, public).
5. De-duplicate the 7–20 copies of legacy bot/services inside the repo.
