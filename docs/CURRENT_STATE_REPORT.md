# CURRENT STATE REPORT — Sierra Blu / Sierra Estates Realty

**Date:** 2026-09-29
**Repo:** `sierrablue8866-droid/SE-Vercel-deploy-main` (main @ 6def83e)
**Audit method:** Full code inspection (3 parallel deep-dives + direct file inspection). README claims were verified against actual code — several are **not true in practice**.

---

## 1. WHAT EXISTS

### 1.1 Repository topology (pnpm + Turborepo monorepo)

| Area | Contents |
|---|---|
| `apps/sierra-estates-realty` | Next.js 16.3 dual-domain app: 38 pages (17 public EN + 11 AR + 6 cairo-plaza + explore + 3 admin), **158 API route files** (48 admin, 9 cron, 6 inventory, 5 whatsapp, 5 webhooks, 5 sync…), 46 components, ~160 lib modules incl. 68 services, 107 test files |
| `apps/agents` | 4 bots: `whatsapp-bot` (whatsapp-web.js + Gemini router — flagship), `whatsapp-scraper` (Baileys relay), `sierra-estates-bot` (Python reference with real qualification FSM), `vertex-omni-agent` (Python FastAPI) |
| `apps/api` | Python FastAPI worker: PropertyFinder OAuth sync, in-memory ECC, valuation, HubSpot stubs. Cloud Run ready. Writes nothing to Supabase |
| `apps/automations` | 5 TypeScript n8n-style workers; only 05-unit-adder is a real DB pipeline; 02–04 are mocks |
| `packages/` | 17 packages — see §4 maturity table |
| `supabase/` | Authoritative `schema.sql` (2,246 lines, 57 tables, pgvector, RLS) + 3 migrations |
| `scripts/` | ~150 operational scripts incl. **the master inventory ingestion path** (`sync-all-to-supabase-and-map.mjs`) |
| `infra/` | n8n workflows, OpenWA docker, AWS EC2 config, Baileys scraper, 3rd migration dir |
| Data files | `data/Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx` (7 sheets, 11,488 rows in "All Master Listings"), `owners_rent_tab_separated.tsv` (299 rows), `owners_rent_with_photos.tsv` (332 rows), committed 6.5MB `lib/inventory/snapshot.json` (11,017 units) |

### 1.2 Database (Supabase project `gaxfqcietzoonlmatiot`)

- **57 tables** in `supabase/schema.sql`: `listings` (70+ cols, pgvector `embedding vector(1536)`, PostGIS), `leads`, `deals`, `proposals`, `sales`, `viewings` ×3 (`viewings`, `viewing_requests`, `viewing_appointments`), `owners`, `broker_listings`, `compounds`, `whatsapp_queue` + `whatsapp_numbers` + `whatsapp_conversations`, `followups`, `lead_messages`, `owner_negotiations`, `automation_rules`, `workflows`, `agents_registry`, `audit_logs`, `unified_memory` (pgvector), etc.
- **RLS on every table**: `is_admin()`/`is_staff()` SECURITY DEFINER functions; public can read only `listings` where `status='active'` + compounds + published pages.
- **DB functions**: `match_listings` (1536-dim cosine), `search_properties`, `get_listings_near_capital` (PostGIS), `flag_stale_listings`, `compute_listing_dq`, `listing_fingerprint`, `normalize_listing_status`, status-transition guard trigger.
- Migration 011 (`inventory_os_v2`): payment_plans, price/status history, `data_quality_score`, `verified_at`, unit identity FKs. Migration 012: workflow studio. Third migration dir `infra/` has `broker_sessions`.

### 1.3 Ingestion (what actually feeds inventory)

- **Primary (manual, works):** WhatsApp groups/owner sheets → manual consolidation into the XLSX → `pnpm sync-all-to-supabase-and-map.mjs` → normalize (compound gazetteer + 80-entry coordinate table) → dedupe by `ref_id` → batch upsert into `listings` (250/batch) → regenerates committed snapshot.json + compound-stats + seed.ts.
- **Live (conditional):** Baileys/OpenWA scrapers → `/api/webhooks/whatsapp` (HMAC + shared secret, fail-closed in prod) → `broker_listings` raw table; Google Sheets `raw_messages` → `/api/cron/ingest-from-sheets`; master owner sheet → `/api/cron/sync-master-sheet`; landlord sheet → `/api/admin/ingest`.
- **Outbound:** `whatsapp_queue` → `/api/cron/whatsapp-dispatch` (Twilio, 12:00–20:00 Cairo, 40/hr/sender, 80/day).

### 1.4 Bot & matching

- **Laila WhatsApp intake** (`lib/services/LailaLeadIntakeService.ts`, 543 lines): full bilingual EN/AR qualification FSM — greeting + language detect → intent → compounds → type+beds → budget → timeline → match & shortlist. Gemini 2.0-flash JSON extraction. Sessions in `whatsapp_lead_sessions`. Writes qualified leads to CRM. **This is the strongest asset in the repo.**
- **AI matching engine** (`lib/services/matching-engine.ts`): `runMatchingForLead` pulls up to 20 available `units` → Gemini "Neural Matching Unit V10.0" (ROI-weighted) → heuristic fallback scorer → persists `aiProfiling.topMatches` on lead; VIP Telegram alert ≥90.
- **Deterministic `/api/matches`**: budget 40 / beds 20 / type 15 / zone 15 / aiScore 10 → top 3 with reasons. Real, validated, DB-backed — **but no UI calls it**.
- **Web bot**: `/api/chat` → `OmnichannelChatService` → antigravity-agent (profile extraction + next-question generation) — but only reachable from `/explore` page.

---

## 2. WHAT WORKS (verified in code)

1. `packages/db` record layer — camel/snake conversion, chunked bulk upserts, credential hardening (service key never falls back to anon).
2. Supabase schema: comprehensive, RLS-tested (`supabase/tests/rls.sql` is a genuine behavioral suite).
3. `/api/inventory` — 4-level fallback chain, PII stripping, photo-first sort, 5-min cache.
4. Lead intake: `/api/leads` (zod + rate limit + Supabase write + Telegram alert + WhatsApp queue) — complete.
5. Laila bilingual qualification bot — complete FSM, DB-backed sessions.
6. WhatsApp webhook ingestion → `broker_listings` with sha1 dedupe hash + retry idempotency.
7. Auth/session: HMAC cookie + Supabase token verify + role from `profiles`; cron routes fail closed; documented fixes for historical vulns.
8. Admin API surface: 48 guarded routes incl. real KPI dashboard (`/api/admin/dashboard` queries real DB, no fallback).
9. `sync-all-to-supabase-and-map.mjs` — the one production-grade importer (ref_id conflict key, 250-batch, snapshot regen).
10. WhatsApp outbound queue + Twilio dispatch with operating-hours + quota enforcement.

## 3. WHAT PARTIALLY WORKS

1. **Public matching journey**: `/matches` page exists but scores client-side over stale snapshot `HZDATA`; the real `/api/matches` + `matching-engine.ts` are orphaned from UI.
2. **Property detail page**: works but downloads the *entire* inventory to render one unit; falls back to `HZDATA`.
3. **CRM admin**: leads table real, but stage/hot toggles mutate local React state only (no PATCH) — changes lost on reload.
4. **Viewings**: 3 parallel tables, no public UI wired to `/api/leads/request-viewing` (endpoint complete but unreferenced), Google Calendar only generates a *link* (no API), scheduling defaults to "tomorrow 10:00".
5. **Automation layer**: 05-unit-adder real (read-then-insert, race-prone, no upsert); 02 owner-search placeholder selectors; 03/04 have sends commented out.
6. **Memory engine**: functional file/lexical memory + optional Supabase persistence (`MEMORY_PERSISTENCE` defaults to in-memory → dies on cold start). "Vector/Brain RAG" claims unimplemented (no embeddings computed).
7. **CI/CD**: 6 GitHub workflow files have a **corrupted trigger (`branches: ain]`)** — CI and `deploy-supabase` never fire on main. `vercel.json` registers only 2 crons (Hobby plan); `whatsapp-dispatch` piggybacks daily at 10:00 → queue latency up to 24h.

## 4. WHAT IS BROKEN (P0/P1)

| # | Issue | Evidence |
|---|---|---|
| B1 | **Fabricated property data can reach real clients.** `FALLBACK_INVENTORY` in `packages/whatsapp-shared/src/property-matcher.js:12-104` — 5 fake rentals with plausible `sierra-estates.net/property/...` URLs served when DB empty. `agents-core/personas/property-matcher.ts:40-46` prompts Gemini to invent "3 fictional luxury properties". `openclaw.ts:329` invents price/area/beds on parse failure. `/api/internal/chat` returns canned "Analyzed 306 luxury units…". `sanitizeUnit` fabricates aiScore/lat-lng/price per index. | Violates master Rule 5 (never invent property data) |
| B2 | **`SEED_LISTINGS`: 2,310 hardcoded listings (7,016 lines) served publicly on DB failure**, labelled `ago: "Live Google Sheet Sync"` — misleading freshness. | `lib/seed.ts:64-6996` → `/api/matches`, `/api/listings` |
| B3 | **6.5MB snapshot.json shipped in the client bundle** of `/properties`; `ensure-snapshot.mjs` creates an *empty* stub on fresh clones → site degrades to 8 hardcoded listings. | `PropertiesPage.tsx:34` |
| B4 | **Schema fragmentation**: root `schema.sql` is stale/legacy (defines `units`, `users`, `agents` tables that don't exist in prod); 011/012 + `broker_sessions` (3rd dir) not folded into authoritative schema. Fresh rebuild from schema.sql misses Inventory OS v2. | 4 routes (`broker-brain`, `audio-briefing`, `health`) query a `properties` table that exists in **no** schema |
| B5 | **Importer schema drift**: `sync-giant-inventory.mjs` + `workflows/05-unit-adder` write non-existent columns (`lat`, `location`, `area`, `owner_contact`…) → PGRST204 batch failures. `match_listings_gemini` references non-existent `embedding_768` column → guaranteed runtime failure. | Multiple files |
| B6 | **broker_sessions RLS hole**: `CREATE POLICY … USING (true)` with no `TO service_role` → effectively public read/write if table exists. | `infra/supabase/migrations/20260928_broker_sessions.sql` |
| B7 | **Auth-compat mock admin**: `firebase-compat-supabase.ts:316-325` returns a mock admin user when service creds absent. | `packages/db` |
| B8 | **No `last_verified_at` in base schema**; freshness only partially via 011 `verified_at`; `flag_stale_listings()` exists but is never scheduled. Availability SLA is in-memory. | schema.sql |
| B9 | **Dedupe fragmentation**: ≥5 competing keys (`ref_id`, `code`, `sync_hash`, `dupe_check_hash` — written never read, `sbr_code`, 011 `listing_fingerprint` — never backfilled). Same unit entering via 15 paths can duplicate. | Multiple scripts |
| B10 | **Root TSVs have no importer at all**; `Inventory_with_Photos.xlsx` referenced but absent from repo; `harvest-all-whatsapp-inventory.mjs` has hardcoded `H:/Sheets/...` Windows paths. | Data layer |
| B11 | **Data quality in the master XLSX is poor** (verified by direct inspection): sale-scale prices on rent rows (8.5M on a Rent listing), phone numbers as floats (`1022844661.0`), malformed WhatsApp URLs (`wa.me/228446610` — missing country code), mixed AR/EN values, missing area/beds/baths on most rows. | `data/Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx` |
| B12 | **Admin CRM sends `Authorization: Bearer <CRON_SECRET>` from the browser** (PF sync button) — secret exposure; fallback literal `'sierra-cron'`. | `AdminPortal.tsx:792-794` |
| B13 | **Web AI concierge nearly invisible**: only on `/explore`; site-wide floating widget is a plain wa.me link; `HomePortal.tsx` is dead code. | `app/client/` |

## 5. WHAT IS MISSING

1. Canonical inventory `unit_id` + `public_code` identity model with enforced uniqueness at DB level (current: loose TEXT ids everywhere).
2. Freshness lifecycle: `last_verified_at`, `availability` SLA as DB state, stale classification (0-7 Fresh / 8-30 Aging / 31-60 Stale / 60+ Verify) — none implemented as an enforced system.
3. Owner/broker classification field on listings (`OWNER_DIRECT / BROKER / PARTNER / UNKNOWN`) — currently only `source_channel` text + segment in the XLSX.
4. Publishability workflow (`PUBLISHABLE / REVIEW_REQUIRED / INCOMPLETE / STALE / EXPIRED / DUPLICATE`) — partially exists via `publish_to_client` + `isPubliclyVisibleListingStatus` but no review queue.
5. Real Google Calendar API integration (only link generation).
6. Post-viewing feedback capture (client survey + sales feedback forms).
7. Reservations table (currently `listings.status='reserved'` only).
8. `notifications` table (whatsapp-shared references one that doesn't exist).
9. Semantic search actually using pgvector (embeddings generated by a script but no consumer; `match_listings` returns only 7 columns and is unused by the app).
10. Any test that runs the *real* client journey end-to-end with real data.

## 6. WHAT SHOULD BE REUSED (do not rebuild)

| Asset | Why |
|---|---|
| `supabase/schema.sql` + RLS suite | Solid; needs consolidation of 011/012/broker_sessions, not redesign |
| `packages/db` record layer | Battle-tested upserts with conflict keys |
| `LailaLeadIntakeService` | The qualification FSM the master spec asks for — already bilingual |
| `matching-engine.ts` + `/api/matches` | Real scoring logic; needs wiring, not rewriting |
| `/api/leads`, `/api/inventory`, whatsapp webhook chain, `whatsapp_queue` + dispatch | Working, hardened |
| `sync-all-to-supabase-and-map.mjs` | The ingestion backbone; extend rather than replace |
| Auth/session + admin guards | Fail-closed, documented hardening |
| Admin leads API + dashboard | Real DB queries |

## 7. WHAT SHOULD BE MODIFIED (priority order)

1. Inventory identity/dedupe: standardize on one fingerprint; add `owner_type` classification, `last_verified_at`, `availability`, quality score to the *live* DB; backfill.
2. Kill all fabricated-data paths (B1, B2, sanitizeUnit fabrication, LEADS_DATA, canned replies) — replace with explicit "no results" behavior.
3. Wire `/matches` UI → real engine; add server-side property detail endpoint; stop shipping snapshot in bundle (serve from API/DB).
4. Move `/api/inventory` off service-role client (least-privilege view).
5. Consolidate the 3 viewing tables → one flow; wire public viewing request UI; real Google Calendar API or remove pretense.
6. Fix CRM stage persistence (call existing PATCH).
7. Fix CI triggers (`branches: ain]`), fold migrations into one authoritative schema, fix `test:rls` path.
8. Fix B12 (browser bearer), B6 (broker_sessions policy), B7 (mock admin).

## 8. WHAT SHOULD BE POSTPONED (P3)

- OpenMemory integration, "Memory Brain" vector claims, deepseek-harness, ai-agent-sdk, agents-api echo servers, ai-orchestrator simulation, Dify, vertex omni-agent, n8n Firebase workflows, PropertyFinder *inbound* connector (mock), Stage-9 multi-party negotiation, wealth forecaster, tear-sheets, audio briefings, 3D explorer polish, Cairo Plaza microsite expansion, ROI calculators using unverified yield claims.

## 9. DEPENDENCIES (blocking chain)

```text
CI fix (B5 triggers) ─────────────────┐
Schema consolidation (011/012/broker) ──┼→ Safe re-import of master inventory
Dedupe/fingerprint standardization ────┘        │
                                               v
                              Bot + /matches + website read real DB
                                               │
                            ENV: Supabase keys, GOOGLE_AI (Gemini) key, WhatsApp
                            gateway (OpenWA host or Meta token), Telegram token,
                            SBR_SECRET_KEY, SESSION_SECRET, CRON_SECRET
                                               │
                                               v
                            E2E client-journey test (Phase 7)
```

External credentials required (cannot be verified from repo): Supabase service key, Gemini API key, WhatsApp gateway status (EC2 OpenWA at 18.232.148.172 or Meta Cloud API), Twilio, Telegram bot, Google Sheets service account, Google Calendar OAuth.

## 10. RISKS

| Risk | Severity | Mitigation |
|---|---|---|
| Fake inventory shown to a real client → reputational/legal | **Critical** | Remove FALLBACK_INVENTORY + personas + seed fallbacks first (done in Phase 1.5 of roadmap) |
| Live DB schema drift vs repo (011 comments admit divergences) | High | Column-level diff before any import; fold migrations; re-apply |
| Import batch aborts via status guard / non-existent columns | High | Standardize importer on actual live column set; strip status like `sync-all` does |
| Vercel Hobby cron limits (2 slots) | Medium | Move crons to EC2/VPS systemd or GitHub Actions |
| Single maintainer, 360MB repo with vendored 3rd-party code | Medium | Keep changes surgical; avoid mass refactors |
| Owner PII in repo (TSVs with phone numbers, seed.ts with Arabic owner names) | Medium | PII policy decision needed; TSVs are private repo — keep, but strip from any public path |
| Supabase project URL hardcoded in scripts/.env.example | Low | Env-var it |

---

## 11. VERIFIED INVENTORY SNAPSHOT (source of the numbers)

- XLSX "All Master Listings": **11,488 data rows** (README's 11,488 claim is real data, but quality is unverified until Phase 1).
- Committed `snapshot.json`: 11,017 units → the delta (471) is unexplained drift between last sync and XLSX.
- Segments in XLSX: Direct Owners Rent (565), Direct Owners Resale (1,267), Broker Rent Network (4,970), Broker Sale & Resale (4,584), Team Units (102).
- Root TSVs: owners rent (298 data rows), owners rent with photos (331 data rows) — **no importer consumes these**.

---

*Report produced as Phase 0 deliverable per the Master Execution Command. Next: `IMPLEMENTATION_ROADMAP.md` + `DATA_GAP_REPORT.md`, then Phase 1 data audit.*

---

## 12. PHASE 2 CORRECTIONS (2026-09-29, post-audit verification)

Working through Phase 2/3 surfaced three corrections to this report — recorded
here because the audit must stay honest:

1. **B5-CI was a false positive.** The claimed "corrupted trigger
   (`branches: ain]`)" in 6 workflow files does not exist in the files — a
   bytewise check shows all six are `branches: [main]`. The `ain]` reading was
   a terminal-rendering artifact (the escape sequence `[m` was consumed when
   displaying the file). CI and deploy-supabase triggers were never broken.
2. **B5 root cause inverted.** `match_listings_gemini` referencing
   `embedding_768` was *correct as designed*: the two embedding generators
   (`generate-supabase-embeddings.ts`, `wire-and-seed-supabase.mjs`) both write
   768-dim Gemini vectors to that column. The actual defect was the **missing
   `embedding_768` column** in every schema version, so every generator write
   silently failed. Fixed in `20260929_013_master_inventory_activation.sql`.
3. **Migration locations clarified.** 011/012 lived in
   `apps/sierra-estates-realty/supabase/migrations/` (app-local), not the root
   `supabase/migrations/`. Because the deploy-time runner prefers the root
   directory, a full-repo checkout would **never apply 011/012** — they are
   now consolidated into the root directory (renamed
   `20260924_011_inventory_os_v2.sql` / `20260925_012_workflow_studio.sql`)
   with identical app-local mirrors for sparse checkouts.
4. **Phase-1 audit-trail bug (found during Phase 2 prep).** Exact-fingerprint
   duplicate groups shared one `unit_id`, producing 2,013 self-referencing
   `duplicate_of` entries plus 667 dangling chain references. Fixed in
   `build_master_inventory.py`; CSV regenerated with globally unique row ids
   and fully resolvable duplicate chains (0 self-refs, 0 dangling).
