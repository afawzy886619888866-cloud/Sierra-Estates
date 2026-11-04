# Worker M2 Dispatch: Supply Engine, Easy Listing, DQE & Supabase Sync

## Working Directory
`H:\Sierra Estates\.agents\teamwork\worker_m2\`

## Mandatory Documents
Read `H:\Sierra Estates\.agents\teamwork\ORIGINAL_REQUEST.md` and `H:\Sierra Estates\PROJECT.md`.
Read Explorer 2's findings at `H:\Sierra Estates\.agents\teamwork\teamwork_explorer_survey_2\survey_report.md` and `handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Exclusively Owned Files
- `workflows/13-paced-outreach/paced-outreach.js`
- `apps/sierra-estates-realty/lib/server/easy-listing.ts`
- `apps/sierra-estates-realty/components/admin/WhatsAppCommandCenter.tsx`
- `workflows/lib/dedup-index.js`
- `workflows/14-sheets-supabase-sync/sync.js`
- `packages/db/src/duplicates-schema.ts` (or Supabase schema helper for duplicates and cold outreach queue)

## Tasks to Implement
1. In `workflows/13-paced-outreach/paced-outreach.js`:
   - Extend `loadCandidates()` to pull from the verified Google Owners Sheet (GID `1127958606`) in addition to Supabase.
   - Enforce the 240 msgs/day schedule (30 msgs/2h between 12:00 PM and 8:00 PM Cairo time), human typing simulation (45–55s jitter), and line-2 exclusion.
2. In `apps/sierra-estates-realty/components/admin/WhatsAppCommandCenter.tsx`:
   - Provide a Cold Outreach Queue tab/section for unverified apartment owners.
   - Implement a 1-click Human-in-the-Loop approval gate to approve/release staged outreach batches.
3. In `apps/sierra-estates-realty/lib/server/easy-listing.ts`:
   - Extend the text parser to output BOTH:
     - BMM source code: `[O/B][CompoundInitial][AgentInitials]-[ID]` (e.g. `OHP-AF-101`)
     - Sierra attribute code: `[CompoundCode]-[Rooms][Furnishing]-[Price][K/$]+[Features]` (e.g. `HP-3F-45K+G`)
   - Add sourcing-to-CRM latency calculation: If `acquisition_timestamp` to ingestion > 24 hours, set `latencyHours`, `isLateAcquisition: true`, and display a 5% commission penalty indicator (`commissionPenaltyPct: 5`).
4. In `workflows/lib/dedup-index.js` and `sync.js`:
   - Ensure DQE deduplication using `sync_hash` across separate Listings, Owners, and Duplicates collections.
   - If price drift > 5% or duplicate match occurs, route record to the Duplicates collection/queue with timestamp tracking.
   - Verify that only Verified Available units synchronize to the `Real_Available_Units` sheet tab and public web catalog.
5. In `packages/db/src/duplicates-schema.ts`:
   - Define type/table contract for `duplicates` collection and `cold_outreach_queue`.
6. Run build/test verification:
   - `pnpm test:root __tests__/mission2-5-pipeline.test.ts`
   - `pnpm test:root __tests__/duplicates-and-deduplication.test.ts`
   - `pnpm --filter sierra-estates-client-page type-check`
7. Write `progress.md` and complete with `handoff.md`.


## 2026-11-04T21:58:08Z
Sender: 5afcb40d-dc2f-4bec-ae8e-dd270d54afb9 (Parent Orchestrator)
Content:
You are Worker M2 (Supply Engine, Easy Listing, DQE & Sync).
Working directory: H:\Sierra Estates\.agents\teamwork\worker_m2\
Read H:\Sierra Estates\.agents\teamwork\ORIGINAL_REQUEST.md, H:\Sierra Estates\PROJECT.md, and your dispatch instructions at H:\Sierra Estates\.agents\teamwork\worker_m2\DISPATCH.md.
Also read Explorer 2 findings at H:\Sierra Estates\.agents\teamwork\teamwork_explorer_survey_2\survey_report.md and handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- workflows/13-paced-outreach/paced-outreach.js
- apps/sierra-estates-realty/lib/server/easy-listing.ts
- apps/sierra-estates-realty/components/admin/WhatsAppCommandCenter.tsx
- workflows/lib/dedup-index.js
- workflows/14-sheets-supabase-sync/sync.js
- packages/db/src/duplicates-schema.ts

Implement all tasks in DISPATCH.md, run verification commands (vitest root pipeline tests and type-check), maintain progress.md, and write handoff.md. Send a completion message when finished.
