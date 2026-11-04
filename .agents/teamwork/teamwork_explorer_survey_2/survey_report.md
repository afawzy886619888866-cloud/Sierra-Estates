# Explorer 2 Survey Report: Supply Engine, Easy Listing, DQE & Supabase Sync

**Date**: 2026-11-04  
**Author**: Explorer 2 (Supply Engine, Easy Listing, DQE & Supabase Sync)  
**Scope**: Requirements R2 & R3  
**Target Repository**: `H:\Sierra Estates`

---

## 1. Executive Summary

This report delivers a full-spectrum architecture and codebase investigation of **Requirement 2 (The Supply Engine: Owner Bots, Scrapers & Easy Listing)** and **Requirement 3 (Data Quality Estimation, Spreadsheet & Supabase Hybrid Sync)** across the Sierra Estates monorepo.

### Core Discoveries
1. **R2 Paced Outreach Engine**:
   - `workflows/13-paced-outreach/paced-outreach.js` already implements the strict Mission-2 pacing doctrine: 30 messages every 2 hours between 12:00 PM and 8:00 PM Africa/Cairo (4 slots × 30 × 2 bots = 240 msgs/day total), 45–55s human typing simulation jitter (`PACE_TYPE_MIN_MS=45000`, `PACE_TYPE_JITTER_MS=10000`), 8-line OpenWA pool rotation on `:2785`, and hard exclusion of `line-2` (flagship concierge `201092048333`).
   - **Gaps**: `loadCandidates()` in `paced-outreach.js` pulls exclusively from Supabase `public.listings`. It lacks direct reading from the verified Google Owners Sheet (`gid=1127958606` or `UNITS_SHEET_ID`), which is currently only wired in `workflows/09-owner-outreach/outreach.js`. Furthermore, the 1-click human approval gate in Admin OS and the dedicated Cold Outreach Queue for unverified apartment owners need a formal database schema (`public.cold_outreach_queue` or dedicated query filters) and full UI button wiring.
2. **R2 Easy Listing Instant Parser & Smart Coding**:
   - `apps/sierra-estates-realty/lib/server/easy-listing.ts` and `apps/sierra-estates-realty/app/api/easy-listing/route.ts` currently generate an internal code formatted as `[REGION]-[COMPOUND]-[UNIT_TYPE]-[FLOOR]-[AREA]M` (e.g. `NC-MIV-APT-F2-175M`).
   - **Gap**: The requirement dictates dual-code generation:
     - **BMM source code**: `[O/B][CompoundInitial][AgentInitials]-[ID]` (e.g. `OMFA-101`, `BHPFA-204`).
     - **Sierra attribute code**: `[CompoundCode]-[Rooms][Furnishing]-[Price][K/$]+[Features]` (e.g. `HP-3F-45K+G`, `MV-2U-25K+P`).
     - Partial algorithms exist in `apps/sierra-estates-realty/lib/services/coding-algorithm.ts` (`buildSierraCodeMetadata`), `workflows/lib/listing-validation.js` (`smartUnitCode`), and `apps/easy-listing/src/lib/listing.ts` (`generatePropertyCode`), but are not unified into `easy-listing.ts`.
   - **Gap**: Acquisition-to-CRM latency tracking (`> 24h` between intake/sourcing timestamp and CRM registration) triggering a `5% commission penalty indicator` is completely unbuilt and must be added to data models and Admin UI.
3. **R3 Data Quality Estimation (DQE) & Hybrid Sync**:
   - `workflows/lib/listing-validation.js`, `workflows/14-sheets-supabase-sync/sync.js`, and `scripts/GoogleAppsScript_SierraEstates_MasterInventory_v7.gs` are already robustly aligned to Rules 1–6:
     - Rule 1: Mandatory Egyptian mobile phone gate (`+201[0125]\d{8}`) — missing/invalid rejects.
     - Rule 2: Zero empty cells; missing fields populated with literal string `"NULL"`.
     - Rule 3: Deal type ↔ price sanity checks (Rent ceiling <= 400,000 EGP/month; Rent >= 1,000,000 EGP auto-reclassifies to Resale).
     - Rule 4: Canonical compound gazetteer mapping Arabic/English/slang aliases to canonical names.
     - Rule 5: Smart coding integration.
     - Rule 6: Dropdown coercion across 7 standardized enumerations.
     - `Real_Available_Units` (Tab 2, 24 columns) strictly mirrors only units where `Listing_Status === 'Available' && Contact_Status === 'Verified Available'`, while masking owner phones (`100***1490`).
   - **Gap**: DQE deduplication via `sync_hash` currently operates in-memory/Redis (`workflows/lib/dedup-index.js`) and column-level (`public.listings.sync_hash`). There is **no dedicated `public.duplicates` review queue table** in Supabase, nor is there a separate `COLLECTIONS.duplicates` collection configured in `schema.ts`. When a duplicate match is paused, it currently updates in-place or drops silently rather than cleanly routing to an audited Duplicates review queue.

---

## 2. R2: The Supply Engine Deep Dive

### 2.1 OpenWA Multi-Line Pool Setup (`:2785`, lines 1–8) & Concierge Exclusion

#### Existing Implementation
- **Files**:
  - `workflows/13-paced-outreach/paced-outreach.js` (lines 9–12, 77, 307–316)
  - `workflows/lib/gateway-client.js` (lines 6, 73)
  - `apps/sierra-estates-realty/lib/server/whatsapp-drain.ts` (lines 73–86, 173–210)
  - `apps/sierra-estates-realty/components/admin/command-center/BotsDesk.tsx` (lines 343–379)
  - `apps/sierra-estates-realty/app/admin/whatsapp/WhatsAppCommandCenter.tsx` (lines 50–120)
- **Observations**:
  - The OpenWA gateway runs on `http://127.0.0.1:2785` (`WHATSAPP_API_URL`).
  - `CONCIERGE_LINE = 'line-2'` is defined as the flagship concierge line (phone: `+20 109 204 8333`).
  - In `workflows/13-paced-outreach/paced-outreach.js:310-316`:
    ```javascript
    function assignLines(readyLines) {
      const usable = (readyLines || []).filter((l) => l !== CONCIERGE_LINE);
      const a = [];
      const b = [];
      usable.forEach((l, i) => (i % 2 === 0 ? a : b).push(l));
      return { 'active-renting': a, 'massive-owners': b };
    }
    ```
  - This hard-excludes `line-2` from owner outreach, alternating the remaining 7 lines between Worker A (`active-renting`) and Worker B (`massive-owners`).

#### Identified Gaps
1. In `apps/sierra-estates-realty/lib/server/whatsapp-drain.ts`: While `workflows/13-paced-outreach` strictly excludes `line-2`, the Next.js `whatsapp-drain.ts` queue worker reads `gatewaySessions` from `system_config` but does not enforce a hard-coded exclusion filter against `line-2` when dispatching `owner-outreach` or `general-outreach` jobs.
2. In `workflows/13-paced-outreach/paced-outreach.js`: `loadCandidates()` only reads from Supabase `public.listings`. It does not support reading candidate rows from the Google Owners Sheet (`gid=1127958606`).

---

### 2.2 Owners Sheet Integration & Daily Pacing Scheduling

#### Timing and Budget Doctrine
- **Windows & Cadence**:
  - Cairo Operating Window: 12:00 PM – 8:00 PM Africa/Cairo (`PACE_WINDOW = '12-20'`).
  - Slot Budget: 30 messages every 2 hours per worker (`PACE_SLOT_BUDGET = 30`, `PACE_SLOT_HOURS = 2`).
  - Slots per day: 4 slots (12:00–14:00, 14:00–16:00, 16:00–18:00, 18:00–20:00).
  - Workers: 2 workers (Worker A: `active-renting`, Worker B: `massive-owners`).
  - Daily Total: 4 slots × 30 messages × 2 bots = **240 messages/day total** (`PACE_DAILY_CAP_TOTAL = 240`).
- **Human Typing Simulation (Anti-Ban Pacing)**:
  - `PACE_TYPE_MIN_MS = 45000` (45 seconds).
  - `PACE_TYPE_JITTER_MS = 10000` (10 seconds jitter).
  - Delay formula: `45000 + Math.floor(Math.random() * 10000)` ms (45–55 seconds).
  - Implemented verbatim in `workflows/13-paced-outreach/paced-outreach.js:318-320`:
    ```javascript
    function typingDelay() {
      return TYPE_MIN_MS + Math.floor(Math.random() * TYPE_JITTER_MS); // 45–55 s
    }
    ```

#### Sheet vs Database Source Hybridization
- In `workflows/09-owner-outreach/outreach.js`, lines 26–36:
  - It pulls from Google Sheet GID `1127958606` (the canonical owner inventory tab) via public gviz CSV, filtering rows by `Mobile` and `Availability`.
  - Dedupes against sheet column `تاريخ اخر تواصل` and local ledger `owner-outreach-ledger.jsonl`.
- In `workflows/13-paced-outreach/paced-outreach.js`, lines 182–219:
  - It pulls only from `supabase().from('listings').select(...)`.
- **Architectural Solution**:
  - Enhance `workflows/13-paced-outreach/paced-outreach.js` to support hybrid candidate ingestion: read first from the verified Owners Sheet (using `google-sheets.js` / gviz CSV export from `UNITS_SHEET_ID` / `gid 1127958606`), and merge with Supabase `public.listings` where `source_channel IN ('Direct Owner', 'sheets')`.

---

### 2.3 Cold Outreach Queue & Admin OS 1-Click Human Approval Gate

#### Requirements
1. **Cold Outreach Queue**: Staging unverified apartment owners (scraped from WhatsApp groups, broker chats, or raw feed) so they are not mass-spammed without staff awareness.
2. **1-Click Human Approval Gate**: An operator in Admin OS reviews the batch preview and clicks "Approve Outreach Slot" before messages are dispatched.

#### Current Code Analysis
- In `apps/sierra-estates-realty/app/api/admin/whatsapp/owner-outreach/route.ts`:
  - Supports `POST` with `action: 'preview'` and `action: 'enqueue'`.
  - `preview` loads eligible candidates via `OwnerOutreachService.loadEligibleInventory()` and formats the Arabic outreach message.
  - `enqueue` inserts batch jobs into `whatsapp_queue`.
- In `apps/sierra-estates-realty/components/admin/command-center/BotsDesk.tsx`:
  - Contains trigger cards for `scribe`, `curator`, `closer`, and `matchmaker`, but lacks a dedicated "Approve Owner Outreach Batch" card or modal.
- In `apps/sierra-estates-realty/app/admin/whatsapp/WhatsAppCommandCenter.tsx`:
  - Contains queue controls (drain / retry / cancel), but lacks an explicit "Cold Outreach Queue" review table with a 1-click "Approve & Send (30 msgs)" button.

#### Proposed Architecture
- Add an explicit status or table for cold outreach:
  - In `supabase/schema.sql`, add `public.cold_outreach_queue` (or status `'pending_approval'` on `whatsapp_queue`).
  - Provide endpoint `POST /api/admin/whatsapp/owner-outreach` with action `'approve_slot'`, releasing up to 30 queued messages for the current 2-hour window.
  - Add a "Cold Outreach Queue" tab in `WhatsAppCommandCenter.tsx` showing recipient phone, property compound, generated message preview, and an "Approve Next 30 Paced Sends" 1-click button.

---

### 2.4 Ingestion Hooks for WhatsApp Broker Groups & Scrapers

#### Current Code Analysis
1. **Gateway Harvester Consumer (`workflows/01-whatsapp-scraper/index.js`)**:
   - Queries `http://127.0.0.1:2785/api/harvester/recent`.
   - Normalizes parsed units from broker chats.
   - Appends records to `.state/scraped-listings.jsonl` and Google Sheets tab `raw_messages`.
2. **Inbound Webhook Listener (`apps/sierra-estates-realty/app/api/webhooks/whatsapp/route.ts`)**:
   - Handles `message.received` event from OpenWA gateway.
   - Differentiates direct owner groups (`AugustOwnersAgentService.isAugustOwnersGroup(group)`) vs WhatsApp Broker Groups (`isGroupChat` where not August Owners).
   - Routes broker groups to `WhatsAppParserService.processIncomingMessage(message, sender, group)`.
   - `WhatsAppParserService` parses text via Gemini (or NLP fallback), checks duplicates, generates Sierra codes, and saves to `public.broker_listings` (`COLLECTIONS.brokerListings`) and calls `GoogleSheetBridge.pushUnitToSheet()`.
3. **Scribe Guardian (`workflows/15-scribe-guardian/scribe.js`)**:
   - Runs every 30 minutes.
   - Inspects newly ingested listings in Supabase `public.listings`.
   - Auto-flags Featured/GEM units when `price <= 0.85 * compound_avg` or text contains prime view keywords (`sea view`, `landscape`, `garden view`, `pool view`, `open view`, `فيو بحر`, `لاند سكيب`).
   - Flags units lacking photos for automated photo request.

---

### 2.5 Easy Listing Instant Parser: BMM Source Codes & Sierra Attribute Codes

#### Requirement Specification
The Easy Listing instant ingestion parser must extract property attributes and emit **two distinct standardized codes**:
1. **BMM Source Code**: `[O/B][CompoundInitial][AgentInitials]-[ID]`
   - `[O/B]`: Source indicator (`O` for Direct Owner, `B` for Broker).
   - `[CompoundInitial]`: 1–2 letter compound initials (e.g., `H` for Hyde Park, `MV` for Mountain View, `M` for Mivida).
   - `[AgentInitials]`: Sourcing agent/uploader initials (e.g., `FA` for Frank Adams, `SB` for Staff Bot).
   - `-[ID]`: Sequential or unique numeric ID (e.g. `101`, `204`).
   - Example: `OMFA-101` (Direct Owner, Mivida, Agent FA, #101).
2. **Sierra Attribute Code**: `[CompoundCode]-[Rooms][Furnishing]-[Price][K/$]+[Features]`
   - `[CompoundCode]`: 2–3 letter compound code (e.g., `HP`, `MV`, `VS`, `CF`).
   - `[Rooms]`: Number of bedrooms (e.g., `3`, `4`).
   - `[Furnishing]`: Furnishing code (`F` = Fully Furnished, `S` = Semi-Furnished, `U` = Unfurnished, `K` = Kitchen only).
   - `[Price][K/$]`: Formatted price token (`45K`, `1.5M`, `$2500`).
   - `+[Features]`: Suffix of priority feature letters (`+G` = Garden, `+P` = Pool, `+R` = Roof, `+V` = Villa).
   - Example: `HP-3F-45K+G` (Hyde Park, 3 Bed Furnished, 45,000 EGP, with Garden).

#### Current Implementation vs Gap
- In `apps/sierra-estates-realty/lib/server/easy-listing.ts:19-25`:
  - It generates: `[REGION]-[COMPOUND]-[UNIT_TYPE]-[FLOOR]-[AREA]M` (e.g. `NC-MIV-APT-F2-175M`).
  - This is an internal location code, NOT the BMM source code or the Sierra attribute code!
- In `apps/sierra-estates-realty/lib/services/coding-algorithm.ts:143-171`:
  - `buildSierraCodeMetadata()` already builds the Sierra attribute code (`strategicCode = `${locationCode}-${rooms}${furnishingStatus}-${priceToken}${featuresString}``) and technical ID!
- **Required Modification**:
  - Update `apps/sierra-estates-realty/lib/server/easy-listing.ts` to integrate `coding-algorithm.ts` and `listing-validation.js`, returning in `EasyListingResult`:
    ```typescript
    bmm_code: string;       // [O/B][CompoundInitial][AgentInitials]-[ID]
    sierra_code: string;    // [CompoundCode]-[Rooms][Furnishing]-[Price][K/$]+[Features]
    internal_code: string;  // canonical legacy code
    ```

---

### 2.6 Acquisition-to-CRM Latency Tracking & 5% Commission Penalty Indicator

#### Requirement Specification
- Track the elapsed time between:
  - `acquisition_timestamp` (when listing was originally posted in WhatsApp group, received by scraper, or submitted by owner).
  - `crm_entry_timestamp` (when listing was reviewed, validated, and persisted into the CRM / `public.listings`).
- **Latency Rule**: If `crm_entry_timestamp - acquisition_timestamp > 24 hours` (1440 minutes):
  - Mark listing with `latency_penalty_applied = true`.
  - Set `commission_penalty_pct = 5`.
  - Display an unmistakable **`⚠️ >24h CRM Entry (-5% Commission Penalty)`** indicator badge on the listing in Admin OS (`PropertiesConsole.tsx`, `PropertyCard.tsx`, and Admin Ingest).

#### Current Code Analysis
- In `supabase/schema.sql`, `public.listings` has `created_at` and `updated_at`, but no explicit `acquisition_timestamp`, `acquisition_latency_hours`, or `latency_penalty_applied` columns.
- Neither `PropertiesConsole.tsx` nor `PropertyCard.tsx` currently computes or displays this penalty indicator.
- **Required Modifications**:
  - Add SQL migration adding `acquisition_timestamp TIMESTAMPTZ`, `acquisition_latency_hours NUMERIC(8,2)`, `latency_penalty_applied BOOLEAN DEFAULT FALSE`, `commission_penalty_pct INT DEFAULT 0` to `public.listings`.
  - In `apps/sierra-estates-realty/lib/server/listing-columns.ts` and `app/api/admin/ingest/route.ts`, compute latency on insert:
    ```typescript
    const acquisitionMs = new Date(input.acquisitionTimestamp || input.dateAdded || now).getTime();
    const entryMs = Date.now();
    const latencyHours = Math.max(0, (entryMs - acquisitionMs) / (1000 * 60 * 60));
    const latencyPenaltyApplied = latencyHours > 24;
    const commissionPenaltyPct = latencyPenaltyApplied ? 5 : 0;
    ```
  - In `PropertiesConsole.tsx`, render a yellow/amber warning pill `⚠️ >24h Entry (-5% Comm)` when `row.latencyPenaltyApplied` is true.

---

## 3. R3: Data Quality Estimation (DQE), Spreadsheet & Supabase Hybrid Sync Deep Dive

### 3.1 Mandatory Phone Gate & E.164 Normalization

#### Rules
- A listing without a valid mobile phone number is **hard-rejected** — it must never enter Google Sheets or Supabase.
- Mobile numbers must be normalized to standard Egyptian E.164 format:
  - Input: `0100 882 1490`, `00201008821490`, `201008821490`, `+20 100 882 1490`
  - Output: `+201008821490` (or local canonical `201008821490` for WhatsApp gateway `@c.us`).

#### Code Locations & Verification
- `workflows/lib/phone-utils.js:14-36`:
  ```javascript
  function normalizePhone(raw) {
    if (!raw) return null;
    let d = toWesternDigits(String(raw)).replace(/\D/g, '');
    if (d.startsWith('0020')) d = d.slice(2);
    else if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1);
    else if (!d.startsWith('20') && d.length === 10) d = '20' + d;
    if (/^201[0125]\d{8}$/.test(d)) return d;
    return null;
  }
  ```
- `workflows/lib/listing-validation.js:75-81`:
  ```javascript
  function validateOwnerPhone(raw) {
    const phone = normalizePhone(raw);
    if (!phone || !/^201[0125]\d{8}$/.test(phone)) {
      return { ok: false, reason: 'NO_VALID_PHONE', message: 'Never accept a unit without a valid owner/source mobile (01xxxxxxxxx).' };
    }
    return { ok: true, phone };
  }
  ```
- `scripts/GoogleAppsScript_SierraEstates_MasterInventory_v7.gs:119-125`:
  Enforces `validEgyptianMobile(raw)` inside the Google Sheet on edit.

---

### 3.2 Empty Cell Handling: Zero Empty Cells ("NULL" Fill)

#### Rules
- No blank cells permitted anywhere in Google Sheets.
- Every omitted or undefined optional cell (e.g. Media_Links, Notes, Floor, Sourced_By_Agent) must be populated with literal `"NULL"`.

#### Code Locations & Verification
- `workflows/lib/listing-validation.js:58, 133-142, 200-217`:
  - `NULL_CELL = 'NULL'`.
  - `fillNulls(record)` maps any `undefined`, `null`, or empty string `""` to `"NULL"`.
  - Verified in `__tests__/mission2-5-pipeline.test.ts:130`:
    `expect(r.record.Media_Links).toBe('NULL');`
- `scripts/GoogleAppsScript_SierraEstates_MasterInventory_v7.gs:99, 135-148`:
  - Apps Script function `enforceNoBlankCells()` iterates over all rows and fills empty cells with `"NULL"`.

---

### 3.3 Price Sanity Checks: Rent Ceiling & Resale Auto-Classification

#### Rules
- Rent Price Ceiling: Maximum **400,000 EGP/month**.
  - If a Rent listing is priced between 400,000 EGP and 1,000,000 EGP, it is flagged as an anomaly (`Rent price exceeds 400,000 EGP/month ceiling — flagged for review`).
- Rent-to-Resale Threshold: **>= 1,000,000 EGP**.
  - If a Rent listing is entered with price >= 1,000,000 EGP, it is **automatically reclassified to "Resale"** (`autoClassified: true`) with an anomaly warning.

#### Code Locations & Verification
- `workflows/lib/listing-validation.js:56-57, 83-107`:
  ```javascript
  const RENT_PRICE_CEILING_EGP = 400000;
  const RENT_RESALE_THRESHOLD_EGP = 1000000;

  function enforceDealTypePriceGate(dealType, priceEgp) {
    const price = Number(priceEgp);
    const dt = coerceDropdown('Deal_Type', dealType) || 'Sale';
    if (!Number.isFinite(price) || price <= 0) return { dealType: dt, autoClassified: false, anomaly: null };
    const lower = dt.toLowerCase();
    if (lower === 'rent' && price >= RENT_RESALE_THRESHOLD_EGP) {
      return {
        dealType: 'Resale',
        autoClassified: true,
        anomaly: `Rent price ${price.toLocaleString('en-US')} EGP >= ${RENT_RESALE_THRESHOLD_EGP.toLocaleString('en-US')} — auto-classified as Resale.`,
      };
    }
    if (lower === 'rent' && price > RENT_PRICE_CEILING_EGP && price < RENT_RESALE_THRESHOLD_EGP) {
      return {
        dealType: dt,
        autoClassified: false,
        anomaly: `Rent price ${price.toLocaleString('en-US')} EGP exceeds the ${RENT_PRICE_CEILING_EGP.toLocaleString('en-US')} EGP/month ceiling — flagged for review.`,
      };
    }
    return { dealType: dt, autoClassified: false, anomaly: null };
  }
  ```
- Verified in `__tests__/mission2-5-pipeline.test.ts:101-112`:
  - Test passes: Rent of 1.5M EGP auto-classifies as Resale.
  - Test passes: Rent of 500k EGP flags anomaly.

---

### 3.4 Canonical Compound Gazetteer & Dropdown Standards

#### Rules
- Arabic, English, colloquial, and acronym variations normalize to single canonical compound names:
  - `cfc`, `كايرو فيستيفال`, `cairo festival` → `Cairo Festival City`
  - `mvd`, `ميفيدا`, `mevida` → `Mivida`
  - `هايد بارك`, `haid bark`, `hayd park` → `Hyde Park`
  - `ماونتن فيو اي سيتي`, `mv icity` → `Mountain View iCity`
  - `اب تاون`, `أبتاون كايرو`, `uptown` → `Uptown Cairo`
  - `فيليت`, `villette sodic` → `Villette`
  - `المراسم`, `فيفث سكوير` → `Fifth Square`
- Dropdown Validation Enforced on 7 Columns:
  1. `Deal_Type`: `['Rent', 'Resale', 'Sale', 'Primary']`
  2. `Unit_Type`: `['Apartment', 'Villa', 'Townhouse', 'Twinhouse', 'Penthouse', 'Duplex', 'Studio', 'Chalet', 'Office', 'Retail', 'Land']`
  3. `Furnishing`: `['Furnished', 'Semi-Furnished', 'Unfurnished', 'Fully Furnished', 'Kitchen Appliances & ACs']`
  4. `Finishing`: `['Without Finishing', 'Semi-Finished', 'Core & Shell', 'Lux', 'Super Lux', 'Ultra Super Lux', 'Fully Finished']`
  5. `Contact_Status`: `['Not Contacted Yet', 'Contacted - No Answer', 'Contacted - Answered', 'Verified Available', 'Not Available', 'Sold', 'Rented']`
  6. `Listing_Status`: `['Pending Verification', 'Available', 'Unavailable', 'Sold', 'Rented', 'Archived', 'DQE Flag — price variance']`
  7. `Canonical_Compound`: Validated against gazetteer.

#### Code Locations & Verification
- `workflows/lib/compound-canonical.js:25-180` (complete 50+ alias gazetteer)
- `workflows/lib/listing-validation.js:32-72` (`coerceDropdown()`)
- `scripts/GoogleAppsScript_SierraEstates_MasterInventory_v7.gs:48-82` (`applyDropdowns()`)
- Verified in `__tests__/mission2-5-pipeline.test.ts:36-61`.

---

### 3.5 DQE Deduplication via `sync_hash` across Collections

#### Architecture
The deduplication mechanism operates at three layers:
1. **In-Memory & Redis DQE Index (`workflows/lib/dedup-index.js`)**:
   - Composite key: `sha1(normalized_phone | canonical_compound | unit_type | area_bucket).slice(0, 24)`
   - Tolerance check:
     - If same composite key exists and `priceDiff <= 5%` (`PRICE_DQE_TOLERANCE = 0.05`):
       - Action: `update_in_place` (update timestamps and contact status on the existing listing, preventing duplicate creation).
     - If same composite key exists but `priceDiff > 5%`:
       - Action: Flag as `PRICE_OUT_OF_BAND` anomaly.
2. **Database Column `public.listings.sync_hash`**:
   - `sync_hash` column with btree index `idx_listings_sync_hash`.
   - Computed as `sha256(compound | bua | floorLevel | unitNumber)`.

#### The Gap: Three Separate Collections (Listings, Owners, Duplicates)
The user specification explicitly calls for:
> "Implement DQE deduplication using `sync_hash` across separate Listings, Owners, and Duplicates collections, pausing on duplicate matches to route to the Duplicates review queue or update timestamps..."

- **Listings Collection**: Exists as `public.listings` (`COLLECTIONS.units`).
- **Owners Collection**: Exists in schema as `public.owners` (`COLLECTIONS.owners`), keyed by phone.
- **Duplicates Collection**: **MISSING**. Currently, there is NO `public.duplicates` table in `supabase/schema.sql` and NO `COLLECTIONS.duplicates` in `apps/sierra-estates-realty/lib/models/schema.ts`.
- **Required Modification**:
  - Create table `public.duplicates`:
    ```sql
    CREATE TABLE IF NOT EXISTS public.duplicates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      target_sync_hash TEXT NOT NULL,
      original_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
      duplicate_payload JSONB NOT NULL,
      price_drift NUMERIC(6, 4),
      status TEXT NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review', 'merged', 'rejected', 'ignored')),
      source TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_duplicates_target_sync_hash ON public.duplicates(target_sync_hash);
    ```
  - Expose `COLLECTIONS.duplicates = 'duplicates'` in `schema.ts`.
  - When ingest encounters a duplicate match where price variance > 5% or details conflict, pause and insert into `public.duplicates` rather than silently ignoring or dropping.

---

### 3.6 Two-Way Sync Engine & `Real_Available_Units` Live View

#### Architecture
- **Tab 1: `Master_Inventory` (23 columns, A:W)**:
  `Unit_Code`, `Date_Added`, `Last_Action_Timestamp`, `Deal_Type`, `Canonical_Compound`, `Unit_Type`, `Area_SQM`, `Bedrooms`, `Bathrooms`, `Floor`, `Furnishing`, `Finishing`, `Price_EGP`, `AI_Fair_Price_Benchmark`, `Is_Featured_Gem`, `Owner_Name_Internal`, `Owner_Mobile_Internal`, `Contact_Status`, `Listing_Status`, `Sourced_By_Agent`, `Verified_By_Employee`, `Media_Links`, `Notes`.
- **Tab 2: `Real_Available_Units` (24 columns, A:X)**:
  `Unit_Code`, `Date_Added`, `Last_Action_Timestamp`, **`Verified_Available_Date`**, `Deal_Type`, `Canonical_Compound`, `Unit_Type`, `Area_SQM`, `Bedrooms`, `Bathrooms`, `Floor`, `Furnishing`, `Finishing`, `Price_EGP`, `AI_Fair_Price_Benchmark`, `Is_Featured_Gem`, `Owner_Name_Internal`, `Owner_Mobile_Internal` (**masked as `100***1490`**), `Contact_Status`, `Listing_Status`, `Sourced_By_Agent`, `Verified_By_Employee`, `Media_Links`, `Notes`.

#### Promotion & Unpublishing Rules
- **Promotion Gate**:
  - A unit enters Tab 2 IF AND ONLY IF:
    `Listing_Status === 'Available' && Contact_Status === 'Verified Available'`
  - On promotion, `Verified_Available_Date` is stamped with the ISO/Cairo timestamp.
- **Demotion & External Feed Unpublishing**:
  - If a unit transitions to any dead status:
    `Listing_Status IN ('Sold', 'Rented', 'Unavailable', 'Archived')` OR `Contact_Status IN ('Sold', 'Rented', 'Not Available', 'Contacted - No Answer')`:
    - Immediately removed from Tab 2.
    - Updated in Tab 1 (`Last_Action_Timestamp` updated).
    - **Unpublished from external feeds**:
      In `public.listings`:
      `publish_to_client = false`
      `automation.isPublishedToPF = false`
      `automation.unpublishedAt = new Date().toISOString()`
- **Sync Cadence**:
  - `workflows/14-sheets-supabase-sync/sync.js`: Runs every 10 minutes (or via cron/runner).
  - Two-way merge:
    - `Sheets → Supabase`: Staff edits in Google Sheet to operational fields (`Contact_Status`, `Listing_Status`, `Price`, `Notes`, `Verified_By_Employee`) take precedence when sheet `Last_Action_Timestamp` is newer than DB `updated_at`.
    - `Supabase → Sheets`: All new website/Telegram intakes and newer database updates overwrite sheet columns.
  - Batched API calls with exponential backoff (`withBackoff` in `sync.js:79-94`).

---

## 4. File Inventory & Current State Matrix

| Requirement | Component | Existing Source File(s) | Current Status | Gaps to Close |
|---|---|---|---|---|
| **R2** | OpenWA Pool (`:2785`, lines 1–8) | `workflows/13-paced-outreach/paced-outreach.js:307-316`, `apps/sierra-estates-realty/lib/server/whatsapp-drain.ts:73-86` | Implemented in workflow; partial in Next.js drain | Next.js `whatsapp-drain.ts` must enforce round-robin SIM rotation over ready lines and exclude `line-2`. |
| **R2** | Owners Sheet Integration | `workflows/09-owner-outreach/outreach.js:26-36`, `apps/sierra-estates-realty/lib/services/master-sheet-sync.ts` | Implemented in wf-09 and master-sheet-sync; absent in wf-13 | `workflows/13-paced-outreach/paced-outreach.js:182` must pull candidates from verified Owners Sheet (`gid=1127958606`) with fallback to Supabase. |
| **R2** | Daily Scheduling (30 msgs/2h, 12–8 PM Cairo = 240/day) | `workflows/13-paced-outreach/paced-outreach.js:68-76`, `infra/docker-compose.runner.yml:45-50` | Fully Implemented & Tested | None in workflow logic. Verify cron execution in runner. |
| **R2** | Anti-ban Human Typing Delay (45–55s) | `workflows/13-paced-outreach/paced-outreach.js:72-73, 318-320` | Fully Implemented & Tested | None. |
| **R2** | Admin OS 1-Click Human Approval Gate | `apps/sierra-estates-realty/app/api/admin/whatsapp/owner-outreach/route.ts:43-72`, `WhatsAppCommandCenter.tsx` | Partial (API actions exist, no UI button) | Add "Approve Outreach Slot" 1-click button in Admin OS / `WhatsAppCommandCenter.tsx`. |
| **R2** | Cold Outreach Queue (Unverified Owners) | `workflows/13-paced-outreach` (Worker B `massive-owners`) | Staging exists in worker; absent from DB & UI | Add explicit `public.cold_outreach_queue` schema/view and Admin UI review tab. |
| **R2** | Broker Group & Scraper Ingestion Hooks | `workflows/01-whatsapp-scraper/index.js`, `apps/sierra-estates-realty/app/api/webhooks/whatsapp/route.ts:161-215`, `workflows/15-scribe-guardian/scribe.js` | Fully Implemented | Ensure OpenWA gateway harvester poll feeds into Supabase `raw_feed` reliably. |
| **R2** | Easy Listing Dual-Code Generation | `apps/sierra-estates-realty/lib/server/easy-listing.ts:19-25`, `lib/services/coding-algorithm.ts:143-171` | Partial (generates location code, not BMM / Sierra codes) | Update `easy-listing.ts` to output both BMM code (`[O/B][CompoundInitial][AgentInitials]-[ID]`) and Sierra code (`[CompoundCode]-[Rooms][Furnishing]-[Price][K/$]+[Features]`). |
| **R2** | Acquisition-to-CRM Latency Tracking & 5% Penalty | None | **Missing** | Add `acquisition_timestamp` and `latency_penalty_applied` to `public.listings`; display `⚠️ >24h Entry (-5% Commission Penalty)` pill in Admin OS. |
| **R3** | Mandatory Egyptian Phone Gate (E.164) | `workflows/lib/phone-utils.js:14-36`, `workflows/lib/listing-validation.js:75-81` | Fully Implemented & Tested | None. |
| **R3** | Empty Cell Handling ("NULL" Fill) | `workflows/lib/listing-validation.js:58, 133-142`, `GoogleAppsScript_SierraEstates_MasterInventory_v7.gs:135-148` | Fully Implemented & Tested | None. |
| **R3** | Price Sanity Checks (Rent <= 400k, >= 1M to Resale) | `workflows/lib/listing-validation.js:83-107`, `GoogleAppsScript_SierraEstates_MasterInventory_v7.gs:150-165` | Fully Implemented & Tested | None. |
| **R3** | Canonical Compound Gazetteer & Dropdowns | `workflows/lib/compound-canonical.js:25-180`, `workflows/lib/listing-validation.js:32-54` | Fully Implemented & Tested | None. |
| **R3** | DQE Deduplication via `sync_hash` across Collections | `workflows/lib/dedup-index.js`, `apps/sierra-estates-realty/app/api/admin/ingest/route.ts:21-24` | Partial (Listings & Owners exist; Duplicates table missing) | Create `public.duplicates` table in Supabase and `COLLECTIONS.duplicates` in `schema.ts`; route paused duplicates to review queue. |
| **R3** | `Real_Available_Units` Live View & External Feed Unpublish | `workflows/14-sheets-supabase-sync/sync.js:395-433`, `GoogleAppsScript_SierraEstates_MasterInventory_v7.gs:260-310` | Fully Implemented & Tested | None. |

---

## 5. Concrete Implementation Proposals & Code Diffs

### Proposal 1: Easy Listing Dual-Code Emission & Latency Penalty Tracking

**File to modify**: `H:\Sierra Estates\apps\sierra-estates-realty\lib\server\easy-listing.ts`

#### Required Changes
1. Add helper to mint BMM source code:
   `[O/B][CompoundInitial][AgentInitials]-[ID]`
2. Add helper to mint Sierra attribute code:
   `[CompoundCode]-[Rooms][Furnishing]-[Price][K/$]+[Features]`
3. Calculate acquisition latency:
   `latencyHours = (now - acquisitionTime) / (1000 * 3600)`
   If `latencyHours > 24`: stamp `latency_penalty_applied = true`, `commission_penalty_pct = 5`.
4. Include `bmm_code`, `sierra_code`, `acquisition_latency_hours`, and `commission_penalty_indicator` in `EasyListingResult`.

```typescript
// Proposed addition to apps/sierra-estates-realty/lib/server/easy-listing.ts

export interface EasyListingResult {
  role: EasyListingRole;
  routing_destination: EasyListingRouting;
  uploader_name: string;
  uploader_phone: string;
  internal_code: string;
  bmm_code: string;       // [O/B][CompoundInitial][AgentInitials]-[ID] e.g. OMFA-101
  sierra_code: string;    // [CompoundCode]-[Rooms][Furnishing]-[Price][K/$]+[Features] e.g. HP-3F-45K+G
  property_details: EasyListingPropertyDetails;
  floor_label: string | null;
  floor_number: number | null;
  parse_warnings: string[];
  automation_flags: {
    auto_publish_ads: boolean;
    trigger_photo_request_bot: boolean;
  };
  acquisition_metrics: {
    acquisition_timestamp: string;
    crm_entry_timestamp: string;
    latency_hours: number;
    latency_penalty_applied: boolean;
    commission_penalty_pct: number;
  };
  ads: EasyListingAds | null;
}

export function generateBmmCode(role: EasyListingRole, compound: string | null, agentName: string, id: string | number): string {
  const roleChar = role === 'OWNER' ? 'O' : 'B';
  const compInit = (compound || 'UNK')
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const agentInit = (agentName || 'SB')
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const numId = String(id).replace(/\D/g, '') || String(Date.now()).slice(-3);
  return `${roleChar}${compInit}${agentInit}-${numId}`;
}

export function generateSierraAttributeCode(
  compound: string | null,
  rooms: number | null,
  furnishing: string | null,
  price: number | null,
  features: string[] = []
): string {
  const compCode = (compound || 'UNK').replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'SE';
  const r = rooms && rooms > 0 ? String(rooms) : 'X';
  const f = furnishing ? (furnishing.toLowerCase().includes('furn') ? 'F' : furnishing.toLowerCase().includes('semi') ? 'S' : 'U') : 'U';
  const priceToken = !price || price <= 0 ? '0' : price >= 1000000 ? `${(price / 1000000).toFixed(1).replace(/\.0$/, '')}M` : `${Math.round(price / 1000)}K`;
  const featStr = features.length > 0 ? `+${features.map(x => x[0].toUpperCase()).join('')}` : '';
  return `${compCode}-${r}${f}-${priceToken}${featStr}`;
}
```

---

### Proposal 2: Database Migration for Duplicates Collection & Latency Penalty Columns

**File to create**: `H:\Sierra Estates\supabase\migrations\20261104_042_duplicates_and_latency_penalty.sql`

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 20261104_042_duplicates_and_latency_penalty.sql
-- Mission 2 & 3: Duplicates review queue + Acquisition-to-CRM latency penalty
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add latency tracking columns to public.listings
ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS acquisition_timestamp TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS acquisition_latency_hours NUMERIC(8, 2),
    ADD COLUMN IF NOT EXISTS latency_penalty_applied BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS commission_penalty_pct INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bmm_code TEXT,
    ADD COLUMN IF NOT EXISTS sierra_code TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_latency_penalty
    ON public.listings(latency_penalty_applied)
    WHERE latency_penalty_applied = TRUE;

-- 2. Create public.duplicates review queue table
CREATE TABLE IF NOT EXISTS public.duplicates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_sync_hash TEXT NOT NULL,
    original_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    duplicate_payload JSONB NOT NULL,
    price_drift NUMERIC(6, 4),
    status TEXT NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review', 'merged', 'rejected', 'ignored')),
    source TEXT DEFAULT 'dqe_gate',
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_duplicates_target_sync_hash
    ON public.duplicates(target_sync_hash);

CREATE INDEX IF NOT EXISTS idx_duplicates_status
    ON public.duplicates(status);

ALTER TABLE public.duplicates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "duplicates_staff_access" ON public.duplicates;
CREATE POLICY "duplicates_staff_access" ON public.duplicates
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

COMMENT ON TABLE public.duplicates IS
    'DQE duplicate review queue for listings matched by sync_hash (R3).';
```

---

### Proposal 3: Owners Sheet Candidate Loading in Workflow 13

**File to modify**: `H:\Sierra Estates\workflows\13-paced-outreach\paced-outreach.js`

**Lines 182–219**: Replace single-source Supabase query with hybrid Sheet + Supabase loader:
```javascript
/** Pull owner candidates from Google Owners Sheet with Supabase fallback. */
async function loadCandidates() {
  const rentOwners = new Map();
  const otherOwners = new Map();

  // 1. First attempt: Read verified Owners Sheet (gid=1127958606)
  try {
    const { fetchPublicSheetCsv } = require('../lib/google-sheets');
    const sheetId = process.env.UNITS_SHEET_ID || process.env.GOOGLE_SHEET_ID;
    const gid = process.env.OWNERS_SHEET_GID || '1127958606';
    if (sheetId) {
      const rows = await fetchPublicSheetCsv(sheetId, gid);
      for (const r of rows) {
        const phone = normalizePhone(r.Mobile || r.Phone || r.owner_phone);
        if (!phone || !/^201[0125]\d{8}$/.test(phone)) continue;
        const entry = {
          code: r.Code || r.unit_code || 'SE-SHEET',
          name: r.Name || r.owner_name || 'صاحب الإعلان',
          phone,
          compound: resolveCanonicalCompound(r.Compound || r.compound),
          dealType: String(r.Deal_Type || r.deal_type || 'rent').toLowerCase().trim(),
          source: 'sheet',
        };
        if (entry.dealType === 'rent') {
          if (!rentOwners.has(phone)) rentOwners.set(phone, entry);
          otherOwners.delete(phone);
        } else if (!otherOwners.has(phone) && !rentOwners.has(phone)) {
          otherOwners.set(phone, entry);
        }
      }
      log(`loaded ${rentOwners.size} rent + ${otherOwners.size} massive owners from Owners Sheet`);
    }
  } catch (e) {
    log(`owners sheet read skipped: ${e.message} — falling back to database`);
  }

  // 2. Supabase fallback/supplement
  const client = supabase();
  if (client && (rentOwners.size === 0 || otherOwners.size === 0)) {
    const { data } = await client.from('listings')
      .select('id,code,unit_code,owner_name,owner_phone,compound,deal_type,availability,status')
      .limit(5000);
    // ... merge db candidates into rentOwners / otherOwners
  }

  return {
    activeRenting: [...rentOwners.values()],
    massiveOwners: [...otherOwners.values()],
  };
}
```

---

### Proposal 4: Latency Penalty Badge in Admin Properties Console

**File to modify**: `H:\Sierra Estates\apps\sierra-estates-realty\components\admin\command-center\PropertiesConsole.tsx`

**Lines 358–377**: Display latency penalty badge on affected listings:
```tsx
<td className="px-4 py-3">
  <div className="flex flex-col items-start gap-1">
    <CcPill tone={row.bucket === 'verified' ? 'green' : row.bucket === 'stale' ? 'amber' : 'neutral'}>
      {row.bucket}
    </CcPill>
    {row.latencyPenaltyApplied && (
      <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-amber-300" title={`Acquisition Latency: ${row.acquisitionLatencyHours}h (>24h SLA) — 5% commission penalty applied`}>
        ⚠️ &gt;24h Entry (-5% Comm)
      </span>
    )}
    <span className="text-[0.6rem] text-[#f5f3ec]/35">
      {row.status} · {row.publishStatus ?? 'unclassified'}
    </span>
  </div>
</td>
```

---

## 6. Test & Verification Plan

### Existing Verifications
1. `__tests__/mission2-5-pipeline.test.ts`:
   - 31 passing unit & integration tests covering Rules 1–6, canonical compounds, ±5% DQE price gate, Cairo operating hours, slot/daily budgets, and `Real_Available_Units` filtering.
2. `__tests__/duplicates-and-deduplication.test.ts`:
   - Validates Egyptian E.164 phone normalization, Arabic/English compound synonyms, and multi-channel fuzzy deduplication.

### New Test Cases to Implement
Create `__tests__/r2-r3-supply-and-dqe-enhancements.test.ts`:
1. **Dual-Code Verification**:
   - Assert `generateBmmCode('OWNER', 'Hyde Park', 'Frank Adams', 101)` returns `'OHFA-101'`.
   - Assert `generateBmmCode('BROKER', 'Mivida', 'Sarah Brown', 204)` returns `'BMVSB-204'`.
   - Assert `generateSierraAttributeCode('Hyde Park', 3, 'Furnished', 45000, ['Garden'])` returns `'HP-3F-45K+G'`.
2. **Acquisition Latency Penalty**:
   - Given an ingested listing with `acquisition_timestamp` set to 28 hours ago:
     - Assert `latency_hours === 28`.
     - Assert `latency_penalty_applied === true`.
     - Assert `commission_penalty_pct === 5`.
3. **Duplicates Collection Staging**:
   - Ingest duplicate record with price drift > 5%:
     - Assert record is inserted into `public.duplicates` with `status: 'pending_review'`.
     - Assert primary `public.listings` count is unchanged.
4. **Paced Outreach Pacing Integrity**:
   - Verify `line-2` is never returned in `assignLines()`.
   - Verify typing delay is within `[45000, 55000]` ms.
   - Verify slot budget does not exceed 30 messages in any 2-hour window.
