# AWS EC2 → Docker Migration Plan (Workflow Runner & Automation Plane)

> **Status:** ACTIVE — supersedes the EC2 runner path for all Phase-1 / G3 execution.
> **Date:** 2026-10-26 · **Owner decision:** migrate the AWS plan to Docker ("act in silence" session).
> **Related:** `docs/obsidian-vault/Active Execution Plan.md` (G3 gate) · `infra/aws/` (legacy) ·
> `infra/docker-compose.rag-station.yml` (gateway station) · `workflows/runner.js` (control plane)

---

## 1. Why migrate (the AWS plan is dead weight)

The AWS plan centered on one EC2 instance (`i-0be8ff8c5cfba7363`,
`18.232.148.172`, **t3.micro — 2 vCPU / 1 GB RAM**) hosting the OpenWA
gateway, n8n, and the workflow runner, driven from GitHub Actions via AWS
SSM (`ec2-automations.yml`). It is now blocked at THREE independent layers,
all credential-side:

| Blocker | Evidence (2026-10-25) |
| --- | --- |
| Invalid AWS security token | All 5 recent scheduled `ec2-automations` runs failed at `configure-aws-credentials`; Vercel env keys return `UnrecognizedClientException` on SSM |
| G3 evidence unreachable | No runner telemetry (`public.workflows`) since 2026-10-11; the acceptance gate cannot close on this path |
| **Hardware ceiling** | The 8-line gateway era needs a ~10 GB RAM soft floor (`mem_reservation: 10g` in the RAG-station compose). A 1 GB t3.micro **cannot host it** — the AWS plan predates the 8-line expansion |

The decisive fact: the 8-line WhatsApp gateway **already runs in Docker on
the owner's host** (`infra/docker-compose.rag-station.yml`), with pairing
dashboard, Cloudflare tunnel, and key enforcement. The workflow runner it
was supposed to serve is the only piece still "planned" for AWS. Migrating
it to the same Docker host removes the AWS account dependency entirely —
no credentials to rotate, no SSM hop, no 1 GB ceiling.

## 2. What moved where (service mapping)

| Role | AWS plan (EC2 `18.232.148.172`) | Docker plan (owner host) | Status |
| --- | --- | --- | --- |
| WhatsApp gateway (8 lines) | OpenWA on EC2 :3000 (4-line era, 1 GB ceiling) | `whatsapp-rag-station` container, `sierra-rag-network`, :2785 | ✅ live since the 8-line expansion |
| Public exposure | Security-group :3000/:5678 open to `0.0.0.0/0` | Cloudflare tunnel (rag-station compose), keys REQUIRED | ✅ live, hardened |
| Workflow runner (`runner.js`) | `ec2-user` + SSM dispatch, telemetry label `ec2-runner:*` | `workflow-runner` container (`infra/docker-compose.runner.yml` + `workflows/Dockerfile`), label `docker-runner:*` | ✅ delivered by this migration |
| n8n automation | EC2 :5678 | `infra/docker-compose.yml` / `docker-compose.n8n.prod.yml` (existing) | ✅ already Docker-first |
| Runner control API | SSM-reachable only | `127.0.0.1:2786` host-local publish + `RUNNER_API_KEY` fail-closed | ✅ delivered by this migration |
| G3 telemetry | `public.workflows` via EC2 runner | same rows via `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env on the runner container | ✅ same evidence, new source |

## 3. Target topology

```
┌────────────────────── Owner Docker host (≥10 GB free for the station) ─────────────────────┐
│                                                                                             │
│  ┌───────────────────────────┐        ┌──────────────────────────────┐                      │
│  │ whatsapp-rag-station      │ :2785  │ workflow-runner              │ :2786                │
│  │ 8-line OpenWA gateway     │◄───────│ runner.js control plane      │ (127.0.0.1 only)     │
│  │ pairing dash / map / RAG  │        │ outreach · sentinel · digest │                      │
│  └────────────┬──────────────┘        │ units-sync · …               │                      │
│               │        network sierra-rag-network (service DNS)        │                      │
│  ┌────────────┴──────────────┐        └──────────────┬───────────────┘                      │
│  │ cloudflared-tunnel        │                       │ SUPABASE_URL + SERVICE_ROLE_KEY       │
│  │ (public, key-gated)       │                       ▼                                     │
│  └───────────────────────────┘              public.workflows telemetry (G3 evidence)       │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

The runner talks to the gateway over the internal bridge network
(`http://whatsapp-rag-station:2785`) — never through the public tunnel.
The control API publishes to `127.0.0.1` only; the Cloudflare tunnel fronts
the gateway, never the runner.

## 4. Rollout (operator steps)

1. **Prereq** — RAG station already running
   (`docker compose -f infra/docker-compose.rag-station.yml up -d`), which
   creates the `sierra-rag-network` this compose joins as `external`.
2. **Configure** — `infra/.env` (copy from `infra/.env.example` if not yet):
   - `OPENWA_ADMIN_API_KEY` — already required by the RAG station
   - `RUNNER_API_KEY` — NEW: strong random value for the control API
     (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`)
   - `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — optional; when set, the
     runner writes the live telemetry rows that close G3. Without them it
     still schedules and logs locally (honest `unconfigured` labels).
3. **Launch** — `start-docker-runner.bat` (or
   `docker compose -f infra/docker-compose.runner.yml up -d --build`).
4. **Verify** —
   - `curl http://127.0.0.1:2786/api/health` → liveness OK
   - with key: `curl -H "X-API-Key: $RUNNER_API_KEY" http://127.0.0.1:2786/api/workflows`
     → DB rows + local run state
   - Workflow Studio (admin) → rows update within one 60 s poll, labels
     read `docker-runner:ok`
5. **G3 evidence run** — with Supabase telemetry on, dispatch the §1 loop
   (`POST /api/workflows/owner-outreach/run` with the key, or the Studio's
   Run-now). Acceptance = status_history rows + `public.workflows`
   telemetry written by the Docker runner — no AWS credential anywhere in
   the chain.

## 5. EC2 decommission checklist (after G3 passes on Docker)

- [ ] Confirm 2 consecutive green daily-digest runs with `docker-runner:*` labels
- [ ] Export anything still unique off the instance: n8n workflows
      (`/home/node/.n8n` volume), `workflows/.env` (sheet/PF credentials),
      WhatsApp auth dirs (already re-paired on the Docker gateway)
- [ ] Stop the instance first (keep 1–2 weeks as rollback), then:
- [ ] Terminate `i-0be8ff8c5cfba7363`, release Elastic IP `18.232.148.172`
- [ ] Rotate/remove AWS secrets in repo + Vercel (`AWS_ACCESS_KEY_ID`,
      `AWS_SECRET_ACCESS_KEY`) — nothing should need them anymore
- [x] Disable the `ec2-automations.yml` schedule (workflow kept for history) — DONE 2026-10-27, commit `4a986d7e`: cron trigger removed, `workflow_dispatch` preserved as the manual/history/rollback path (see `docs/EXECUTION_REPORT_2026-10-27.md` §3/§5)

## 6. What is intentionally NOT migrated

- **Property Finder API keys / Vercel AWS keys** — unrelated to the runner
  path; they follow their own credential lifecycle.
- **The AWS account itself** — Supabase, Vercel and Cloudflare remain the
  only cloud dependencies. No EC2, SSM, or IAM usage remains in the plan.
- **`infra/aws/*` scripts** — kept as the historical record of the EC2 era
  (banners added pointing here); they are dead config once §5 completes.
