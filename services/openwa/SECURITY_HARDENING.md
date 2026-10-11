# OpenWA Gateway — Incident Analysis & Hardening Runbook

**Incident:** 2026-10-11 03:39–03:52 UTC (05:39–05:52 Cairo) — all WhatsApp lines dropped simultaneously, ~6 min partial outage, two lines required re-pairing.

**Scope:** analysis performed off-box (read-only HTTP probes + static source analysis of OpenWA v0.23.7, tag `3a47b43`). On-box confirmation commands are included below — run them to close the loop.

---

## 1. What happened (observed timeline)

| Time (UTC) | Observation |
|---|---|
| 03:34–03:38 | Gateway healthy; 3 lines listed. `session-default` freshly pairing (qr_ready → ready during this window). |
| 03:38:40 | 3 unauthenticated GET probes to `/api/sessions/{sid}/messages/{bogus}` and `/api/sessions/{sid}/messages/{bogus}/media` → all timed out (no response at all). |
| 03:39 | `/api/health` answered but took 6.7 s (vs 0.4 s normally). `/api/sessions` returned a proper 401 with full security headers. |
| 03:39:30 | Gateway port refused connections (process down, exit code 7 / connection refused at 0.2 s). |
| 03:46–03:47 | Gateway back up (systemd `Restart=always`, `RestartSec=5`), all 3 sessions `disconnected`, `engineLoaded: false`. |
| 03:47–03:52 | Engines reloaded **sequentially**: session-default → ready (03:52), line-2 → `failed` then degraded to `qr_ready`, line-3 → `qr_ready` with phone lost. |

Blast radius: **one process death took out all 3 lines at once**, and two of the three session credential sets did not survive the abnormal restart.

## 2. Root cause analysis — honest version

### 2.1 Refuted: "unauthenticated media route crashes the gateway"

An earlier note suspected the unauthenticated `GET /api/sessions/{sid}/messages/{id}/media` probe crashed the process. **Static analysis of v0.23.7 refutes this:**

- The message controller (`src/modules/message/message.controller.ts`, prefix `sessions/:sessionId/messages`) registers exactly these GET routes: `@Get()`, `batch/:batchId`, `:chatId/history`, `:chatId/:messageId/reactions`, `:chatId/:messageId/media`.
- The probe URLs carry only 1–2 path segments after `messages` and do not match any registered pattern → Express falls through to the 404 fast path. **No service code executes.**
- The global `ApiKeyGuard` returns 401 promptly for matched routes without a key (verified live: `/api/sessions` → immediate 401 with helmet headers).
- The global `ProxyAwareThrottlerGuard` rate-limits by resolved client IP, so even a burst is throttled.
- Unhandled promise rejections are **logged, not fatal** (`registerUnhandledRejectionHandler` keeps the process up by design); only uncaught synchronous exceptions exit the process, and no handler runs on an unmatched route.

Conclusion: the probes could not have executed gateway code. They were bystanders.

### 2.2 Confirmed (most probable): memory-pressure death during concurrent engine load

- `EngineRegistry` (`src/engine/engine-registry.service.ts`) is a `Map<sessionId, IWhatsAppEngine>` **inside one Node process** — each whatsapp-web.js session is a full Chromium/Puppeteer browser. 3 lines = 3 Chromium instances in one process.
- The wedge pattern — responses slowing (6.7 s health), then abrupt process death, then clean restart — is the classic signature of **kernel OOM kill under a Chromium launch memory spike** (swap thrash → kill → systemd restart).
- The trigger window coincides exactly with `session-default` completing a fresh pairing (new engine + Chromium launch) while two other engines were live and the pairing portal was polling QR every 5 s.
- No memory guardrails exist in the shipped `openwa.service` unit (no `MemoryMax`, no swap requirement).

### 2.3 Architectural fact (source-verified)

> One process hosts ALL session engines. Any single OOM/crash — from any line's engine launch, a media burst, or a Chromium leak — takes down every line simultaneously, and engines then reload **sequentially** (~2 min each), extending the outage.

## 3. On-box confirmation (operator, read-only)

```bash
# Was it OOM? (Cairo = UTC+3 → incident window 05:39–05:52 local)
dmesg -T | grep -iE 'oom|killed process' | less
journalctl -u openwa --since '2026-10-11 05:35' --until '2026-10-11 06:00' --no-pager | less

# How many times has it restarted since boot?
systemctl show openwa -p NRestarts -p ActiveEnterTimestamp

# Memory reality check (each wwebjs engine ≈ 500–700 MB RSS + ~300 MB process base)
free -h; df -h /dev/shm; ps -o pid,rss,cmd -C node
```

If `dmesg` shows an OOM kill of the openwa main PID in that window, root cause §2.2 is confirmed. If instead the journal shows an uncaught exception, capture the stack — that would be an upstream bug worth reporting with the log attached.

## 4. Hardening recommendations

### 4.1 systemd resource guards (drop-in — do not edit the unit in-place)

`/etc/systemd/system/openwa.service.d/hardening.conf` (tune to box size; example for an 8 GB box with 3 lines):

```ini
[Service]
# Soft ceiling: throttle + reclaim before the kernel kills us
MemoryHigh=6G
# Hard ceiling: a cgroup-internal OOM beats a whole-box OOM that takes runner + SSH with it
MemoryMax=7G
MemorySwapMax=1G
# Slower bounce so a crash-loop under memory pressure does not flap every 5 s
RestartSec=15
StartLimitBurst=3
StartLimitIntervalSec=120
```

Then `systemctl daemon-reload && systemctl restart openwa`. Rationale: `MemoryMax` does not prevent the process from dying under a true spike — it confines the blast radius to the gateway cgroup instead of the whole box (the runner lives on the same host and must stay up to send alerts).

### 4.2 Swap (absorb Chromium launch spikes)

Chromium engines spike on launch then settle. A small swap file turns "OOM kill" into "slow launch":

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10 && echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

### 4.3 Per-browser memory ceiling

`PUPPETEER_ARGS` (gateway env) already defaults to `--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu`. Add a per-Chromium JS heap ceiling:

```
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu,--js-flags=--max-old-space-size=512
```

### 4.4 Capacity rule of thumb

Per line budget ≈ 700 MB (engine + browser) + 300 MB process base. Do not run more lines than `RAM − 1.5 GB headroom` supports. For more than 3–4 lines, isolate blast radius with one OpenWA container per line (`infra/openwa/docker-compose.yml` pattern) using `mem_limit` per service instead of scaling a single process.

### 4.5 Network exposure (both ports currently answer 0.0.0.0/0)

- Restrict `:2785` (gateway API) and `:2786` (runner/pairing portal) in ufw to the operator IP + Vercel egress ranges, or front them with nginx/Caddy providing TLS — the API keys currently transit cleartext HTTP to a raw IP (known finding, §8 of the production readiness report).
- If fronted by a proxy, set `TRUSTED_PROXIES=<proxy-ip>` on the gateway so `ProxyAwareThrottlerGuard` keys rate limits per real client (otherwise one abuser throttles everyone — the exact self-DoS the guard documents).

### 4.6 Session credential resilience

Two of three credential sets did not survive the abnormal restart (lines degraded to `qr_ready`; one lost its phone binding). Actions:

- Back up the gateway `DATA_DIR` after **every** successful pairing (README §2 already mandates this — make it a cron with the same cadence as the runner's sentinel).
- Keep `06-gateway-sentinel` escalation email configured (`WF_ALERT_EMAIL_TO`) — it is the existing mechanism that would have paged the operator for this incident.

### 4.7 Post-incident pairing mechanics (observed)

- Pairing-code mint (`POST /pair/code?s={id}`) succeeds for sessions with a known phone binding but times out for sessions whose phone is null — for those, the QR path on the pairing portal is the reliable fallback.
- Codes expire within minutes; mint a fresh one immediately before use rather than reusing an old code.

## 5. Monitoring hook

The runner already probes gateway health. To also catch memory pressure before it kills the process, add a swap/memory check to the sentinel's probe (e.g. alert when `MemoryCurrent` of the openwa cgroup exceeds `MemoryHigh` for 3 consecutive probes):

```bash
systemctl show openwa -p MemoryCurrent --value
```

---

*Analysis artifacts: probe transcripts and source citations from OpenWA v0.23.7 (`rmyndharis/OpenWA`, tag `3a47b43`) — message controller route table, `engine-registry.service.ts`, `process-error-monitor.ts`, `proxy-aware-throttler.guard.ts`, `configuration.ts` (PUPPETEER_ARGS).*
