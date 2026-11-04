# ANTIGRAVITY PROMPT — WhatsApp Gateway Activation (2026-11-03)

> Paste everything below the line into Antigravity (agent mode) with the
> Sierra-Estates repo open on the Windows machine that runs the WhatsApp
> worker. The agent can do every step except the physical QR scan.

---

## MISSION

Activate the Sierra Estates 8-line WhatsApp gateway: the local worker
(`apps/agents/whatsapp-multi-session`, port 2785) must be exposed to the
Vercel production app through a cloudflared tunnel, and both Vercel projects
must be re-pointed at it. Everything is already built and deployed — the
admin console at https://admin.sierra-estates.net/admin/whatsapp (ITQANE-style
Command Center) currently shows "Gateway Offline" honestly; your job is to
make it turn green.

Current production state you must flip:
- https://sierra-estates.net/api/whatsapp/health → `{"status":"stale","ok":false}`
  (dark since 2026-10-31, when the legacy EC2 54.89.162.250 died — it is
  RETIRED; do not reference it anywhere)
- Target after this run: `status: live / syncing`, `ok: true`, console wall
  green per paired line.

## FACTS (verified — do not rediscover)

- Repo: `Sierra-Estates`, branch `main` (HEAD ≈ 20d6d9e89). All code is DONE —
  do NOT write code, do NOT commit or push anything.
- Worker: `apps/agents/whatsapp-multi-session` — Express + OpenWA, 8 sessions
  `line-1` … `line-8`, port **2785**, auth header `X-API-Key`.
- Worker start (repo root): `start-openwa-8lines.bat` (or `pnpm openwa:8lines`;
  first run installs deps). Dashboard: `http://localhost:2785`.
- Worker key: `OPENWA_ADMIN_API_KEY` in the worker's `.env` — default
  `sierra-admin-secret`. Read it from the worker `.env` if present.
- Worker endpoints: `GET /api/health`, `GET /api/sessions`, portal `GET /pair`,
  `GET /api/pair/status`, `GET /api/pair/info`.
- Pairing portal (mobile-friendly): `http://localhost:2785/pair` — per-line QR
  cards, EN/AR. Phone numbers are NOT exposed there.
- Vercel team: `sierrablue8866-1492`; projects: `sierra-estates-client-portal`
  AND `admin-dashboard` (both must always be updated together).
- Git auto-deploy is QUOTA-BLOCKED on the Hobby plan (every push shows
  BLOCKED). Bypass: `POST https://api.vercel.com/v13/deployments?teamId=sierrablue8866-1492&skipAutoDetectionConfirmation=1`
  with body `{"name":"<project>","target":"production","gitSource":{"type":"github","repoId":1423151160,"repoOwner":"afawzy886619888866-cloud","repoSlug":"Sierra-Estates","ref":"main"}}`
  and header `Authorization: Bearer <VERCEL_TOKEN>`.
- A ready-made activation script is provided alongside this prompt:
  `Activate-WhatsAppGateway.ps1` — save it from the chat/download next to this
  file (repo root is fine; it is NOT committed to git). Params: `-TunnelUrl`,
  `-GatewayKey`, `-VercelToken`, `-Mode All|EnvUpdate|Deploy|Verify`.
  Prefer running it over hand-rolling the API calls; hand-roll only if it fails.

## STEP-BY-STEP

### 1 · Preflight
- Confirm repo clean and on `main` (`git status`, `git log --oneline -1`).
- Confirm `node`, `pnpm`, and `cloudflared` are on PATH. If cloudflared is
  missing: `winget install --id Cloudflare.cloudflared -e`.
- Get the Vercel token from the user (needs `vcp_` prefix, scopes: team
  `sierrablue8866-1492`). Ask them to paste it from
  https://vercel.com/account/settings/tokens — never echo it into logs.

### 2 · Start the worker
- Launch `start-openwa-8lines.bat` (or `pnpm openwa:8lines`) in a persistent
  background process — it must keep running after this session.
- EXPECTED "STUCK-LOOKING" BEHAVIOR: this command NEVER exits (by design),
  and the first run installs dependencies + 8 Chromium instances — up to
  5–10 minutes of no output. Do not kill it; poll instead.
- Poll `http://localhost:2785/api/health` (header `X-API-Key: <worker key>`)
  until HTTP 200 (up to ~3 min; first boot starts 8 Chromium instances,
  staggered 3.5 s apart).
- `GET /api/sessions` should list 8 sessions (initially `qr_ready` —
  unpaired is expected at this stage).

### 3 · Start the tunnel
- Run: `cloudflared tunnel --url http://localhost:2785` (background,
  persistent — keep the process alive).
- EXPECTED "STUCK-LOOKING" BEHAVIOR: cloudflared NEVER exits (by design).
  The `https://<random>.trycloudflare.com` URL appears inside its output
  box after ~5 seconds — extract it from the running process's output/log
  (it is printed repeatedly in the INFO block), do NOT wait for the command
  to finish. Never run it in the foreground of your own shell unless you
  background it properly.
- Verify: GET `<TUNNEL>/api/health` returns 200 with the same key header.

### 4 · Point production at the tunnel (BOTH projects)
Run the prepared script once per run (adjust the path to where you saved it):
```powershell
powershell -ExecutionPolicy Bypass -File .\Activate-WhatsAppGateway.ps1 `
  -TunnelUrl <TUNNEL> -GatewayKey <WORKER_KEY> -VercelToken <VERCEL_TOKEN>
```
It patches on BOTH projects: `WHATSAPP_API_URL=<TUNNEL>`,
`OPENWA_HOST=<bare tunnel host>`, `WHATSAPP_GATEWAY_HOST=<bare host>`,
`OPENWA_ADMIN_API_KEY` / `WHATSAPP_API_KEY` / `WHATSAPP_API_TOKEN` =
worker key; then triggers both production deploys via the API bypass and
waits for READY (2–7 min).

If you must hand-roll instead, the env endpoint is
`GET/PATCH/POST https://api.vercel.com/v9/projects/<project>/env?teamId=sierrablue8866-1492`
(patch by env id; create with `target:["production","preview"], type:"encrypted"`).

### 5 · QR PAIRING — the ONE human step
- Open `http://localhost:2785/pair` (or `<TUNNEL>/pair`) on each phone.
- On the phone: WhatsApp → Settings → **Linked Devices** → **Link a Device**
  → scan that line's QR. The business line phone is **+20 109 204 8333**
  (pair it on `line-2` or whichever line is designated primary; check
  `GET /api/sessions` for which line holds which number once paired).
- 8 lines / 8 phones max; each card turns green + shows its number when
  paired. Sessions persist in `./whatsapp-auth/` across restarts.
- Tell the user clearly: "Nothing else can proceed until at least one line
  is scanned." Wait/poll `GET /api/sessions` until ≥1 session is READY.

### 6 · Post-pairing verification (must all pass)
- `GET <TUNNEL>/api/sessions` → ≥1 session READY with a phone number.
- `GET https://sierra-estates.net/api/whatsapp/health` → within ~60 s flips
  to `ok: true` (the worker pulses the heartbeat every 60 s while ≥1 line
  is READY — honest by design; it only greens from REAL pairing).
- Log in at https://admin.sierra-estates.net/admin/whatsapp → the SIM wall
  shows green cards, Line Health gauge > 0%, QR sidebar shows the /pair link.
- Send a test message via the console's Message Composer to a phone you
  control; confirm receipt and that it appears in the Outbox.

### 7 · Report back
Summarize: tunnel URL, lines paired (n/8), health JSON, console status,
and the restart caveat below.

## GUARDRAILS (hard)

- **NEVER modify or delete `SBR_SECRET_KEY`** on either project — the two
  projects hold DIFFERENT values by design, inbound auth uses the
  admin-dashboard value; touching it breaks all inbound WhatsApp traffic.
- Do not commit, push, or edit repo files — this is a runtime-ops task only.
- Do not kill the worker or cloudflared processes when the session ends;
  they must stay up. If the machine reboots, both must be restarted and
  step 4 re-run (trycloudflare URLs are EPHEMAL — each cloudflared restart
  mints a new URL; re-run the activation script with the new URL, `-Mode
  EnvUpdate` then `-Mode Deploy`, or full `-Mode All`).
- For inbound webhook forwarding, the worker's own `.env` needs
  `SBR_SECRET_KEY` = the ADMIN project's value (see
  `apps/agents/whatsapp-multi-session/README.md` §4 — copy from the
  admin-dashboard env, not the client-portal one).
- Never print tokens or keys into logs or the final report.

## SUCCESS CRITERIA

1. `https://sierra-estates.net/api/whatsapp/health` → `ok: true`
2. `/admin/whatsapp` console → green wall, n/8 lines paired
3. Test message delivered end-to-end through the composer
4. Worker + tunnel running persistently on the machine
