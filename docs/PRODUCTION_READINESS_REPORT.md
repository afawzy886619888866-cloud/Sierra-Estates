# SIERRA ESTATES — PRODUCTION READINESS REPORT

**Execution run:** 2026-10-12 · GLM master-execution pass 2 (branch `agents/p0-intake-gate-fixes`)
**Baseline HEAD:** `4e1796eb1d097b4e180b9fbaa1a639abd3a9d4c3` (merge #306 — `future-plan/sprint-2`)
**Working branch:** `agents/p0-intake-gate-fixes` (additive commits; no history rewrite; no force-push)

This report supersedes the 2026-10-11 report (branch `agents/master-execution-glm`, baseline `1dd7f90`).
The newer `sprint-2` merge **reintroduced** runner regressions and carried unfixed intake defects; this
run verified the ACTUAL current state at HEAD before fixing. Nothing is claimed as working without
evidence. No secrets are included anywhere in this document.

---

## 1. Verdict

`NOT READY — code-side P0 fixes COMPLETE, code-tested and preflight-green; live cutover steps (deploy, migration apply, controlled live intake pilot) remain external-access-gated — see §12`

- 143/143 test suites, 1542/1542 tests green at this branch (previously 141/1524 + 3 environment failures — all resolved: data artifact regenerated, migration mirror repaired).
- `scripts/ci-preflight.sh` — **PREFLIGHT PASSED, 8/8 gates green in 120s**.
- A **live service-role credential was found committed in a test file** (confirmed active) — removed from HEAD, **ROTATION REQUIRED** (§11).
- One GitHub PAT was provided in-chat for this run: treat it as exposed to the chat transcript and rotate after merge (never written to any file or commit).

---

## 2. What this run found at HEAD `4e1796e` (audit, evidence-based)

The 2026-10-11 report was STALE: merge #306 (`cb42ef8` + `545b2d6` + `8aa3dbe`) reintroduced or kept:

| # | Defect (confirmed in code) | Mission ref |
|---|---|---|
| 1 | `workflows/runner.js` — hardcoded local "active" workflow rows when Supabase unconfigured; hourly 10–20 Cairo queue firing owner-outreach BYPASSING persisted paused/draft status; NO status recheck in `runWorkflow()` | §9 |
| 2 | `OwnerListingIntakeService` — media-only (`[photo]`) messages classified `not_a_listing` → **images dropped**, never stored/attached, no unassigned-review state | §3A |
| 3 | Single newest open intake per sender — every reply merged into one arbitrary intake; partial unique index `uq_owner_listing_intakes_open_per_sender` **crashes** concurrent unit submissions (unique violation → webhook 500, data loss) | §3B |
| 4 | Event ledger failed OPEN (ledger outage → side effects proceed); no processing-state machine; a FAILED event replay returns `duplicate_event` and is permanently lost | §3C |
| 5 | `finalizeIntake` — `mode ?? 'sale'`; new listings written `status:'available'` (unverified owner claim as fact) | §3D |
| 6 | `computeIntakeFingerprint` — hash of empty parts is always truthy → unrelated unknown-field records **collapse into one intake**; dedupe never checks canonical `listings` | §3E |
| 7 | `AugustOwnersAgentService.augustExtras` — unverified units appended to master sheet as `inventoryStatus:'Available'`; `appendToExcelInventory` upserted a SECOND `listings` row (id = intake code) next to the canonical UUID row with `status:'active'` and rent/sale inferred from price | §4 |
| 8 | `POST /api/property-finder?action=create-listing` → `pfClient.createListing(body)` raw — a **complete PublishGate bypass** (admin route, any payload) | §6 |
| 9 | Root `__tests__/supabase-storage-and-vercel-resilience.test.ts` — hard-coded **live service_role JWT** | §1 |

All nine are fixed on this branch (§3–§6 below). The publish-gate evaluator, sheet-sync anti-promotion,
Telegram update-id ledger, admin RBAC/users API and auth session rechecks were re-verified at HEAD and
remain sound (no rewrite).

---

## 3. Owner intake (P0 3A/3B/3C/3D/3E/3F) — CODE-TESTED

`OwnerListingIntakeService` + additive migration `20261012_029_intake_correlation_event_states.sql`:

- **3A Media-only never discarded:** photo-only messages correlate by explicit intake code →
  quoted-message context (OpenWA `quotedMsgId` → event → intake) → exactly one open intake →
  else durable `UNASSIGNED_MEDIA` review state (staff-correlated from the admin queue). Media
  storage stays Supabase-Storage-gated with honest `last_error` when unavailable.
- **3B Multi-unit correlation:** explicit code → quoted context → single open intake →
  durable `AMBIGUOUS_REPLY` staff queue (never a guess). A clearly-different compound opens a NEW
  intake for the same sender. The one-open-intake-per-sender unique index is DROPPED (additive
  migration; rollback documented); dedupe protection preserved by event ledger + unique intake
  codes + fingerprints.
- **3C Event state machine:** `RECEIVED → PROCESSING → COMPLETED | FAILED` with attempts,
  10-minute lease, atomic conditional claim (service-role PostgREST PATCH), error classification,
  stored result JSON + intake/unit ids on the event row. COMPLETED replays return the prior result
  with no side effects; FAILED replays RESUME the pinned intake (no duplicate unit); a ledger
  OUTAGE fails CLOSED (no side effects). Webhook returns 5xx on intake errors so providers retry.
- **3D No fabricated defaults:** unknown mode → `NEEDS_INFORMATION/NEEDS_CODE` (never `sale`);
  new listings stage `status:'pending'` with the owner's availability claim preserved separately in
  `rawData.ownerAvailabilityClaim`; `contactSource` recorded when the sender phone is used as fallback.
- **3E Dedupe:** fingerprint is NULL without compound+type evidence (empty fingerprints can no
  longer collapse unrelated records); lookup covers intakes AND canonical `listings.dupe_check_hash`
  plus an explainable near-match scan (compound+type+beds equality + price ±2% / area ±10%) —
  matches LINK/queue for staff, never silently overwrite.
- **3F Codes:** intake codes (`SE-AUG-<stamp>-<rand>`, collision-safe) remain the stable owner-facing
  reference; the LISTING code derives from the established Sierra scheme (`generateSierraCode`,
  deterministic on retries) only when compound/rooms/price evidence exists, else `NEEDS_CODE`.

Tests: `__tests__/owner-intake-correlation-regression.test.ts` (14 tests covering mission §12 cases
1,2,3,4,5,6,7,8,9) + `owner-listing-intake.test.ts` (6 lifecycle tests, updated to assert `status:'pending'`).

## 4. Sheets/Excel projection (P0 §4) — CODE-TESTED

- `augustExtras` appends unverified units as `inventoryStatus:'Review Required'` (owner claim preserved
  in Supabase raw_data; group-confirmation copy updated).
- `appendToExcelInventory` no longer writes a SECOND `listings` row (the duplicate id=intakeCode upsert
  with `status:'active'` + price-heuristic deal type is gone). DB persistence is opt-in
  (`persistToSupabase`) and honest: `REVIEW_REQUIRED` / `status:'pending'` / deal_type from explicit
  operation only. Callers: August agent + `/api/listings/submit` pass `canonicalUnitId` (pure sheet
  projection); `/api/inventory` POST opts in.
- `workflows/08-units-sync` verified: inserts `REVIEW_REQUIRED`, PATCH strips `publish_status /
  verified_at / verified_by`, never writes provenance — pinned by new source-contract tests.

## 5. Property Finder publication gate (P0 §6) — CODE-TESTED

- The `POST /api/property-finder?action=create-listing|publish` raw-payload bypass is CLOSED: both
  actions route through `PFIntegrationService.publishListing()` (8-condition C6 gate + provider
  validation + idempotency). Gate rejections → 422 with per-condition evidence.
- `PublishGate`/`PFIntegrationService` re-verified at HEAD: staging guard, dry-run isolation,
  idempotent re-publish, ordering fix (published only after remote acceptance), honest
  `pending_publish` retry state — unchanged and covered by the existing 20-assertion suite.
- New: `__tests__/property-finder-route-gate.test.ts` (4 bypass tests: raw payload rejected, gated
  routing, idempotent publish, 422 evidence).

## 6. Workflow runner (P0 §9) — CODE-TESTED

- Hardcoded local fallback rows REMOVED; Supabase unconfigured or read failure → scheduler idle
  (fail-closed; HTTP manual runs by authenticated operators remain).
- Hourly owner-outreach window queues ONLY when the persisted row is `active`; `runWorkflow()`
  re-checks persisted status immediately before spawning for every automatic trigger; failed status
  reads fail CLOSED. Authenticated `POST /run` is the only manual override (labelled `manual`).
- Tests: `workflows/__tests__/runner-safety.test.ts` (7 source-contract assertions) — mission §12
  case 11 (paused automation never dispatches).

## 7. Admin portal / RBAC / Telegram — RE-VERIFIED AT HEAD (unchanged, still code-tested)

- `/api/admin/users` returns real `profiles.status`; default-deny elevation; superadmin-only
  approval/denial with audit trail. `ROLE_PERMISSIONS` covers the 9 canonical roles + legacy.
- `enforceSessionAccountStatus()` re-checks live status on protected requests.
- Telegram webhook: update-id ledger, real photo intake via `getFile`, shared intake path — the new
  intake outcome actions degrade gracefully (default branch → honest staff-review notice).

## 8. AWS EC2 / OpenWA — LIVE state (read-only probes, 2026-10-12)

See §12 runbook; the 2026-10-11 probes (runner `54.89.162.250:2786` healthy, gateway `:2785` ready,
session phone `201031622600`) remain the last verified evidence. Cleartext HTTP to a raw public IP
is still an open transport-security concern (§12). This run's live probes are recorded in the final
report of the execution session.

## 9. Google AI / RAG / $1,000 credit — UNCHANGED BLOCKERS

The GenAI App Builder credit scope remains uninspectable without authenticated GCP console/billing
access. No billable Google resource was created. The embedding dimension mismatch (768-write vs
1536-legacy) remains documented and unresolved — no vector writes performed.

## 10. Executed checks — evidence (this branch, 2026-10-12)

| Gate | Result |
|---|---|
| `scripts/data-audit/build_master_inventory.py` (gate 0) | PASS — 13,043 rows; DUPLICATE 4208 / INCOMPLETE 4720 / STALE 3746 / EXPIRED 246 / REVIEW_REQUIRED 123 / **PUBLISHABLE 0** (honest; verification freshness + photos remain the binding constraints) |
| App jest (`test:ci` single-worker) | **143 suites / 1542 tests — ALL PASS** (incl. 18 new regression tests) |
| `bash scripts/ci-preflight.sh` | **PREFLIGHT PASSED — 8/8 gates green** |
| Workflows vitest | 2 files / 14 tests PASS (incl. 7 new runner-safety tests) |
| App type-check (`tsc --noEmit`) | PASS (exit 0) |
| App lint (changed files + full app) | PASS — 0 errors |
| `pnpm check:public-env` | PASS — no server credentials browser-visible |
| `pnpm check:legacy-runtime` | PASS |
| `pnpm check:twins` | PASS — no compiled twins |
| `pnpm check:backend` | PASS with env present (URL/anon/service keys — presence-only gate) |
| Secret scan (tracked files) | 1 confirmed exposure REMOVED (service_role JWT in a test); anon keys are public-by-design placeholders; rotation list in §11 |

## 11. Security findings — actions required

1. **ROTATE (required):** `SUPABASE_SERVICE_ROLE_KEY` for project `gaxfqcietzoonlmatiot` — a live
   service-role JWT was committed in `__tests__/supabase-storage-and-vercel-resilience.test.ts`
   (confirmed active via read-only probe; value remains in git history). Rotation is the only
   complete remedy; removal from HEAD is done.
2. **ROTATE after merge:** the GitHub PAT provided in-chat for this run (exposed to the chat
   transcript; never written to any file or commit).
3. Transport security (unchanged, operator action): API keys transit cleartext `http://` to
   `54.89.162.250` — implement the documented HTTPS/tunnel alternative before any endpoint change.

## 12. Remaining external blockers — exact required actions

1. **Deploy this branch** (Vercel: `sierra-estates-client-page`) and inspect the build log for the
   8-gate preflight in the real environment.
2. **Apply migrations 027 + 028 + 029** through `scripts/apply-pending-migrations.mjs` (ledgered,
   authenticated) — intake tables, role CHECK extension, event state machine + correlation index.
3. **Controlled live intake pilot** (mission §13): one authorized test message through the August
   owners group → verify durable intake, single REVIEW_REQUIRED listing, media attach, replay
   idempotency, admin queue visibility. Requires an authorized test device/number.
4. **OpenWA media endpoint** verification against the deployed gateway build (adapter path).
5. **GCP scheduler cutover** (authenticated `gcloud` + billing) — then one overlap-safe cycle before
   retiring Vercel fallbacks.
6. **Google credit scope inspection** before ANY Agent Search provisioning.
7. **ADMIN_APPROVAL_EMAIL + email provider** for access-request notifications (durable queue works
   without it).
8. **Transport hardening** (§11.3).

## 13. Rollback

Every change is additive and reversible:
- Revert the commits on `agents/p0-intake-gate-fixes` (single working branch; no history rewritten).
- Migration 029 is additive: new event columns are nullable/defaulted; recreate the dropped partial
  unique index only when no owner legitimately holds multiple open intakes (in-file rollback notes).
- The publish gate, RBAC and sheet-sync behavior revert with the commits; no env bypass exists by design.

## 14. Daily operations checklist (operator)

1. `GET /api/health` (app) + runner `/api/health` — expect ok/ready.
2. Admin queue: `REVIEW_REQUIRED` units, `UNASSIGNED_MEDIA` and `AMBIGUOUS_REPLY` intakes (new
   correlation states) — correlate/resolve with the intake codes.
3. `owner_inbound_events` with `state='FAILED'` — retry-safe by design (replay the provider event
   or re-run the intake; the pinned intake resumes).
4. Access requests: `/api/admin/users` (pending) → approve/deny (super-admin).
5. `automation_runs` freshness; `failed_orchestrations` open rows.
6. PublishGate 422/`PublishGateError` logs are EXPECTED for unverified units — investigate only
   repeated remote failures (`pfStatus='pending_publish'`).
