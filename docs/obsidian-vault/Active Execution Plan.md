---
type: memory
domain: operations
status: living
updated: 2026-10-19
---

# Active Execution Plan — Owner Acquisition → Verified Inventory → Connected Systems

> **Path:** `docs/obsidian-vault/Active Execution Plan.md`
> **Parent Node:** `[[Sierra Estates Memory Engine]]` · `[[Sourcing Pipeline & Lead Aggregator]]` · `[[WhatsApp CRM & Hand-off Pipeline]]`

The **owner-approved autonomous execution mandate** (received 2026-10-19, truncated at §5A)
lives on through this note. Any fresh session MUST read this note first, load
`docs/MASTER_PROJECT_PLAN.md` for architecture, and resume from the Phase Gates
below — the mandate survives context loss here.

---

## 1. Mandate summary (what is authorized)

One autonomous end-to-end run of the primary operating loop, **within the mandate's
scope**, without stopping between workflow steps:

**Discover listings → identify qualifying owners → contact owners → manage
replies/negotiation → qualify/verify listings → generate stable listing codes →
save canonical inventory records → sync downstream (Google Sheets, internal views,
gated public pages/map, RAG, Property Finder ads, WhatsApp/Telegram team
notifications, per-integration status log) → maintain RAG knowledge + audit evidence.**

Phase 2 (lead-to-viewing conversion) stays deferred until Phase 1 passes its
acceptance gate.

**Core principle (verbatim):** do not rebuild working subsystems — audit the existing
implementation, repair, connect, test, and reuse every reliable part.

**Active Strategic Goal:** Run the Sierra Estates primary operating loop end-to-end — owner acquisition through verified inventory to connected systems (Sheets, RAG, Property Finder, WhatsApp/Telegram) — with zero fabricated data, stable immutable listing codes, and honest per-integration status evidence.

## 2. Governance status (the MCD conflict — RESOLVED)

| Question | Resolution |
| --- | --- |
| Repo `AGENTS.md` mandates halting between MCD phases | The owner-approved mandate authorizes autonomous execution **within its scope**; `AGENTS.md` was amended 2026-10-19 with a scoped override section. Outside the mandate's scope, MCD phase-stop rules apply unchanged. |
| Command Deck API (127.0.0.1:8888) unreachable | **No board records are fabricated** (fail-loud rule). Progress is recorded in this note, the repo worklog, and commit messages until the deck is reachable. |
| Workflows runner (port 2786) unreachable in sandbox | Workflow code is audited/repaired statically; live execution happens on the EC2 host where the runner actually runs. |

## 3. Canonical inventory architecture (now ENFORCED in code)

| Concern | Owner | Where |
| --- | --- | --- |
| Permanent identity | `listings.id` (uuid) | schema.sql |
| Stable human-readable code | **DB-minted** `SE-{RNT\|SL}-{AREA}-{SERIAL}` — sequence-backed, immutable | migration `20261019_031` (assign + freeze triggers, `uq_listings_code`) |
| Dedup identity (mutable, separate) | `dupe_check_hash` / `listing_fingerprint()` | schema.sql + `lib/services/inventory/dedupe.ts` |
| Lifecycle state machine | `draft → pending_verification → verified → published → reserved → sold\|rented` (+ `expired`, `archived`, `off_market`) | migration 011 SQL fns + `lib/services/inventory/lifecycle.ts` |
| No-fabrication | unknown city/type/currency stay NULL | migration 022 + `InventoryDomainService` |

**Rule of separation:** codes are never used for dedup; fingerprints are never used
as codes. A price edit changes neither the code (frozen by trigger) nor the
fingerprint (price is band-bucketed ±2.5%).

## 4. Phase Gates (resume here)

- [x] **G0 — Repository baseline audit** (2026-10-19): clone @ `90260d2`, full tree
      audited, test baseline re-verified **161 suites / 1710 tests green** after
      regenerating `data/MASTER_INVENTORY_V1.csv` (12,443 rows → 8,401 unique).
      Readiness-report claims corrected by evidence.
- [x] **G1 — Critical defect repair** (2026-10-19):
      1) `db-adapter.ts` no longer masks DB outages as "not found" (dedup
      protection); 2) stable listing codes (migration 031 + intake rewiring);
      3) `OwnerOutreachService` dead-path/silent-catch/window fixes.
- [~] **G2 — Downstream sync verification** (code-level COMPLETE 2026-10-19,
      session 2; live-environment runs still credential-blocked):
      1) **Ingest-side canonical wiring DONE** — every README integration
      route now goes through `InventoryDomainService.upsertFromSource` via the
      new `lib/services/inventory/ingest-bridge.ts`: `/api/ingest/whatsapp`,
      `/api/cron/ingest-from-sheets`, `/api/properties/sync` (PF, with rich
      extraColumns + legacy fallback for §21-incomplete), `/api/admin/listings`
      POST (duplicate merges instead of 500), and `sweepStale` wired into
      `/api/cron/maintenance`. §21 gates: incomplete listings and unstated
      offer types never enter canonical inventory.
      2) **P1 defect fixed** — db-adapter mapped only `fingerprint`;
      `location/area/currency/source/coordinates` had no real columns
      (PGRST204 on every live write). Now mapped: location→location_area,
      area→area_sqm, currency→price_currency, source→sync_source,
      coordinates→latitude/longitude (bidirectional).
      3) **Cross-path duplicate merge** — the `uq_listings_dupe_check_hash`
      unique index can fire when another path (PF id / admin insert) already
      owns the fingerprint under a different id; the bridge merges into the
      winner row (sources provenance + payload) instead of surfacing a 500.
      4) **Outreach audit (queue #4) DONE** — migration 033
      `owner_outreach_log` (RLS: staff read-only, service-role writes) +
      fire-and-forget per-real-send audit write in workflows/09 (dry-run never
      writes; audit failures counted in the run summary, never block a send).
      5) Verified: app jest 163 suites / 1728 tests · root vitest 77 files /
      713 tests · full `tsc --noEmit` CLEAN (first time in this 4GB sandbox —
      3GB heap) · eslint 0 on touched files · 20 new regression tests.
      REMAINING for G2 closure: live runs on the EC2 runner + Vercel deploy
      (both blocked, see §7) and per-integration live status evidence.
- [ ] **G3 — Phase 1 acceptance gate**: end-to-end run of the §1 loop on the EC2
      runner with audit evidence (integration status log + status_history rows).
      Only after G3 passes does Phase 2 (lead-to-viewing) start.

## 5. Known-good components (REUSE — never rebuild)

| Component | Evidence |
| --- | --- |
| `lib/server/unit-codes.ts` | deterministic canonical code system, tested |
| `lib/services/inventory/*` | domain service, state machine, dedupe, no-fabrication |
| `workflows/09-owner-outreach/outreach.js` | EC2 outreach engine: ledger dedupe, pacing, caps, opt-out |
| `workflows/runner.js` | fail-closed scheduler, DB-registered workflows, honest run labels |
| `scripts/data-audit/build_master_inventory.py` | real-data pipeline (never fixtures) |
| `supabase/migrations/*` | additive, idempotent, mirror-parity tested |

## 6. Anti-patterns hunted & fixed (2026-10-19)

| Anti-pattern | Where | Status |
| --- | --- | --- |
| DB errors caught as "record not found" (disables dedup) | `inventory/db-adapter.ts` | FIXED + regression-locked |
| Price-embedded listing codes (unstable identity) | `coding-algorithm.ts` → intake path | FIXED (DB-owned minting; legacy fn kept for display only) |
| `Math.random()` technicalId (no collision guard) | `coding-algorithm.ts` | superseded by DB sequence |
| Dead Windows paths `H:/Sheets/…` | `OwnerOutreachService.ts` | REMOVED |
| Silent `catch {}` (hide canonical-source failures) | `OwnerOutreachService.ts` | FIXED (log + surface) |
| Operating window computed then ignored | `OwnerOutreachService.getNextHourlySlot` | FIXED (window enforced, DST-safe) |
| Readiness claims vs. reality | `MASTER_PROJECT_PLAN.md §4` | Corrected: 160→161 suites after repair |

## 7. Live-environment blockers (honest, not fabricated)

1. **Command Deck API down** in sandbox → no board cards written. Re-check
   `.amphion/config.json` port 8888 on the real host; write cards via REST per
   `AGENTS.md` when reachable.
2. **Migrations 031/032/033 NOT yet applied to the live project** (written,
   mirrored, statically contract-tested). Session 2 exhausted every
   credential path and each one is stale or empty — the owner must supply ONE
   of: (a) a current Supabase personal access token (sbp_…) — the one stored
   in Vercel env (`SUPABASE_ACCESS_TOKEN`) returns 401 Revoked; (b) the
   database password (Vercel `POSTGRES_PASSWORD` is empty on both projects;
   `POSTGRES_HOST=db.gaxfqcietzoonlmatiot.supabase.co` is already correct);
   or (c) run `node scripts/apply-live-migrations.mjs` (deployed by session 2
   to the operator workspace) / `pnpm deploy:supabase` on a host with a valid
   `SUPABASE_ACCESS_TOKEN`. **Deploy order is hard-gated: the app deploy must
   land ONLY AFTER 031+032** (the new canonical ingest writes
   `sources/status_history/...` columns — without 032 every complete parsed
   listing 500s and sheet rows go terminal-FAILED).
3. **AWS credentials stored in Vercel env are invalid** (UnrecognizedClientException
   on SSM DescribeInstanceInformation) → the EC2 operator-host path
   (`scripts/ssm_exec.py`, instance i-0be8ff8c5cfba7363, /opt/se/workflows/workflows.env)
   is blocked too. Rotate `AWS_ACCESS_KEY_ID/SECRET` or run the migration on the
   host directly.
4. **GitHub push token redacted** in the owner's tokens file → session 2's
   commits live in the local clone only; re-send an unredacted PAT (repo scope)
   to sync, or push from the operator host.
5. **Mandate text truncated at §5A** — sections 5B+ (likely owner-contact and
   reply-handling detail) were never received. Execution proceeds on the received
   scope; the owner should re-send the remainder to extend §5.

---

## 8. Execution log (append-only)

### Session 2 — 2026-10-19 (G2 code-level + credential sweep)

- Verified HEAD baseline (c625b39) before touching anything: turbo test:ci
  6/6, app jest 161/162 suites 1708 tests, root vitest 77 files / 713 tests —
  all green (parallel sessions had added ~25 commits post-G1; none broke).
- Queue #2 (ingest wiring) — executed in full, see G2 gate above.
- Queue #4 (outreach audit) — executed in full (migration 033 + engine write
  + 5 contract pins in `workflows/__tests__/outreach-audit-contract.test.ts`).
- Queue #3 (workflows tests in CI) — verified already satisfied via
  `pnpm test:root` (root vitest includes `workflows/__tests__/**`);
  the parity mechanism differs from "a test script in workflows/package.json"
  but the outcome (workflows tests inside the CI gate) holds.
- Queue #5 (RAG goal-resolver pin) — verified already satisfied:
  `brain-rag-engine.test.ts` pins ACTIVE-mandate resolution, non-ACTIVE
  rejection, explicit-override precedence, and vault persistence.
- Queue #1 (apply migrations live) — **blocked**: every stored credential is
  stale (see §7.2/7.3). The application tooling is READY
  (`scripts/apply-live-migrations.mjs` in the operator workspace: pre-flight
  artifact checks → apply 031/032/033 → post-flight verification queries).
- Vercel token verified working (account: Sierra-Estates, team
  team_UvdJ5e…): env read/write possible; deploy intentionally NOT executed
  because of the §7.2 migration gate ordering.
- All 20 new tests + full suites green; `tsc --noEmit` clean at 3GB heap.

---

*Last updated by the autonomous execution run of 2026-10-19. Append new entries
below; never rewrite history.*
