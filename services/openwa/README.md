# OpenWA WhatsApp Gateway — Sierra Estates runbook

**What this is:** the self-hosted WhatsApp engine from
[`github.com/rmyndharis/OpenWA`](https://github.com/rmyndharis/OpenWA)
(v0.23.7, MIT, Node ≥ 22.19) installed as the **primary outbound transport**
for Sierra Estates, replacing the Meta Cloud API / Twilio sending dependency
with your own QR-paired WhatsApp Web session exposed over plain HTTP.

**Why:** no Meta WABA approval, no Twilio per-message billing, no
`WHATSAPP_META_TOKEN` credential risk — the gateway speaks the exact contract
`lib/server/twilio-client.ts` already implements as its gateway channel:

```
POST {WHATSAPP_API_URL}/api/sessions/{OPENWA_SESSION_ID}/messages/send-text
X-API-Key: {WHATSAPP_API_TOKEN}
{"chatId": "<phone>@c.us", "text": "..."}
```

Provider priority in code (unchanged): Twilio (skipped — no real creds) →
**OpenWA gateway (this service)** → dev simulation. With Twilio creds absent,
every queued send lands on this gateway the moment the env vars below are set.

---

## 1. Install (on the gateway host — VPS / EC2 / always-on box)

> ⚠️ The gateway is a long-running browser-automation process. It can NOT run
> on Vercel serverless. Run it on any always-on host; the Next.js app on
> Vercel calls it over HTTP.

### Quick install (fresh Ubuntu 22.04/24.04 VPS — one command)

```bash
git clone https://github.com/sierrablue8866-droid/SE-Vercel-deploy-main.git /opt/se
bash /opt/se/services/openwa/bootstrap-vps.sh
```

Installs Node 22 + Chromium libs, the gateway into `/opt/openwa`, a
systemd unit (auto-restart + boot-enabled), and opens only SSH + 2785 in
ufw. Ends with the pairing / API-key / Vercel-env checklist.

### Manual install

```bash
# on the gateway host, from a checkout of SE-Vercel-deploy-main:
bash services/openwa/setup.sh                       # installs into ./openwa
# or elsewhere / pinned:
OPENWA_DIR=/opt/openwa OPENWA_REF=v0.23.7 bash services/openwa/setup.sh
```

The script: clones the tagged release from GitHub → `npm ci` → copies
`env.openwa.example` → builds. Docker alternative:
`docker compose -f docker-compose.dev.yml up -d` inside the cloned repo.

Keep it alive: `services/openwa/openwa.service` is a systemd unit
(edit `WorkingDirectory`, then `systemctl enable --now openwa`).

## 2. Pair WhatsApp (one time)

1. Open `http://<host>:2785` — dashboard + API on the same port.
2. First login uses the seeded dev key (`ALLOW_DEV_API_KEY=true` in `.env`).
   **Create a real admin API key** (dashboard → API Keys, or
   `POST /api/auth/api-keys`), then set `ALLOW_DEV_API_KEY=false` + restart.
3. Create a session (`POST /api/sessions`, e.g. id `session-default`) and scan
   the QR with the **Sierra Estates business WhatsApp number**.
4. Session credentials persist in `DATA_DIR` — back that directory up;
   losing it means re-scanning the QR.

## 3. Wire the app (Vercel project env vars)

| Variable             | Example value                  | Meaning                          |
|----------------------|--------------------------------|----------------------------------|
| `WHATSAPP_API_URL`   | `http://<gateway-host>:2785`   | gateway base URL                 |
| `WHATSAPP_API_TOKEN` | `sk-...` (the real API key)    | sent as `X-API-Key`              |
| `OPENWA_SESSION_ID`  | `session-default`              | which paired session sends      |

Redeploy. That's the whole integration — `sendWhatsApp()` now delivers
through the gateway; queue, quotas, operating hours (12:00–20:00 Africa/Cairo)
and scheduled sends keep working exactly as before. Verify with:

```bash
curl -s http://<host>:2785/api/health
curl -s http://<host>:2785/api/sessions -H "X-API-Key: $KEY"
```

## 4. Scheduled sender — how it activates

The queue side needs **nothing new**: `whatsapp_queue.scheduledFor` (set via
`POST /api/admin/whatsapp/schedule`) defers jobs; the drain sends them when
due. What changed in this repo to make scheduling *actually fire*:

1. **Webhook piggyback** — every authenticated inbound WhatsApp hit drains due
   jobs ~2 s later (`piggybackWhatsAppDrain()` in `whatsapp-drain.ts`,
   in-flight-guarded). Live conversations during the 12–20 window dispatch
   scheduled sends within seconds.
2. **External hourly cron (recommended)** — point any uptime pinger /
   cron-job.org / GHA runner at:
   `GET https://sierra-estates.net/api/cron/whatsapp-dispatch`
   with header `Authorization: Bearer $CRON_SECRET` (fails closed).
3. **GitHub Actions** — the `whatsapp-dispatch` job is already registered in
   `lib/server/automation-jobs.ts` (hourly, 30-min dedupe) and resumes the
   moment the account spending limit is lifted.

Quota guardrails stay active per sender: 40/window-hour, 80/day
(`DEFAULT_OUTREACH_CONFIG` in `lib/server/whatsapp-queue.ts`).

## 5. Mandatory disclaimer (non-negotiable)

Every client-facing queued send passes through `enforceOutreachNotice()` at
the drain choke point: campaign broadcasts and custom outreach **always** end
with the exact Arabic Booking & Contracting notice (char-for-char from
`announcement/DISCLAIMER.txt`); other client-facing purposes carry it when
Cairo Plaza / El-Mataria is mentioned; owner-side B2B negotiations stay
exempt (established policy). Sends already wrapped upstream are detected and
never double-wrapped. `announcement/verify_disclaimer.py` must stay 32/32.

## 6. Safety notes (WhatsApp ban risk)

Use opted-in recipients (the queue is built from CRM leads/negotiations, not
scraped lists), stay inside the configured operating window and caps, prefer a
residential IP / proxy for the gateway host, and warm the number gradually
after first pairing. The gateway's own docs cover per-session proxy settings.

## 7. Local install proof (sandbox-verified 2026-09-30)

v0.23.7 was installed and exercised end-to-end during integration (Node 24):

- `git clone` + `npm ci` (1029 packages) + `nest build` — clean.
- `GET /api/health` → `{"status":"ok"}`; engine `whatsapp-web.js`, sqlite persistence.
- `X-API-Key: dev-admin-key` accepted (`ALLOW_DEV_API_KEY=true` bootstrap).
- `POST /api/sessions {"name":"session-default"}` → session created
  (`status: created`, `engineLoaded: false` — QR pairing pending, as expected
  without a phone).
- `POST /api/sessions/session-default/messages/send-text` → `400 "Session
  'session-default' is not active..."` — the route exists and matches the
  app's gateway contract exactly; real dispatch is blocked ONLY on the QR scan
  the owner performs on the gateway host.
