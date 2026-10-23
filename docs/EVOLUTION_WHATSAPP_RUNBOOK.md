# Evolution WhatsApp Desktop Stack — Runbook

**Added:** 2026-10-23 · **Lane:** desktop (owner's Windows box) · **Status:** code landed, runtime is owner-side

This stack is the hardened version of the "Sierra PropTech Full Automated
Deployment & GitHub Actions Fix" draft. **100% of its automation logic is
preserved** — call-reject auto-replies, owner-outreach campaigns, inbound lead
detection, scraped-ad extraction, dedup, instance rotation, day-shift quotas,
checkpointing, inventory coding, Property Finder EN copy generation. What
changed is the security and repo-hygiene envelope around it.

## Why the original draft could not be committed as-is

This repository is **public**. The draft contained values that must never live
in a public repo:

| # | Draft behavior | Risk | Hardened behavior |
|---|---|---|---|
| 1 | `EVOLUTION_API_KEY` default literal `sierra_secret_key_2026` in code + workflow | Credential leak into public git history | Env var only, **no default**; workflow reads repository secrets and fails loudly when missing |
| 2 | 4 real WhatsApp line numbers hardcoded in `INSTANCES` | Owner PII in public repo | `SIERRA_INSTANCES` env var (comma-separated) |
| 3 | Google Sheet CSV URL (owner contact list) hardcoded | Mass owner-PII exposure via public sheet ID | `SHEET_CSV_URL` env var / repository secret |
| 4 | Direct-management phone hardcoded | PII leak | `DIRECT_MGMT_PHONE` env var (optional; message degrades gracefully) |
| 5 | Workflow cron `*/30 * * * *` + commit `.xlsx`/checkpoint to main | ~48 bot commits/day, growing binary in git, Actions-minute burn, floods Jira Sync | `workflow_dispatch` only; outputs uploaded as 7-day workflow artifacts; `contents: read` |
| 6 | Unauthenticated webhook on `0.0.0.0:5000` | Anyone who reaches the port can inject fake leads / trigger sends from your lines | Optional `WEBHOOK_SECRET` shared-secret header guard |
| 7 | Dead-letter rows retried forever on every sheet loop | Spam loop against failing numbers | DLQ rows are skipped permanently until manually cleared |
| 8 | Unknown beds/compound defaulted to "3"/"New Cairo" in PF listings | Fabricated listing data (the exact class this repo's P0s purge) | Unknown stays unknown (`N/A` / `Unclassified`) |

## Files

| File | Role |
|---|---|
| `sierra_webhook.py` | FastAPI inbound engine (port 5000). Call-reject replies, owner-outreach, lead detection, scraped-ad extraction. |
| `sierra_master.py` | 24/7 orchestrator. Day-shift 10:00–21:00 Africa/Cairo, 30 msgs / 30 min per instance, 45–65 s jitter, instance rotation, checkpoint, DLQ, inventory coding to local Excel. |
| `.github/workflows/sierra.yml` | Manual-dispatch CI lane. Requires 4 repository secrets; uploads run outputs as artifacts. |

Local runtime state (`sierra_checkpoint.json`, `Sierra_Estates_Master_Units.xlsx`,
`pair_*.html`) is **gitignored** — never commit it.

## Local setup (Windows)

1. **Prereqs:** Docker Desktop, Python 3.11+ (`py`), Git, a tunnel if you want
   CI reachability (optional — local 24/7 does not need it).

2. **Start Evolution API** (localhost only):
   ```powershell
   docker run -d --name evolution-api -p 8080:8080 `
     -e AUTHENTICATION_API_KEY=<your-local-key> `
     -v evolution_data:/evolution/instances `
     --restart always atendai/evolution-api:latest
   ```
   Pairing state persistence depends on the image's database configuration —
   consult the Evolution API docs for the SQLite/Postgres env vars if you want
   instances to survive container recreation.

3. **Create + pair instances** (one per WhatsApp line):
   ```powershell
   $h = @{ apikey = "<your-local-key>" }
   Invoke-RestMethod -Uri "http://localhost:8080/instance/create" -Method Post `
     -Headers $h -ContentType "application/json" `
     -Body (@{ instanceName = "sierra_<number>"; qrcode = $true; integration = "WHATSAPP-BAILEYS" } | ConvertTo-Json)
   $conn = Invoke-RestMethod -Uri "http://localhost:8080/instance/connect/sierra_<number>" -Headers $h
   $conn.qrcode.code     # pairing code — enter it on the phone
   $conn.qrcode.base64   # QR image — save as data-URL HTML and scan
   ```

4. **Set environment** (PowerShell session or `.env.sierra.local`, gitignored):
   ```powershell
   $env:EVOLUTION_API_URL   = "http://localhost:8080"
   $env:EVOLUTION_API_KEY   = "<your-local-key>"
   $env:SIERRA_INSTANCES    = "sierra_<n1>,sierra_<n2>,sierra_<n3>,sierra_<n4>"
   $env:SHEET_CSV_URL       = "<google-sheet-csv-export-url>"
   $env:DIRECT_MGMT_PHONE   = "+20..."        # optional
   $env:WEBHOOK_SECRET      = "<random>"      # optional but recommended
   ```

5. **Run 24/7:**
   ```powershell
   pip install requests pandas openpyxl fastapi uvicorn tzdata
   Start-Process py -ArgumentList "sierra_webhook.py" -WindowStyle Minimized  # inbound, port 5000
   python sierra_master.py                                                   # outbound 24/7 loop
   ```
   Point Evolution's webhook settings at `http://<host>:5000/webhook`
   (with the `X-Webhook-Secret` header if `WEBHOOK_SECRET` is set).

A turnkey setup script (including the Antigravity telemetry-hook repair and
QR/pairing-code helpers) ships as `Sierra_Evolution_Setup.ps1` with this
release.

## CI usage (optional)

`Actions > Sierra Evolution Engine > Run workflow`. Requires four repository
secrets (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `SHEET_CSV_URL`,
`SIERRA_INSTANCES`). The URL must be publicly reachable from the runner —
use your tunnel, not localhost. The run fails loudly when secrets are absent
(repo convention: visible BLOCKED, never fake green). Outputs land as
artifacts, never as commits.

## Relation to the existing automation stack

This desktop lane is **parallel and independent** — it does not replace:

- `.github/workflows/automations.yml` + `ec2-automations.yml` — the
  EC2/GCP-scheduler lane (needs AWS secrets, documented BLOCKED),
- `apps/agents/whatsapp-multi-session/` — the 8-line OpenWA worker migration.

Pick one WhatsApp lane to feed `https://sierra-estates.net/api/webhooks/whatsapp`
(with `SBR_SECRET_KEY`, admin value — see the domain-aware table in
`INBOUND_RECOVERY_CHEATSHEET.md`). When the Evolution lane is that feed, the
production heartbeat (`/api/whatsapp/health`) self-heals on the first
authenticated inbound hit.

## Honesty notes

- Restarts clear the webhook's in-memory dedup; durable dedup is the Excel
  `Dedup Key` column (documented trade-off).
- DLQ numbers are never blind-retried; clear them from
  `sierra_checkpoint.json` deliberately.
- Night shift (21:00–10:00 Cairo) pauses outbound and logs the resume time;
  inbound webhook replies still run 24/7.
