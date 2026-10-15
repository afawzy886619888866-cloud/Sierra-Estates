# SIERRA ESTATES — PRODUCTION READINESS REPORT

**Execution run:** 2026-10-15 · GLM autonomous production-recovery pass (working on `main`)
**Baseline HEAD (start of this run):** `86b83b571a7528557c7199548da29e2f59a0d609` (`fix(outreach): dynamic checkpoint expansion…`)
**Final state:** recovery commits on `main` (see §2 and `git log` for the exact SHAs of this pass)

This report supersedes the 2026-10-12 report (branch `agents/p0-intake-gate-fixes`, baseline `4e1796eb`). That branch's intake work was verified as merged and intact at the new baseline; this run audited the ACTUAL state at `86b83b57` before changing anything, then executed the 2026-10-15 mission (runner/tracker/pairing security, tunnel + backup script safety, backfill integrity, intake idempotency hardening, admin RBAC, public-metric truth, CI honesty). Nothing in this document is claimed without evidence. No secrets appear here.

---

## 1. Verdict

`IMPLEMENTED — LIVE VERIFICATION INCOMPLETE`

Code-side: all mission phases implemented, and every gate that runs in this environment is green on the final tree:

- **App suite (the production deploy gate):** 144/144 suites, **1548/1548 tests PASS** (`pnpm --filter sierra-estates-client-page test:ci`, after `build_master_inventory.py` regeneration, exactly as ci-preflight gate 1 orders it).
- **Workflows control-plane suite:** 4 files / **49/49 tests PASS** (root vitest), including the new P0 security regression contracts.
- **Type-check:** clean (`tsc --noEmit`, 0 errors). **Lint + config validation:** clean.
- **Infra scripts:** `bash -n` clean; non-root failure paths and dry-run modes exercised.

Why not `PRODUCTION READY — VERIFIED`: deployment itself (Vercel build of this exact revision, live post-deploy smoke, migrations 027–029 apply confirmation on production, live WhatsApp/Telegram verification) requires operator-owned infrastructure access that this run does not have (§11). The push to `main` will trigger the Vercel build through the existing authorized process; its result must be inspected before the verdict can be upgraded.

---

## 2. What this run changed (audit → fix, by phase)

| Phase | Files | Root cause fixed |
|---|---|---|
| 2.1–2.3 | `workflows/runner.js` | **Fail-open auth removed.** `if (!API_KEY) return true` → fail-closed 401 on every protected route when `RUNNER_API_KEY` is unset; timing-safe SHA-256 digest compare (`crypto.timingSafeEqual`); non-loopback `RUNNER_BIND` without a key now **refuses to start**; per-IP rate limiting (20 auth-fails/5 min → 429; 5 pairing-code mints/10 min); `/api/health` unauthenticated = minimal liveness only (gateway/supabase/running details now require auth); all JSON responses `Cache-Control: no-store`. |
| 2.2 | `workflows/runner.js` | **Hard-coded tracker credential removed** (`?key=SE2026outreach` path deleted; the export now authenticates like every protected route — never via URL query). The literal no longer appears in any tracked file. |
| 2.3 | `workflows/runner.js` | **Pairing portal protected**: `/pair/qr`, `/pair/code` require the API key (the page prompts for it; QR fetched via authenticated blob fetch, not a keyless `<img>`); code minting rate-limited; no caching. The working WhatsApp session was NOT touched (no restart, no re-link, no tunnel). |
| 2.4 | `workflows/sierra-admin-bridge.mjs`, `app/api/admin/workflow-ops/route.ts` | Bridge: removed `dev-admin-key` fallback credential; removed fabricated `ready:true` sessions; `reachable` only from an explicit boolean; local-state fallback labeled `status:'unknown'` (never 'active'). Ops route: slug allowlist; dead-runner → **502** (no more 200+`ok:false`); not-configured → 503; partial availability honestly flagged `degraded`. |
| 3 | `infra/aws/setup-cloudflare-tunnel.sh` | **Full rewrite**: dry-run default + `--apply`; named-token tunnels only (token via env/stdin, never argv, never printed/logged); Quick Tunnel requires explicit `--allow-quick-tunnel` with printed risk; arch detection; unit backup + `systemd-analyze verify`; visible verification (service active, connector registration) + printed rollback; hard failures on missing prerequisites. |
| 4 | `infra/aws/harden-live-gateway.sh` | **Full rewrite**: dry-run default + `--apply`; swap preflight (RAM/disk/current-swap, `SWAP_SIZE_MB` configurable); `MemoryMax` only with an operator-supplied budget; `BACKUP_BUCKET` configurable with IAM list-permission precheck; upload error propagation (`|| true` suppressions removed); stored-object size + SHA-256 verification; LATEST.sha256 manifest; archive kept on failure; documented restore procedure; cloudflared install opt-in; honest health report. |
| 5 | `workflows/backfill-sheet.mjs` | **Full rewrite**: invalid/missing historical timestamps **rejected to `backfill-rejections.jsonl`** (the `new Date()` → today substitution is gone); per-record identity (phone+at+code+cursor hash) — history NOT collapsed by phone; multi-date phones flagged for staff review; secret from env only; HTTPS required (loopback excepted) with `X-API-Key` auth; **dry-run default + `--apply`**; per-chunk checkpoint (safe resume, no duplicate writes); preserved failure queue; non-zero exit on any failed record; `read/valid/rejected/matched/sent/written/failed` summary; PII-masked logs. |
| 6.1 | `lib/services/OwnerListingIntakeService.ts` | **`no_ledger` bypass removed**: events without a provider message id are rejected to manual review (no intake, no listing, no external message) — a deterministic replacement id cannot be derived from trustworthy metadata (no provider timestamp exists on `OwnerIntakeMessage`). |
| 6.2 | same | `transitionToProcessing()` distinguishes DB **error** (fail-closed, no side effects) from **concurrent** claim (in-flight); the fallback path no longer logs an update failure and returns the event as claimed. |
| 6.3 | same | `completeEvent`/`failEvent` return honest persistence status; an unpersisted outcome is returned with **`uncertain: true`** (new documented `IntakeOutcome` field) — the ledger stays PROCESSING and the lease expiry + pinned intake make replay resume, not duplicate. |
| 6.4 | same | All duplicate/correlation lookups fail closed: `.catch(() => [])` removed from fingerprint intakes, canonical listings, near-match, quoted-context, and `findOpenIntakes` (which now propagates). A DB outage is never "no duplicate". |
| 7.1/7.2 | `app/admin/AdminPortal.tsx` | `role: data.role \|\| 'superadmin'` removed — a signed-in session without a valid server role now denies the console (controlled auth-error screen). Dev bypass identity relabeled `Dev Admin (auth disabled)`. Fabricated OpenClaw log lines removed (`All 10 agents operational`, `Sync simulated · 1,547 listings verified`, `[✓] Command executed/Processed` catch fallbacks → honest failures). |
| 7.3 | `app/api/admin/sheet-bridge/route.ts` | Real security gap found by the governance suite and **fixed at the root**: the route had NO auth guard; now `verifyAdminRequest` on GET+POST (was a pre-existing failure, not introduced by this run). |
| 8.1 | `app/(site)/HomePage.tsx`, `lib/site/i18n-dict.ts` (EN+AR) | **Unsupported public claims removed** (this is the "contradictory figures" mission finding): hardcoded `1900+ Active Listings / 53 Compounds / 68 Licensed Agents / EGP 4.2B Closed` → live public-inventory count (via the existing honest `usePublicListings`/`/api/inventory` pipeline), real curated compound total (62), and two truthful 100% process/positioning stats. Hero/network copy ("500+ firms", "1,500+ certified brokers", "240+ brokerage firms", "40,000+ buyers/month", "1,700+ sources", "48h", "Verified Inventory — every listing personally verified on-site", "Instant AI Verification") → truthful qualitative claims ("Market-Wide Network", "Broker-Sourced Listings", "Reviewed Inventory — every listing passes Sierra's verification and review pipeline", …) in both languages. |
| 13 | `scripts/ci-preflight.sh` | Gate numbering corrected: nine executed checks are labeled `gate 1/9 … gate 9/9` and the success line reports **9/9** (was `0/8..8/8` reported as "8/8"). Gate-1 necessity verified (not silently removed): the regenerated CSV feeds the phase13-data-qa suite pinned by gate 9. |
| 13 (tests) | `__tests__/action-routing-and-deployment-dispatch.test.ts`, `__tests__/backend-services.test.ts`, `apps/.../__tests__/august-owners-agent.test.ts` | Stale governance expectations modernized to the CURRENT deliberate architecture (dynamic `/api/cron/dispatch/[job]` routing, Hobby-plan 2-slot cron dispatcher + automation-jobs registry, intake fixtures now carry provider message ids per the 6.1 contract). No legitimate assertion was deleted; each updated check still pins its original intent. |
| 14 | (scan) | Secret scan of tracked source: **no live secret values introduced or found in active files**. The known historical exposures remain documented (§10). |

---

## 3. Test evidence (actual executions, this run)

| Suite | Command | Result |
|---|---|---|
| App full suite (deploy gate) | `pnpm --filter sierra-estates-client-page test:ci` | **144/144 suites, 1548/1548 tests PASS** (includes the 7 new idempotency regressions) |
| Intake regressions (targeted) | `npx jest owner-intake-idempotency-regression owner-listing-intake owner-intake-correlation-regression` | **26/26 PASS** |
| Workflows control-plane | `npx vitest run workflows/__tests__` | **49/49 PASS** (16 new security-contract assertions + 33 pre-existing) |
| Type-check | `pnpm --filter sierra-estates-client-page type-check` | **0 errors** |
| Lint + config validation | `pnpm --filter sierra-estates-client-page lint` | **clean** |
| Infra scripts | `bash -n` + non-root/dry-run failure-path execution | clean; safe failure confirmed |
| Master inventory regen | `python3 scripts/data-audit/build_master_inventory.py` | 12,443 rows normalized → 8,401 unique (TSV sources loudly skipped — removed in `49242e8f`, canonical owner data in Supabase); PUBLISHABLE: 0 (honest) |

New regression coverage added this run:
- `workflows/__tests__/runner-security-regression.test.ts` — fail-closed auth, timing-safe compare, bind guard, tracker-credential absence, pairing auth + rate limits, no-store, bridge honesty, backfill date-rejection behavior + record identity (behavioral, imports the module).
- `apps/.../__tests__/owner-intake-idempotency-regression.test.ts` — missing-message-id rejection, failed-claim fail-closed, uncertain completion, dedupe-outage fail-closed, correlation-outage fail-closed, FAILED-event replay resumes the pinned intake.

Pre-existing failures, verified NOT caused by this run (stash-diff proof): 12 root-level governance suites / 34 tests failed at baseline `86b83b57` and still fail — stale `.github` workflow expectations (ci.yml triggers, deploy-vercel.yml gate, permissions/concurrency, Node 22 pins), cspell dictionary, tracked-large-file hygiene, and a `sync-vercel-env.js` project-ID assertion that needs Vercel dashboard verification (cannot be resolved without credentials — deliberately NOT guessed). These suites are **not part of the production deploy gate** (ci-preflight runs gates 1–9; the legacy Actions job is manual-only). This run fixed the one REAL security failure among them (sheet-bridge auth) and modernized the three provably-stale cron/architecture assertions; the rest are documented, not hidden.

---

## 4. Architecture & source-of-truth (unchanged, re-verified)

- **Public inventory:** Supabase `listings` → `/api/inventory` (owner-PII stripped, 5-min cache) → `usePublicListings` (loading/error/empty states). Curated marketing data (`HZDATA`) is separate and labeled.
- **Intake:** every source funnels into `OwnerListingIntakeService.processOwnerMessage` behind the `owner_inbound_events` ledger (unique `(source, message_id)`, state machine RECEIVED→PROCESSING→COMPLETED/FAILED, leases, pinned intakes).
- **Publication:** the canonical server-side publish gate remains the only path; fresh sheet rows land `REVIEW_REQUIRED`; owner-intake units stay `status:'pending'` + `publish_status:'REVIEW_REQUIRED'` (P0 3D/3F preserved).
- **Scheduler ownership (Phase 11 matrix, current):**
  - EC2 runner (`workflows/runner.js`) — authoritative for the nine server workflows; fails closed without Supabase rows; paused workflows never auto-run (P0-9 recheck preserved and re-tested).
  - Vercel cron — exactly two Hobby slots (`/api/cron/dispatch/night`, `/api/cron/dispatch/morning`) over the automation-jobs registry; both map to the dynamic dispatcher route (test now pins the mapping).
  - `.github/workflows/automations.yml` — manual fallback only; no duplicate protection concern while dormant (documented; re-verify before ever re-enabling).
  - GCP Scheduler — **no live evidence** of jobs (config files only; mission rule: a config file is not a running scheduler). None provisioned by this run.

---

## 5. Deployment & rollback

- **Deploy path (unchanged, authorized):** push to `main` → Vercel builds with `scripts/ci-preflight.sh` (9 gates) + app production build. This run's push = the release candidate.
- **After deploy (operator):** confirm deployment identity/commit, inspect build log for `PREFLIGHT PASSED — 9/9 gates green`, then the smoke set in §11.
- **Rollback:** every change is additive and revertible — `git revert` the recovery commits; no schema change ships in this pass; migration 029 semantics unchanged from the prior report; runner/bridge/backfill scripts revert to prior behavior with the same commands; no history was rewritten, no force-push.

---

## 6. Owner intake & event recovery (state after this run)

Media-only, multi-unit, quoted-context, ambiguous-reply and unassigned-media states are preserved from the merged prior branch and re-verified by the 26 passing intake tests. New this run: the 6.1–6.4 fail-closed/uncertain semantics (§2) with regression proof, including: replay after a failed completion resumes the SAME intake (no duplicate unit), and no database error can masquerade as "no duplicate".

---

## 7. Admin roles, RBAC, account approval

- Server-side authority unchanged (`auth-guard.ts`, ADMIN_CONSOLE_ROLES, session re-validation, suspension enforcement).
- This run closed the remaining privilege-escalation default in the portal shell (7.2) and the unguarded `sheet-bridge` route (7.3).
- Google OAuth/Supabase integration and the approval workflow re-verified at HEAD; durable notification queue remains the honest fallback where no email provider is configured (unchanged, documented).

---

## 8. Public inventory & metrics truth (after this run)

- Homepage stat strip: **live count** (`/api/inventory`), **real compound total** (62), and two truthful 100% process statements — zero fabricated totals remain in the stat strip, hero, network banner, feature grid, CTA, or footer (EN + AR).
- "Verified/on-site-verified" claims removed platform-wide in copy; verification remains a real, staff-driven process the copy now describes accurately ("review pipeline").
- Publication gating unchanged: nothing unverified reaches the public inventory (§4).

---

## 9. Scheduler & automation state

See §4 matrix. Fail-closed dispatch (no Supabase → idle), paused-stays-paused (pre-execution recheck), overlap locks, and honest `ec2-runner:*` labels are all preserved and pinned by the 49-test workflows suite.

---

## 10. Security state & credential rotation (Phase 14)

**Fixed this run:** the fail-open runner control plane, the hard-coded tracker credential, unauthenticated pairing assets, the unauthenticated `sheet-bridge` admin route, the bridge's fallback credential and fabricated readiness.

**Standing risks — rotation/actions that remain (all require human/owner access):**
1. **ROTATE (required, unchanged):** legacy `service_role` JWT for Supabase project `gaxfqcietzoonlmatiot` — value remains recoverable in git history (removed from HEAD in `178bac90`). Supabase dashboard → Settings → API Keys → rotate. Until rotated, anyone with repo history access has full RLS-bypassing DB access.
2. **ROTATE (required):** the `sb_secret_…` new-format secret exposed in a chat log (documented incident).
3. **ROTATE after use:** the GitHub PAT shared in-chat for this run (used only for the push; never written to any file or commit).
4. **Rotate/invalidate:** the old tracker credential `SE2026…` — the code path is removed; if the same value is used anywhere else (e.g., a bookmark, a monitoring probe), retire it.
5. Transport hardening (operator): cleartext HTTP to the EC2 EIP for runner/gateway remains a concern until the Phase-3 named-tunnel procedure is run (the rewritten script is the safe path; do NOT run the old version).

**Secret scanning:** tracked source scanned this run — no live secret values in active files; no new secrets introduced. Consider enabling gitleaks/trufflehog in CI as follow-up.

---

## 11. Remaining external blockers — exact required actions

1. **Vercel:** inspect the build triggered by this push (deployment ID + `PREFLIGHT PASSED — 9/9` in the log); run post-deploy smoke (public site renders, admin denied unauthenticated, property search, map, `/api/health`).
2. **Migrations 027+028+029:** confirm applied on production via the ledgered `apply-pending-migrations.mjs` path (code-side checks pass; production ledger verification needs DB access).
3. **Supabase:** rotate the two exposed credentials (§10.1/§10.2).
4. **EC2 operator:** restart the runner with `RUNNER_API_KEY` set (fail-closed means the control plane 401s until the key is configured — intentional); re-run `backfill-sheet.mjs` in dry-run first; tunnel only via the rewritten script with a named token.
5. **WhatsApp/Telegram live verification:** authorized test message through each channel; no bulk outreach was triggered by this run (mission rule respected).
6. **Legacy governance suites (12 files / 34 pre-existing failures):** decide fix-vs-retire per suite — especially the `.github` workflow expectations and the `sync-vercel-env.js` project-ID assertion (needs Vercel dashboard confirmation; intentionally not guessed).

---

## 12. Daily operations checklist (operator)

Unchanged from the prior report, plus:
1. Runner `/api/health` now requires the API key for the full payload (minimal liveness without it) — monitor accordingly.
2. `backfill-rejections.jsonl` (invalid timestamps, multi-date conflicts) and `backfill-failures.jsonl` (retry queue) are the two backfill review queues.
3. Intake outcomes carrying `uncertain: true` deserve a follow-up query on `owner_inbound_events` stuck in PROCESSING past the lease window.

---

## 13. Acceptance gates A–O

| Gate | Status | Evidence |
|---|---|---|
| A. No unresolved unsafe public access to runner/owner-data export | **PASS (code)** / live-verify pending | fail-closed auth + bind guard + rate limits (runner.js); 49/49 workflows tests; §10 transport caveat |
| B. No fixed tracker credential or unprotected pairing | **PASS** | literal absent from tracked files; pairing auth + rate limits + no-store; regression tests pin it |
| C. Tunnel/backup scripts fail safe, dry-run default | **PASS** | rewrites verified: dry-run default, `--apply`, preflight, rollback, no token in argv/logs |
| D. Backfill preserves history, rejects invalid dates, honest partials | **PASS** | behavioral tests (validateTimestamp, recordId) + source contracts; dry-run default |
| E. Intake idempotency + recoverable event state | **PASS** | 26/26 intake tests incl. new 6.1–6.4 regressions |
| F. DB errors can't fake "no duplicate" | **PASS** | `.catch(() => [])` removed from all dedupe/correlation paths; outage→FAILED (retryable), regression-tested |
| G. Admin role/approval fail closed | **PASS** | superadmin default removed; sheet-bridge guarded; auth-error denial path; server guards re-verified |
| H. No fabricated inventory/false success in production UI | **PASS** | AdminPortal fabrications removed; OpenClaw failures honest; bridge telemetry honest |
| I. Public counts/verification claims source-backed | **PASS** | live inventory count, real compound total (62), EN+AR claim cleanup; no fabricated totals remain |
| J. All publication paths use the canonical gate | **PASS (re-verified)** | gate intact; units-sync REVIEW_REQUIRED pinned by runner-safety tests |
| K. WhatsApp/Telegram live-verified or explicitly blocked | **BLOCKED (external)** | code + adapters verified; live channel verification requires authorized test device (no bulk outreach run) |
| L. Each scheduled job has one authoritative scheduler | **PASS** | §4 matrix; fail-closed dispatch; Hobby 2-slot dispatcher contract now test-pinned |
| M. CI/tests pass on the intended commit | **PASS** | 1548/1548 + 49/49 + type-check + lint on this tree |
| N. Deployment identity + critical smoke verified | **BLOCKED (external)** | push triggers Vercel; deployment ID + live smoke require the Vercel dashboard (§11.1) |
| O. Documentation matches the actual system | **PASS** | this report reflects the executed state; runbooks updated via the rewritten scripts' inline contracts |

---

## 14. Final report summary (mission format)

1. **Verdict:** `IMPLEMENTED — LIVE VERIFICATION INCOMPLETE`.
2. **Commits:** baseline `86b83b57` → recovery commits on `main` (this pass; see `git log`); push status: pushed to `origin/main` (this run). No force-push, no history rewrite, no bypassed checks.
3. **Major fixes:** §2 table (15 files, 8 root-cause classes).
4. **Test totals:** 1548/1548 app + 49/49 workflows (actual executions, §3).
5. **CI/deploy links:** legacy Actions suite is manual-only by design; the production gate is the Vercel-embedded preflight (9/9 expected in the build log of this push — must be inspected by the operator).
6. **Gates A–O:** §13.
7. **Subsystems:** migrations 027–029 code-verified (prod apply pending); intake hardened + regression-proven; admin RBAC closed; publication gate intact; WhatsApp/Telegram code-verified (live test blocked); schedulers consolidated and test-pinned; GCP/RAG untouched (no provisioning, dimension mismatch unresolved without live access); backup script rewritten (verification now built-in, first verified backup requires a live run with a real bucket); public inventory honest.
8. **Outstanding security risks/rotations:** §10 (three credential rotations + transport hardening + historical git exposure note).
9. **Exact external permissions/actions still required:** §11.
10. **Top three immediate next actions (priority order):**
    1. Inspect the Vercel build/deployment of this push; run the post-deploy smoke (§11.1).
    2. Rotate the two exposed Supabase credentials (§10.1–10.2).
    3. On EC2: set `RUNNER_API_KEY` and restart the runner; run `backfill-sheet.mjs --dry-run` before any apply.
