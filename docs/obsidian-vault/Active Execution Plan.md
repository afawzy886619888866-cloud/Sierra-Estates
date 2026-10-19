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
- [ ] **G2 — Downstream sync verification**: Google Sheets write-back (workflow 08),
      RAG ingestion (`/api/internal/rag-search`), Property Finder feed
      (`/api/feeds/property-finder`), WhatsApp/Telegram notifications — verify each
      integration's status fields are honest (per-integration status/retry/timestamp).
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
2. **Supabase service credentials absent** → migration 031 is written, mirrored and
   statically contract-tested, but NOT yet applied to the live project. Apply via
   `pnpm deploy:supabase` / `scripts/apply-supabase-schema.mjs` on the operator host
   with `SUPABASE_ACCESS_TOKEN` present.
3. **Mandate text truncated at §5A** — sections 5B+ (likely owner-contact and
   reply-handling detail) were never received. Execution proceeds on the received
   scope; the owner should re-send the remainder to extend §5.

---

*Last updated by the autonomous execution run of 2026-10-19. Append new entries
below; never rewrite history.*
