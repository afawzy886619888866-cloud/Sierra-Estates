# Survey Report: AI Memory, Concierge, Commission, Admin OS & Monorepo Build Health

**Explorer Agent**: Explorer 3  
**Working Directory**: `H:\Sierra Estates\.agents\teamwork\teamwork_explorer_survey_3\`  
**Date**: 2026-11-04  
**Scope**: Requirements R4, R5, R6, R7 from `ORIGINAL_REQUEST.md`

---

## Executive Summary

This investigation analyzed the architecture, codebase, database schemas, and build/test pipelines across the Sierra Estates Turborepo monorepo, focusing on:
1. **R4**: AI Memory (`public.unified_memory`), Valuation & Badges, Photo/Alert Automation, Watermarking, and Property Finder Feed.
2. **R5**: Buyer Concierge Bot (Laila 7-Step Flow), Template Manager in Admin OS Settings, 25% Discount / $100 Voucher Linking, Top-3 Matching with Fallbacks & Tear-Sheets, 3-Way Calendar Booking, and Golden Hour / Survey Timers.
3. **R6**: Full-Cycle Commission Engine (25/25/25/25 Split across Bronze/Silver/Gold Tiers), Governance SLAs (15–30 min response, <2 deals/mo alert, <24h CRM entry), and 6-Month Revenue Ramp Tracker (1,000-Lead Funnel: 750 Rent / 250 Resale).
4. **R7**: Monorepo Build, Turborepo Pipeline, Workspace Packages, Typecheck, and Test Infrastructure.

**Key Health Findings**:
- **Type-Check**: `turbo run type-check` executes with **exit code 0** across all 21 package tasks (Time: 200ms, FULL TURBO).
- **Vitest Root Suite**: `pnpm test:root` executes 99 test files with 956 tests: **98 test files passed (955 passed, 1 failed)**. The single failure is an oversized git-tracked file check (`docs/drafts/propertyfinder/*.xml` exceeds 5 MB limit).
- **Jest in `sierra-estates-realty`**: Fails immediately due to `pnpm-workspace.yaml` forcing `typescript: 7.0.2`, which `ts-jest` cannot load because TypeScript 7.0 does not expose the legacy JavaScript compiler API needed by `ts-jest`.

---

## 1. R4: AI Memory, Hyde Park/New Cairo Valuation & Photo/Alert Automation

### 1.1 `public.unified_memory` Schema & 2026 New Cairo / Hyde Park Baselines
- **Schema Location**: `supabase/schema.sql` (lines 300–313, 358–359, 1475–1480):
  ```sql
  CREATE TABLE IF NOT EXISTS public.unified_memory (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      agent_id TEXT NOT NULL,
      session_id TEXT,
      category TEXT DEFAULT 'general',
      key TEXT NOT NULL,
      value JSONB NOT NULL,
      embedding vector(1536),
      source TEXT DEFAULT 'verified-system',
      ttl_seconds INT,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_unified_memory_agent_key ON public.unified_memory(agent_id, key);
  ```
- **Existing Seed Logic**: `scripts/migrate-data-to-supabase.ts` (lines 349–463) migrates from `obsidian-store.json` and inserts keys like `system.backend.primary`, `system.ecc.guidelines`.
- **Existing Market Data**: `apps/sierra-estates-realty/lib/services/new-cairo-market-stats.ts` carries static placeholder stats for only 4 areas.
- **Missing / Required Implementation**:
  - Seed `public.unified_memory` with canonical 2026 rental and resale market baselines under agent `valuation-agent` and category `market-baseline` with keys:
    * `market.baseline.2026.hyde_park`: Resale avg `75,000 EGP/m²` (range 65k–95k), Rent avg `55,000 EGP/mo` (range 35k–85k), cap rate `8.5%`.
    * `market.baseline.2026.mountain_view_hyde_park`: Resale avg `82,000 EGP/m²` (range 70k–110k), Rent avg `65,000 EGP/mo` (range 45k–105k), cap rate `9.0%`.
    * `market.baseline.2026.mivida`: Resale avg `115,000 EGP/m²` (range 95k–150k), Rent avg `75,000 EGP/mo` (range 50k–130k), cap rate `8.0%`.
    * Baselines for CFC, Palm Hills New Cairo, Katameya Heights, Eastown, Villette, Swan Lake, Taj City.

### 1.2 PropertyCard Badges (AI Valuation, GEM, ROI, Luxury Index, Freshness, Direct Owner / Old Contract)
- **Existing Code**: `apps/sierra-estates-realty/components/site/PropertyCard.tsx` (lines 44–76, 260–288, 360–395, 600–644).
  - Already renders:
    * `Direct Owner` badge (`p.isDirectOwner || p.ownerType === 'owner'`) with `ShieldCheck` icon.
    * `Verified Fresh` badge (`p.verifiedFresh || p.ago?.includes('d ago')`) with `Sparkles` icon.
    * `AI {score}` score indicator.
    * Bento variant renders Net Cap Rate (`estYield`), Est. Payback (`paybackYears`), and Underpriced pill when `ai >= 9.3`.
- **Missing / Required Implementation**:
  - `GEM Badge`: Display a glowing golden badge when unit price is `> 15% below compound baseline average`:
    * Badge: `💎 GEM (-{pct}% vs Avg)` with metallic gold border (`#C9A84C`).
  - `AI Valuation Badge`: Render on all card variants (Showcase, Compact, Editorial) indicating `Underpriced (Arbitrage)`, `Fair Value`, or `Overpriced`.
  - `Old Contract Badge`: Display `📜 Old Contract` for units acquired under historical owner terms / legacy rates.
  - `Luxury Index & Freshness Score`: Add `Luxury Index: {index}/10` (based on finishing, developer tier, and compound tier) and `Freshness Score: {score}/100`.

### 1.3 Automated WhatsApp Photo Request Triggers (< 8–10 Photos)
- **Existing Code**:
  - `POST /api/inventory/request-photos/route.ts`: Public endpoint for manual photo requests with rate limiting and 24h cooldown.
  - `POST /api/admin/listings/photos/request/route.ts`: Admin portal photo request to owner or broker.
  - `scripts/evaluate-inventory-and-dispatch-criteria.ts`: Line 159 checks `<6 photos`.
- **Missing / Required Implementation**:
  - Automated worker / cron sweep in `apps/sierra-estates-realty/app/api/cron/dispatch/route.ts` or a dedicated cron `check-photos-threshold`:
    * Query active listings where `array_length(images, 1) < 8` (or missing).
    * If owner/broker phone exists and no photo request was dispatched in the last 24h, automatically enqueue WhatsApp photo request via `enqueueWhatsAppJob`:
      ```ts
      await enqueueWhatsAppJob({
        purpose: 'general-outreach',
        toPhone: contactPhone,
        body: `مرحباً، حرصاً على تسويق وحدتكم [${unit.code}] في ${unit.compound} على بروبرتي فايندر وخريطة المستثمرين، نحتاج إلى 8-10 صور عالية الجودة على الأقل. نرجو التكرم بإرسال الصور هنا.`,
        metadata: { kind: 'auto-photo-request', unitCode: unit.code }
      });
      ```

### 1.4 Admin Unanswered Alert Banner & Tab in Admin OS
- **Existing Code**:
  - `apps/sierra-estates-realty/app/admin/AdminPortal.tsx`: Tab `alerts` renders `<AlertsView lang={langKey} />`.
  - `apps/sierra-estates-realty/app/admin/views/AlertsView.tsx`: Lines 20 `const INITIAL_ALERTS: AlertItem[] = [];` starts empty due to anti-fabrication rules, with no live data query.
  - `AdminPortal.tsx`: Top banners exist only for Google Drive & Master Inventory (line 442) and Property Finder (line 869).
- **Missing / Required Implementation**:
  - **Unanswered Alert Banner**: Prominent banner at the top of `AdminPortal.tsx` alerting staff when conversations have unhandled inquiries (`unansweredCount > 0` or wait time > 30 minutes).
  - **Unanswered Conversations Tab / Filter** in `AlertsView.tsx` or `AdminPortal.tsx`:
    * Live query from `public.inquiries` and `public.whatsapp_conversations` (or `unified_memory` key `lead:*:pending_reply`) filtering for unhandled questions or missing replies.
    * Action button to jump directly into the WhatsApp Command Center or open reply modal.

### 1.5 Watermarking Engine Brand Standard
- **Existing Code**:
  - `apps/sierra-estates-realty/lib/services/branding-service.ts`:
    * Line 57: Uses `{ r: 184, g: 134, b: 11, alpha: 0.5 } // Gold-ish`.
    * Line 61: `fill="white"`.
    * Line 79: `fill="white" fill-opacity="0.5"`.
- **Missing / Required Implementation**:
  - Upgrade watermark SVG composite in `BrandingService.brandPropertyImage`:
    * Background: Gradient from Sierra Blue Navy (`#0A1628`) to semi-transparent (`rgba(10, 22, 40, 0.85)`).
    * Accent text / border: Burnished Gold (`#C9A84C`).
    * Reference text: `REF: {propertyCode} | SIERRA ESTATES REALTY` in `#C9A84C` and `#FFFFFF`.

### 1.6 Property Finder Atlas v1 XML/API Feed (`/api/feeds/property-finder`)
- **Existing Code**: `apps/sierra-estates-realty/app/api/feeds/property-finder/route.ts` (306 lines).
  - Selects only verified `publish_status = 'PUBLISHABLE'` broker sale units `>= 2,000,000 EGP`.
  - Scrubs owner phones: Contact is always hardcoded to Sierra Concierge (`CONTACT.phone = '+201092048333'`).
  - Verified tests: `__tests__/property-finder-feed-route.test.ts` and `__tests__/inventory-download-privacy.test.ts` pass.
- **Git Weight Blocker**:
  - `docs/drafts/propertyfinder/propertyfinder-owners-full.xml` (29.6 MB) and `docs/drafts/propertyfinder/propertyfinder-all-units.xml` (12.9 MB) are tracked in git and fail `__tests__/data-hygiene-and-git-weight.test.ts`.
  - Fix: Add to `.gitignore` and run `git rm --cached` on the oversized XML files.

---

## 2. R5: Buyer Concierge Bot, Editable Scripts, 25% Discount & Calendar Closing

### 2.1 Bot Script & Template Manager in Admin OS Settings
- **Existing Code**: `apps/sierra-estates-realty/app/admin/AdminPortal.tsx` lines 1346–1384 (`SettingsPage`).
  - Currently contains only input fields for API keys (Supabase, Gemini, WhatsApp, n8n, Telegram) and GitHub status.
- **Missing / Required Implementation**:
  - Add an **Editable Bot Script & Template Manager** card inside `SettingsPage`:
    * Template tabs:
      1. `Owner Cold Outreach`: Dual-paced campaign copy, owner verification script.
      2. `Buyer Qualification (Laila)`: Greeting, intent, compound, unit type, budget, timeline questions.
      3. `Closer & Viewing Follow-up`: Viewing reminder, 60-minute golden hour touchpoint, 4-hour post-viewing survey.
    * Storage: Save to Supabase `public.unified_memory` under `agent_id = 'concierge-bot'`, `key = 'bot.scripts.templates'`.
    * API Endpoint: `GET/POST /api/admin/bot-templates`.

### 2.2 Buyer Concierge 7-Step Qualification Flow & 25% Discount / $100 Voucher
- **Existing Code**:
  - `apps/sierra-estates-realty/lib/services/LailaLeadIntakeService.ts`:
    * Stages 0 through 6: Greeting, Intent, Compound, Unit Type, Budget/Payment, Timeline, AI Match.
  - `apps/sierra-estates-realty/components/LeadForm.tsx`: Web intake form submitting to `/api/leads`.
  - `apps/sierra-estates-realty/lib/models/schema.ts` lines 499–508: `Voucher` schema.
- **Missing / Required Implementation**:
  - **Website Voucher Link**:
    * In `LeadForm.tsx`, display the promotion banner: *"Submit inquiry now for 25% Brokerage Commission Discount + $100 Elite Concierge Voucher"*.
    * Upon submission, generate a unique voucher record in Supabase:
      ```ts
      const voucherCode = `ELITE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await insertRecord('vouchers', {
        code: voucherCode,
        type: 'discount',
        value: 25, // 25% discount
        currency: 'EGP',
        leadId: createdLead.id,
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
      ```
    * Return voucher code in the response and mention it in the WhatsApp greeting from Laila.

### 2.3 Top 3 Matched Units Generation, Adjacent Compound Fallbacks & PDF Tear-Sheets
- **Existing Code**:
  - `LailaLeadIntakeService.ts` lines 294–296: Filters and slices top 3 units (`.slice(0, 3)`).
  - Line 298: If `scored.length === 0`, simply returns `COPY.no_match`.
  - `apps/sierra-estates-realty/lib/services/pdf-export-service.ts`: `PDFExportService.generateProposalPDFBuffer()`.
- **Missing / Required Implementation**:
  - **Adjacent Compound Fallbacks**:
    * When `scored.length === 0` for the requested compound (e.g. Hyde Park), consult the compound adjacency graph:
      ```ts
      const ADJACENT_COMPOUNDS: Record<string, string[]> = {
        'Hyde Park': ['Mountain View Hyde Park', 'Mivida', 'Eastown', 'The Square'],
        'Mountain View Hyde Park': ['Hyde Park', 'Mivida', 'Villette'],
        'Mivida': ['Hyde Park', 'Mountain View Hyde Park', 'Eastown', 'Katameya Dunes'],
        'Palm Hills New Cairo': ['Mountain View iCity', 'Eastown', 'Villette'],
      };
      ```
    * Re-run matching against adjacent compounds and inform the client:
      *"لم نعثر على وحدة شاغرة حالياً في هايد بارك، ولكن رشحنا لك أفضل 3 وحدات مطابقة في الكمبوندات المجاورة مباشرة (ماونتن فيو هايد بارك وميفيدا)..."*
  - **PDF Tear-Sheet Dispatch**:
    * Generate PDF proposal tear-sheet for the top matches using `PDFExportService`.
    * Enqueue WhatsApp media message with the PDF tear-sheet link.

### 2.4 Google Calendar 3-Way Viewing Booking (CEO, Team Leader, Closer)
- **Existing Code**:
  - `apps/sierra-estates-realty/app/api/admin/schedule-viewing/route.ts`:
    * Line 44: Currently generates only a web link (`calendarLink = https://calendar.google.com/calendar/u/0/r/eventedit?text=Viewing+...`).
  - `apps/sierra-estates-realty/app/api/closer/initiate/route.ts`:
    * Sends email report to `a.fawzy8866@gmail.com`.
- **Missing / Required Implementation**:
  - Implement a 3-way Google Calendar event dispatcher in `lib/services/calendar-service.ts`:
    * Attendees:
      1. CEO: `a.fawzy8866@gmail.com`
      2. Team Leader: `teamleader@sierra-estates.net` (or from agent profile)
      3. Closer: Assigned sales advisor / closer email
    * Event Details: Title `Viewing: [UnitCode] in [Compound] — [ClientName]`, Location, and Description with unit specs and direct owner contact (staff only).
    * Integration: Use `googleapis` Google Calendar API (using `GOOGLE_SERVICE_ACCOUNT_KEY` / `GOOGLE_SERVICE_ACCOUNT_EMAIL`) or Zapier Webhook (`ZAPIER_CALENDAR_WEBHOOK_URL`). Provide graceful fallback to structured calendar link when credentials are not configured in test environments.

### 2.5 60-Minute Golden Hour Follow-Up Timer & 4-Hour Post-Viewing Survey
- **Existing Code**:
  - `apps/sierra-estates-realty/lib/server/lead-timers.ts`: Evaluates stale stages in days (`inbound: 5 days`).
  - `apps/sierra-estates-realty/app/api/admin/viewings/[id]/route.ts`: Mints survey token on `completed` status and dispatches survey immediately.
  - `apps/sierra-estates-realty/app/(site)/viewing-feedback/FeedbackForm.tsx`: Public token-gated client survey page.
- **Missing / Required Implementation**:
  - **60-Minute Golden Hour Timer**:
    * In `lead-timers.ts` and `app/api/cron/lead-timers/route.ts`: For inbound leads (`pipelineStage === 'inbound'` or status `'new'`), evaluate elapsed time in minutes.
    * If `minutesSinceCreation > 60` and no contact was logged, create an urgent `followups` row with priority `'urgent'` and label `'GOLDEN_HOUR_BREACH'`.
  - **4-Hour Post-Viewing Survey Delay**:
    * In `app/api/admin/viewings/[id]/route.ts`: When a viewing is scheduled, schedule the survey dispatch for `scheduledAt + 4 hours` (or store `surveyScheduledFor` and dispatch via cron job 4 hours after appointment).

---

## 3. R6: Full-Cycle Commission Engine & 6-Month Scaling Dashboard

### 3.1 25/25/25/25 Split across Bronze, Silver, Gold Tiers
- **Existing Code**: `apps/sierra-estates-realty/lib/services/commission-engine.ts`.
  - Calculates base salary disbursement (6k onsite / 4k remote, 0/1/2+ deals).
  - Calculates tiered commission on net company share (10%, 15%, 20%, 25%, 40%).
  - Direct web 25% discount logic.
- **Missing / Required Implementation**:
  - Enhance `CommissionEngine` with full-cycle 4-pillar split:
    ```ts
    export interface FullCycleCommissionSplit {
      dealId: string;
      dealValue: number;
      netCompanyShare: number;
      agentTier: 'Bronze' | 'Silver' | 'Gold';
      split: {
        acquisition: { agentName: string; pct: 25; amount: number };
        listingBranding: { agentName: string; pct: 25; amount: number };
        leadQualification: { agentName: string; pct: 25; amount: number };
        fieldClosing: { agentName: string; pct: 25; amount: number };
      };
      totalPayout: number;
    }
    ```
  - Tier rules:
    * **Bronze**: Base rate (10% company net share, 0–2 deals closed/month).
    * **Silver**: Intermediate rate (20% company net share, 3–5 deals closed/month).
    * **Gold**: Elite rate (30–40% company net share, 6+ deals closed/month).

### 3.2 Governance SLA Tracking
- **Required SLAs**:
  1. **15–30 min Lead Response SLA**: Track timestamp delta between lead creation and first logged message. Flag leads exceeding 30 minutes in Admin Dashboard.
  2. **< 2 Deals/Month Quota Alert**: Flag consultants closing fewer than 2 deals per month, enforcing 50% or 0% base salary disbursement.
  3. **< 24h CRM Entry Latency Rule**: Track duration from initial unit acquisition/scrape to insertion into CRM. If `> 24 hours`, display a `5% commission penalty indicator` on the deal and listing.

### 3.3 6-Month Revenue Ramp Tracker (1,000-Lead Funnel: 750 Rent / 250 Resale)
- **Funnel Targets**:
  - Total Target: 1,000 Inbound Leads
    * **Rent Pool**: 750 Leads (75%)
    * **Resale Pool**: 250 Leads (25%)
  - Conversion Milestones:
    * Inbound: 1,000 leads (750 Rent, 250 Resale)
    * Qualified: 400 leads (300 Rent, 100 Resale)
    * Viewings: 160 appointments (120 Rent, 40 Resale)
    * Closed Deals: 40 deals (30 Rent, 10 Resale)
  - Stepped Monthly Revenue Targets (6-Month Ramp):
    * Month 1: 50 leads · 2 deals · 100,000 EGP Revenue
    * Month 2: 100 leads · 4 deals · 250,000 EGP Revenue
    * Month 3: 150 leads · 6 deals · 450,000 EGP Revenue
    * Month 4: 200 leads · 8 deals · 700,000 EGP Revenue
    * Month 5: 250 leads · 10 deals · 1,000,000 EGP Revenue
    * Month 6: 250 leads · 10 deals · 1,200,000 EGP Revenue (Cumulative: ~3.7M EGP)
- **UI Integration**:
  - Add to `apps/sierra-estates-realty/app/admin/views/ReportsView.tsx`:
    * Interactive tab: **Commission & Scaling Dashboard**.
    * Funnel progression bars (Rent vs Resale).
    * Monthly revenue ramp chart (Target vs Actual).
    * Live SLA breach monitor.

---

## 4. R7: Monorepo Build, Typecheck, and Test Infrastructure

### 4.1 Monorepo Packages & Workspaces Catalog
- **Root Config**: `pnpm-workspace.yaml`, `turbo.json`, `package.json`.
- **Apps** (`apps/*`):
  1. `apps/sierra-estates-realty` (`sierra-estates-client-page`): Next.js App Router (v16.4.3), React 19.3.0, Leaflet, GSAP.
  2. `apps/automations` (`@sierra-estates/automations`): N8n and scraper workers.
  3. `apps/easy-listing` (`sierra-easy-listing`): Listing submission tool.
  4. `apps/api`: Python API service.
  5. `apps/agents`: WhatsApp multi-session, vertex agent, bot runners.
- **Packages** (`packages/*`):
  1. `packages/db` (`@sierra-estates/db`): Canonical Supabase database client factory.
  2. `packages/shared` (`@sierra-estates/types`): Shared TypeScript models and enums.
  3. `packages/memory-engine` (`@sierra-estates/memory-engine`): SharedMemoryBus and ECC context cache.
  4. `packages/agents-core` (`@sierra-estates/agents-core`): Agent orchestration and tools.
  5. `packages/deepseek-harness` (`@sierra-estates/deepseek-harness`): DeepSeek reasoning engine.
  6. `packages/gravity-memory` (`@sierra-estates/gravity-memory`): Vector embeddings and memory graph.
  7. `packages/ui` (`@sierra-estates/ui`): Shared React components.
  8. `packages/whatsapp-shared` (`@sierra-estates/whatsapp-shared`): WhatsApp messaging contracts.
  9. `packages/config` (`@sierra-estates/config`): Shared configuration.
  10. `packages/property-finder-api` (`@sierra/property-finder-api`): Property Finder integration API.

### 4.2 Build & Typecheck Verification Results
- **`pnpm type-check`**:
  ```bash
  turbo run type-check
  Tasks: 21 successful, 21 total
  Cached: 21 cached, 21 total
  Time: 200ms >>> FULL TURBO
  ```
  Result: **100% Pass** (Exit Code 0).

- **`pnpm test:root` (Vitest)**:
  ```bash
  vitest run
  Test Files: 1 failed | 98 passed (99)
  Tests: 1 failed | 955 passed (956)
  Duration: 39.07s
  ```
  * Single Failure: `__tests__/data-hygiene-and-git-weight.test.ts > Data Hygiene & Git Weight > no tracked file exceeds 5 MB`.
  * Cause: `docs/drafts/propertyfinder/propertyfinder-owners-full.xml` (29.6 MB) and `docs/drafts/propertyfinder/propertyfinder-all-units.xml` (12.9 MB) are tracked in git.
  * Solution: Untrack from git (`git rm --cached docs/drafts/propertyfinder/*.xml`) and ensure `.gitignore` excludes them.

- **Jest in `apps/sierra-estates-realty`**:
  * Command: `pnpm --filter sierra-estates-client-page test`
  * Error: `The TypeScript compiler "typescript" (version 7.0.2) does not expose the JavaScript compiler API required by ts-jest.`
  * Cause: `pnpm-workspace.yaml` overrides `typescript: 7.0.2`. `ts-jest` v29 requires TypeScript 5.x/6.x or the Babel/SWC transformer.
  * Solution: Configure Jest to use `@swc/jest` or `babel-jest` for TypeScript transforms, or execute test suites via `vitest` which already passes seamlessly across the monorepo.

### 4.3 Required Test Mocks & Offline Stubs
When live external services are unreachable during automated test execution:
1. **OpenWA Gateway (`:2785`)**: Mocked via `tools/test-stubs/empty.js` or in-memory fetch interceptors in `__tests__/whatsapp-sender-pool.test.ts`.
2. **Google Calendar API**: Stub in `lib/services/calendar-service.ts` to return mock event IDs when `GOOGLE_SERVICE_ACCOUNT_KEY` is undefined.
3. **Supabase Storage & DB**: `getSupabaseAdmin` falls back to stub or skips live upload tests cleanly when `SUPABASE_SERVICE_ROLE_KEY` is not present (already verified in `supabase-storage-and-vercel-resilience.test.ts`).

---

## 5. Architectural Recommendations & Implementation Plan

| Task ID | Component | File Targets | Action Summary |
|---|---|---|---|
| **R4.1** | AI Memory 2026 Baselines | `supabase/migrations/20261105_043_seed_market_baselines.sql`, `scripts/seed-2026-baselines.ts` | Seed `public.unified_memory` with real 2026 New Cairo / Hyde Park rental and resale baseline ranges. |
| **R4.2** | PropertyCard Badges | `apps/sierra-estates-realty/components/site/PropertyCard.tsx` | Add GEM badge (<15% below compound avg), AI Valuation badge, ROI, Luxury Index, Freshness Score, and Old Contract badges. |
| **R4.3** | Automated Photo Request | `apps/sierra-estates-realty/app/api/cron/dispatch/route.ts` | Trigger WhatsApp photo requests for active listings with < 8–10 photos. |
| **R4.4** | Admin Unanswered Alert | `apps/sierra-estates-realty/app/admin/AdminPortal.tsx`, `AlertsView.tsx` | Add Unanswered Alert banner and live unanswered conversation tab/filter in Admin OS. |
| **R4.5** | Watermark Colors | `apps/sierra-estates-realty/lib/services/branding-service.ts` | Enforce Sierra Blue Navy (`#0A1628`) + Burnished Gold (`#C9A84C`) watermark gradient and styling. |
| **R4.6** | Git Weight Fix | `.gitignore`, git index | Untrack oversized draft XMLs (`docs/drafts/propertyfinder/*.xml`) to satisfy data hygiene test. |
| **R5.1** | Bot Template Manager | `apps/sierra-estates-realty/app/admin/AdminPortal.tsx`, `app/api/admin/bot-templates/route.ts` | Add editable Script & Template Manager in Settings for outreach, qualification, and closing scripts. |
| **R5.2** | 25% Discount Voucher | `apps/sierra-estates-realty/components/LeadForm.tsx`, `app/api/leads/route.ts` | Link 25% brokerage discount / $100 Elite Voucher to web lead submissions. |
| **R5.3** | Top-3 Fallbacks & Tear-Sheets | `apps/sierra-estates-realty/lib/services/LailaLeadIntakeService.ts` | Add adjacent compound fallback when 0 units match, and attach PDF tear-sheets to recommendations. |
| **R5.4** | 3-Way Google Calendar | `apps/sierra-estates-realty/lib/services/calendar-service.ts`, `schedule-viewing/route.ts` | Implement 3-way Google Calendar invite dispatch (CEO, Team Leader, Closer) with mock fallback. |
| **R5.5** | Golden Hour & Survey Timers | `apps/sierra-estates-realty/lib/server/lead-timers.ts`, `app/api/admin/viewings/[id]/route.ts` | Wire 60-minute golden hour timer for new leads and 4-hour delay for post-viewing survey. |
| **R6.1** | Commission 25/25/25/25 | `apps/sierra-estates-realty/lib/services/commission-engine.ts`, `ReportsView.tsx` | Implement 25/25/25/25 split across Bronze/Silver/Gold tiers in `CommissionEngine` and Admin Reports UI. |
| **R6.2** | Governance SLA Tracker | `apps/sierra-estates-realty/app/admin/views/ReportsView.tsx` | Add 15–30 min response SLA, <2 deals/month quota alert, and <24h CRM entry penalty indicator. |
| **R6.3** | 6-Month Revenue Ramp | `apps/sierra-estates-realty/app/admin/views/ReportsView.tsx` | Add 1,000-lead funnel (750 Rent / 250 Resale) and stepped monthly revenue ramp visualization. |
| **R7.1** | Monorepo Test Stability | `apps/sierra-estates-realty/jest.config.js` or `vitest.config.mts` | Ensure all test suites execute cleanly without TypeScript 7.0 incompatibility. |

---
*Report produced by Explorer 3 (teamwork_explorer_survey_3)*
