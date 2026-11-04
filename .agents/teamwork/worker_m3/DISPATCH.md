# Worker M3 Dispatch: AI Memory, Automation, Media & Feeds

## Working Directory
`H:\Sierra Estates\.agents\teamwork\worker_m3\`

## Mandatory Documents
Read `H:\Sierra Estates\.agents\teamwork\ORIGINAL_REQUEST.md` and `H:\Sierra Estates\PROJECT.md`.
Read Explorer 3's findings at `H:\Sierra Estates\.agents\teamwork\teamwork_explorer_survey_3\survey_report.md` and `handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Exclusively Owned Files
- `packages/db/src/unified-memory-seeds.ts`
- `apps/sierra-estates-realty/lib/services/branding-service.ts`
- `apps/sierra-estates-realty/app/admin/views/AlertsView.tsx`
- `apps/sierra-estates-realty/components/admin/AdminPortal.tsx` (Alert banner and Unanswered tab only)
- `apps/sierra-estates-realty/app/api/inventory/request-photos/route.ts`
- `apps/sierra-estates-realty/app/api/feeds/property-finder/route.ts`

## Tasks to Implement
1. In `packages/db/src/unified-memory-seeds.ts`:
   - Implement seeds for `public.unified_memory` storing real 2026 New Cairo and Hyde Park / MVHP baseline ranges (e.g. rental ranges per bedroom type, resale average price/m², cap rates, historical price trend vectors).
   - Export an idempotent function `seedUnifiedMemoryBaselines(supabaseClient)`.
2. In `apps/sierra-estates-realty/app/api/inventory/request-photos/route.ts`:
   - Add automated batch sweep logic: Query active units with `< 8-10 photos` (or `images.length < 8`), formulate Arabic photo request message with unit code and upload link, and trigger WhatsApp photo request.
3. In `apps/sierra-estates-realty/app/admin/views/AlertsView.tsx` and `components/admin/AdminPortal.tsx`:
   - Implement the Admin Unanswered Alert banner and dedicated "Unanswered" filter tab for conversations with unhandled client questions or missing replies (>15 mins).
4. In `apps/sierra-estates-realty/lib/services/branding-service.ts`:
   - Upgrade watermarking engine to apply strict Sierra Blue Navy gradient (`#0A1628`) + Burnished Gold (`#C9A84C`) watermark overlays to uploaded property media.
5. In `apps/sierra-estates-realty/app/api/feeds/property-finder/route.ts`:
   - Verify that the Property Finder Atlas v1 XML/API feed returns valid XML and that ALL owner mobile numbers are scrubbed to the company concierge line (`+201092048333`).
6. Run build/test verification:
   - `pnpm test:root __tests__/property-finder-enterprise.test.ts`
   - `pnpm test:root __tests__/inventory-download-privacy.test.ts`
   - `pnpm --filter sierra-estates-client-page type-check`
7. Write `progress.md` and complete with `handoff.md`.


## 2026-11-04T21:58:15Z
[Message] sender=5afcb40d-dc2f-4bec-ae8e-dd270d54afb9
You are Worker M3 (AI Memory, Automation, Media & Feeds).
Working directory: H:\Sierra Estates\.agents\teamwork\worker_m3\
Read H:\Sierra Estates\.agents\teamwork\ORIGINAL_REQUEST.md, H:\Sierra Estates\PROJECT.md, and your dispatch instructions at H:\Sierra Estates\.agents\teamwork\worker_m3\DISPATCH.md.
Also read Explorer 3 findings at H:\Sierra Estates\.agents\teamwork\teamwork_explorer_survey_3\survey_report.md and handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- packages/db/src/unified-memory-seeds.ts
- apps/sierra-estates-realty/lib/services/branding-service.ts
- apps/sierra-estates-realty/app/admin/views/AlertsView.tsx
- apps/sierra-estates-realty/components/admin/AdminPortal.tsx (Alerts view & banner only)
- apps/sierra-estates-realty/app/api/inventory/request-photos/route.ts
- apps/sierra-estates-realty/app/api/feeds/property-finder/route.ts

Implement all tasks in DISPATCH.md, run verification commands (vitest feeds and type-check), maintain progress.md, and write handoff.md. Send a completion message when finished.
