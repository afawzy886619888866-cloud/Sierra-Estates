# Handoff Report: Explorer 2 (Supply Engine, Easy Listing, DQE & Supabase Sync)

**From**: Explorer 2 (`teamwork_explorer_survey_2`, ID `2b01588e-64b0-49ca-bcdc-46aa55156af3`)  
**To**: Lead Orchestrator (`orchestrator`, ID `5afcb40d-dc2f-4bec-ae8e-dd270d54afb9`)  
**Date**: 2026-11-04  
**Subject**: Hard Handoff — Complete Survey & Gap Analysis for Requirements R2 and R3

---

## 1. Observation

Direct observations from the local filesystem and test executions:

1. **OpenWA Multi-Line Pacing & Concierge Exclusion**:
   - `workflows/13-paced-outreach/paced-outreach.js:77`: `const CONCIERGE_LINE = 'line-2'; // flagship concierge — hard-excluded everywhere`.
   - `workflows/13-paced-outreach/paced-outreach.js:310-316`: `assignLines()` filters out `CONCIERGE_LINE` and splits the remaining 7 ready lines between `active-renting` and `massive-owners`.
   - `workflows/13-paced-outreach/paced-outreach.js:68-76`: Cairo operating window is 12:00–20:00, slot budget is 30 messages per 2-hour window, daily cap is 240 messages/day.
   - `workflows/13-paced-outreach/paced-outreach.js:318-320`: `typingDelay()` formula enforces `45000 + Math.floor(Math.random() * 10000)` ms (45–55s human typing simulation).
   - `workflows/13-paced-outreach/paced-outreach.js:182-190`: `loadCandidates()` reads exclusively from Supabase (`client.from('listings').select(...)`) and does not read from the verified Google Owners Sheet.

2. **Broker Group Ingestion & Scribe Guardian**:
   - `workflows/01-whatsapp-scraper/index.js:95-179`: Consumer pulls from `:2785/api/harvester/recent` and appends to Google Sheet tab `raw_messages` and `.state/scraped-listings.jsonl`.
   - `apps/sierra-estates-realty/app/api/webhooks/whatsapp/route.ts:161-215, 366-373`: Handles OpenWA `message.received` event, routes non-owner group chat to `WhatsAppParserService.processIncomingMessage()`, which extracts property entities via Gemini/NLP and calls `GoogleSheetBridge.pushUnitToSheet()`.
   - `workflows/15-scribe-guardian/scribe.js:24, 70-100`: Auto-flags GEM units priced >= 15% below compound average or prime view and queues photo requests for units with 0 photos.

3. **Easy Listing Parser & Code Schemes**:
   - `apps/sierra-estates-realty/lib/server/easy-listing.ts:19-25`: Internal code format generated is currently `[REGION]-[COMPOUND]-[UNIT_TYPE]-[FLOOR]-[AREA]M` (e.g. `NC-MIV-APT-F2-175M`).
   - `apps/sierra-estates-realty/lib/services/coding-algorithm.ts:143-171`: Implements `buildSierraCodeMetadata()` emitting Sierra attribute codes (`VS-3F-45K+G`) and technical IDs (`WVSB-ABCD`), but is not wired into `easy-listing.ts`.
   - BMM source codes (`[O/B][CompoundInitial][AgentInitials]-[ID]`) and acquisition-to-CRM latency tracking (>24h penalty indicator) are **missing** from `easy-listing.ts` and data models.

4. **Phone Gate, Empty Cells, Price Sanity & Compound Gazetteer**:
   - `workflows/lib/phone-utils.js:14-36` & `workflows/lib/listing-validation.js:75-81`: Hard-rejects listings missing mobile numbers and strictly normalizes Egyptian numbers to `201XXXXXXXXX` / `+201XXXXXXXXX`.
   - `workflows/lib/listing-validation.js:58, 133-142`: `NULL_CELL = 'NULL'` and `fillNulls()` ensure zero blank cells in Google Sheets.
   - `workflows/lib/listing-validation.js:83-107`: Rent ceiling capped at 400,000 EGP/month; Rent >= 1,000,000 EGP auto-reclassifies to Resale.
   - `workflows/lib/compound-canonical.js:25-180`: Canonical compound dictionary resolves 50+ Arabic/English/slang aliases to canonical names.
   - `workflows/14-sheets-supabase-sync/sync.js:106-116, 395-433`: 23-column `Master_Inventory` vs 24-column `Real_Available_Units` (`Verified_Available_Date`), strictly promoting only Available + Verified Available units and unpublishing dead units.
   - `scripts/GoogleAppsScript_SierraEstates_MasterInventory_v7.gs`: Mirrors all Rules 1–6 in Apps Script.

5. **DQE Deduplication & Collections**:
   - `workflows/lib/dedup-index.js:80-109, 174-198`: In-memory and Redis dedup index catches re-listings within ±5% price drift (`action: 'update_in_place'`) and flags drift > 5% as `PRICE_OUT_OF_BAND`.
   - `supabase/schema.sql`: Contains `public.listings` (with `sync_hash`) and `public.owners` (lines 669–676). **`public.duplicates` table is missing**.

6. **Test Execution**:
   - Command: `pnpm test:root __tests__/mission2-5-pipeline.test.ts`
   - Result: 31 passed (31 total) in 1.04s.

---

## 2. Logic Chain

1. **Pacing & Pool Mechanics**:
   - Observation 1 proves the 240 msgs/day schedule, 45–55s typing delay, and line-2 exclusion are already implemented and tested in `workflows/13-paced-outreach`.
   - However, Observation 1 also shows `loadCandidates()` only reads Supabase `listings`. Since the user requirement explicitly demands pulling from the verified Owners Sheet, `paced-outreach.js` must be updated to hybridize sheet ingestion (via `google-sheets.js` / GID `1127958606`) with Supabase records.
2. **Cold Outreach & Approval Gate**:
   - Observation 1 and 2 show Worker B (`massive-owners`) handles the cold owner intro, but there is no dedicated `public.cold_outreach_queue` table or 1-click approval button in Admin OS (`WhatsAppCommandCenter.tsx`). Thus, unverified apartment owners must be staged into a formal review queue before release.
3. **Easy Listing Dual Codes & Latency Penalty**:
   - Observation 3 shows `easy-listing.ts` generates only `[REGION]-[COMPOUND]-[UNIT_TYPE]-[FLOOR]-[AREA]M`. To satisfy R2, it must be augmented to emit BMM codes (`[O/B][CompoundInitial][AgentInitials]-[ID]`) and Sierra attribute codes (`[CompoundCode]-[Rooms][Furnishing]-[Price][K/$]+[Features]`).
   - Sourcing-to-CRM latency is currently untracked; adding `acquisition_timestamp` and computing `latency_hours > 24` directly enables the 5% commission penalty indicator.
4. **DQE Duplicates Routing**:
   - Observation 5 confirms `public.listings` and `public.owners` exist, but `public.duplicates` does not exist in `supabase/schema.sql`.
   - Creating `public.duplicates` and wiring `COLLECTIONS.duplicates` completes the 3-collection DQE architecture (Listings, Owners, Duplicates) and allows pausing duplicate matches into an audited queue rather than silent dropping.
5. **Validation and Sync Maturity**:
   - Observation 4 confirms R3's phone gate, "NULL" cell handling, 400k/1M price checks, canonical compounds, and `Real_Available_Units` filtering are fully implemented across both Node and Apps Script.

---

## 3. Caveats

1. External OpenWA gateway (`:2785`) and Google Sheets API live credentials are unreachable in offline local testing; automated tests rely on mock/sandbox fallbacks and local `.jsonl` audit ledgers.
2. `public.owners` exists in `supabase/schema.sql`, but legacy routes occasionally queried an un-migrated Firestore-era structure; all writes must use `@sierra-estates/db`.
3. The 5% commission penalty indicator must interface cleanly with R6 (Full-Cycle Commission Engine); coordination with Explorer 3 / R6 implementer is recommended.

---

## 4. Conclusion

Requirements R2 and R3 have a very strong existing foundation in `workflows/` (`13-paced-outreach`, `14-sheets-supabase-sync`, `lib/listing-validation.js`, `lib/compound-canonical.js`, `lib/dedup-index.js`), with 31 regression tests already passing.

The remaining work to reach 100% compliance consists of 4 surgical, additive enhancements:
1. **Easy Listing Dual-Code & Latency**: Update `easy-listing.ts` to emit BMM source codes and Sierra attribute codes, and stamp >24h latency with 5% commission penalty indicator.
2. **Owners Sheet in Workflow 13**: Extend `workflows/13-paced-outreach/paced-outreach.js:loadCandidates()` to read from Google Sheet GID `1127958606` in addition to Supabase.
3. **Duplicates Collection Migration**: Add `public.duplicates` table in Supabase and `COLLECTIONS.duplicates` in `schema.ts`.
4. **Admin OS Outreach Approval Gate**: Add 1-click approval action in `WhatsAppCommandCenter.tsx` for cold outreach queue.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Mission 2 & 3 Validation, Pacing, and Sync Suite**:
   ```powershell
   pnpm test:root __tests__/mission2-5-pipeline.test.ts
   ```
   *Expected outcome*: 31 tests passing, 0 failures.

2. **Verify Duplicates & Normalization Suite**:
   ```powershell
   pnpm test:root __tests__/duplicates-and-deduplication.test.ts
   ```
   *Expected outcome*: All tests passing.

3. **Inspect Implementation Files**:
   - Pacing & Concierge Exclusion: `workflows/13-paced-outreach/paced-outreach.js` (lines 68–77, 307–320).
   - Strict Validation Rules 1–6: `workflows/lib/listing-validation.js` (lines 56–142).
   - Compound Gazetteer: `workflows/lib/compound-canonical.js` (lines 25–180).
   - Two-Way Sync & Real_Available_Units: `workflows/14-sheets-supabase-sync/sync.js` (lines 106–116, 395–433).
   - Easy Listing Parser: `apps/sierra-estates-realty/lib/server/easy-listing.ts` (lines 19–25).
