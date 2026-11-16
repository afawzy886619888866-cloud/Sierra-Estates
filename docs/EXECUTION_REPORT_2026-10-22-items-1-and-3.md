# EXECUTION REPORT — 2026-10-22 · Items 1 & 3 (cont.)

**Repo:** `afawzy886619888866-cloud/Sierra-Estates` · **Trigger:** "1 and 3" (§J blockers of EXECUTION_REPORT_2026-10-22.md) · **Session:** 12:02–12:45 UTC

## Verdict

`DEPENDABOT CLEARED — WORKER INBOUND PATH SHIPPED — AGENT-FLEET FIRST-EVER GREEN — PRODUCTION-SMOKE HONESTLY RED ON REAL DATA DRIFT`

## Item 3 — Dependabot PRs: CLOSED

| PR | Bump | Disposition |
|---|---|---|
| #14 | `certifi` 2026.7.22 → 2026.10.19 (`/tools/claude-proxy`) | squash-merged `9898bf33`; CI green on push; admin prod READY, client content-identical |
| #15 | `aiohttp` 3.14.3 → 3.14.4 (`/tools/claude-proxy`) | squash-merged `9c100a1a`; CI green on push; both prod READY |

Both PR heads had green CI check-runs; the only red context was a stale `Vercel – admin-dashboard` **preview** status dated 2026-10-20T23:55Z — the pre-cure broken-pipeline era, on a path (`/tools/claude-proxy`) outside app build inputs. Zero open PRs / zero non-dependabot branches remain.

## Item 1 — 8-line worker inbound path: SHIPPED (PR #26, `d02896e7`)

**Root gap found:** the 8-line worker could pair all 8 lines and inbound would STILL be dark — it had no path to the Sierra app (the old EC2 gateway did that job and is network-dark since Oct-21). No webhook forwarding, no heartbeat, anywhere in `apps/agents/whatsapp-multi-session/`.

**Fix — `app-bridge.js` (merged, CI-gated, admin prod READY):**
- **Webhook forwarding:** every inbound message (DM or group) POSTed to `https://admin.sierra-estates.net/api/webhooks/whatsapp` in the exact OpenWA envelope contract the route already parses (`{ event:'message.received', sessionId, data }`) with `x-sbr-secret-key`. Fire-and-forget, 3 bounded retries (0.5s/2s/8s); 4xx fails loudly with the ADMIN-secret guidance; never blocks message handling; app-side idempotency by message id.
- **Honest heartbeat:** 60s pulses to `/api/whatsapp/heartbeat` ONLY while ≥1 line is READY — zero paired lines ⇒ no pulses ⇒ health honestly `stale`. Never a fake green.
- `.env.example` + README §4: the project-scoped `SBR_SECRET_KEY` warning (admin = `sierra-sec…`, never the client value) and the outbound reply-loop step (Vercel must reach the worker at a public/tunnel URL for auto-replies).
- Validated with a mock-server harness (envelope shape, secret header, 4xx honesty, group-author mapping, heartbeat gating). Standalone JS outside turbo — zero Vercel-build risk.

**Remaining for this item (owner-side, physical):** launch the worker (`pnpm openwa:8lines:install && pnpm openwa:8lines` or `start-workflow-runner.bat`), put the ADMIN `SBR_SECRET_KEY` in its `.env`, scan the 8 line QRs from `http://localhost:2785`. Inbound + heartbeat then flow automatically.

## Bonus — scheduled-workflow health ("activate all workflows")

| Workflow | State | Evidence |
|---|---|---|
| **agent-fleet** | **FIXED + first-ever GREEN** | Failed EVERY run since creation: `pnpm check:backend` needs root `.env.local`/`.env` no checkout can contain. PR #26 adds an explicit `ci-readonly` posture (read-only canonical defaults, posture printed each run, writes flagged unavailable; local no-env still fails loudly). Live-verified: workflow_dispatch run `39779047021` → **success** (briefing:daily ran). |
| **production-smoke** | honestly RED — data-side | Reproduced locally: 13/15 PASS; 2 data-quality gates fail on real drift — **3,094 unpriced units + 30 rent-as-sale records, ALL `updatedAt=2026-10-19`** (the Oct-19 broker/owner sheet merge: `broker_buy` 2186, `broker_rent` 448, `owners_buy` 284, `owners_rent` 176). The 30 "suspicious sales" are rental listings mis-modeled (`mode='sale'`, 30–75k monthly rents, listing titles in the compound field). Gates are working as designed — fix is a data decision (backfill prices / exclude unpriced from the public feed / quarantine the 30), not a code change. |
| automations · jira-sync · CI · WhatsApp Owner Outreach | green | runs API, today |

## Live state (verified end of session)

Both sites healthy v3.1.0 · admin prod = `d02896e7` READY · client prod = `9c100a1a` READY (content-identical to `d02896e7` for the app build — worker/scripts changes are outside build inputs; Vercel dedup-canceled the redundant client deploy) · CI green on `d02896e7` push (run `39779039359`) · heartbeat honestly `stale` since Oct-15 pending the worker launch · EC2 `54.89.162.250` still network-dark (all TCP filtered).

## Standing queue (owner-side)

1. Launch + pair the 8-line worker (with the bridge now merged) — the ONE physical step to inbound.
2. Expose it via cloudflared and point `WHATSAPP_API_URL`/`OPENWA_HOST` on Vercel at the tunnel URL for DM auto-replies.
3. production-smoke data decision (see above).
4. Rotate the two chat-exposed tokens (GitHub PAT + Vercel) when convenient.
