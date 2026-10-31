# Antigravity Agent — Sierra Estates Local PC Handoff (2026-10-31)

> **Purpose:** everything below runs on the owner's Windows PC and cannot be
> executed from the cloud assistant. Work top to bottom, report every step.
> The cloud side is already DONE and merged to `main` (PR #37: 03:00 Cairo
> morning briefing with campaign results + 09:00 lane opening; lockfile fix).
>
> Repo: `github.com/afawzy886619888866-cloud/Sierra-Estates` (local clone on
> this PC). Work ONLY on `main`; do not open feature branches for these ops.

---

## Task 0 — Sync the repo

```
git pull origin main
git log -1 --oneline
```

The last commit must include the **PC auto-start kit** (`ENABLE-AUTO-START.bat`,
`sierra-autostart.bat`, `DISABLE-AUTO-START.bat`). If not, stop and report.

**Hard rules:** never modify committed schedules (`0 3 * * *`, `*/30 9-21 * * *`),
never change any client-facing phone number (01092048333 is the only one),
never commit `infra/.env` or any secret, never force-push.

## Task 1 — Keys in `infra\.env` (copy from `infra\.env.example` if missing)

- `OPENWA_ADMIN_API_KEY` — strong random value (gateway compose refuses to
  start without it)
- `RUNNER_API_KEY` — strong random value (runner control API; fail-closed)
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — required for telemetry;
  without them the scheduler stays idle (fail-closed by design)
- `WF_DIGEST_TO=201092048333` — the 03:00 briefing lands on the owner's phone
- **Check `WF_OUTREACH_ACTIVE_HOURS`**: it must be `9-22` or absent.
  A stale `10-20` / `10-22` pin here would silently re-close the 9 AM lane
  even though every code default now says 9-22. Delete the line if unsure.

Generate keys with:
```
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

## Task 2 — Rebuild + start the stack (Docker Desktop must be running)

```
docker compose -f infra/docker-compose.rag-station.yml up -d --build
docker compose -f infra/docker-compose.runner.yml up -d --build
```

`--build` matters: plain `up -d` reuses the OLD image and the container would
keep the 10:00 gate + 08:00 digest. First build takes minutes. Then:

```
docker ps
```

Both `sierra-whatsapp-rag-station` and `sierra-workflow-runner` must be
`Up (healthy)`.

## Task 3 — Pair the WhatsApp business line


> [!IMPORTANT]
> **FLAGSHIP LINE PROTECTION:** `line-2` (`201092048333`) is reserved exclusively for
> client conversations and the 03:00 morning briefing. It is completely removed from
> the campaign outreach rotation (`OPENWA_SESSION_IDS=line-1,line-3,line-4,line-5,line-6,line-7,line-8`).
> Never add line-2 to outreach. Never pair `201031622600`.


Open `http://localhost:2785` (pairing dashboard) and scan the QR **with the
phone that owns 01092048333** — that is `line-2` / `201092048333`, the
business line, the one to scan.

- Do **NOT** pair `201031622600` (second line, not for scanning).
- The session must reach status **ready**.
- Only pair more lines if the owner asks.

## Task 4 — Verify the runner and the migrated schedules

```
curl http://127.0.0.1:2786/api/health
curl -H "X-API-Key: <RUNNER_API_KEY>" http://127.0.0.1:2786/api/workflows
```

Health must return ok. In the workflows list:

- `daily-digest` schedule must read `0 3 * * *` (name: Morning Ops Briefing)
- `owner-outreach` schedule must read `*/30 9-21 * * *`

The runner auto-migrates old defaults at boot. If either row still shows the
old value, restart the runner container once
(`docker compose -f infra/docker-compose.runner.yml restart`) and re-check.

## Task 5 — Preview the morning briefing NOW (don't wait for 03:00)

```
curl -X POST -H "X-API-Key: <RUNNER_API_KEY>" http://127.0.0.1:2786/api/workflows/daily-digest/run
```

The Arabic briefing must arrive on WhatsApp 01092048333 within a minute:
gateway health, automation status, **campaign results (24 h sends)**, new
leads, new units. If nothing arrives, check
`docker compose -f infra/docker-compose.runner.yml logs -f` for
`morning-briefing` errors (most likely: `WF_DIGEST_TO` not set, or the
session not paired/ready).

## Task 6 — Enable auto-start at PC logon

Run **`ENABLE-AUTO-START.bat`** once (no admin needed). It registers
`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SierraEstates-AutoStart.cmd`.

- Test immediately: double-click `sierra-autostart.bat` — it must end with
  `STACK IS UP - gateway :2785, runner :2786`
- Boot log lives at `.state\autostart.log`
- In Docker Desktop → Settings → General, also tick
  **"Start Docker Desktop when you sign in"**
- Optional final proof: reboot once and confirm both containers come back.

## Task 7 — EC2 retirement (browser console; the AWS CLI keys are dead)

Follow `infra/aws/RETIRE-EC2-CHECKLIST.md` top to bottom. Short version:

1. **Gate first:** only after the 03:00 briefing has arrived green on TWO
   different mornings with `docker-runner:*` labels
2. Archive: EC2 → Instances → `i-0be8ff8c5cfba7363` → Actions → Image and
   templates → **Create image** → name `sierra-ec2-archive-2026-10-31`
   (this is what lets a future free-credits account relaunch everything)
3. **Stop** the instance now (cheap rollback window, ~$0.80/month)
4. After 1–2 green weeks: **Terminate** it + **Release** Elastic IP
   `18.232.148.172` (unattached EIP ≈ $3.6/month)
5. Delete `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` from Vercel env vars
   and GitHub Actions secrets

## Report back in this exact format

```
Task 0 sync:        PASS/FAIL  (git log -1)
Task 1 env keys:    PASS/FAIL  (which were missing)
Task 2 stack up:    PASS/FAIL  (docker ps status)
Task 3 pairing:     PASS/FAIL  (line + status)
Task 4 schedules:   PASS/FAIL  (digest / outreach rows)
Task 5 briefing:    PASS/FAIL  (delivered to 01092048333? y/n)
Task 6 auto-start:  PASS/FAIL  (startup entry + test run)
Task 7 EC2:         DONE/PARTIAL/SKIPPED (AMI created? instance stopped?)
```

End the report with one line: whether the stack now autostarts at logon,
whether the 03:00 briefing is armed for tomorrow, and whether the 09:00
outreach slot will fire.
