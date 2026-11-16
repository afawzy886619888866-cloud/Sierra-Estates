# Sierra Estates — 8-Line WhatsApp Multi-Session Gateway

Dedicated multi-session worker and HTTP gateway built directly on `@open-wa/wa-automate` ([open-wa/wa-automate-nodejs](https://github.com/open-wa/wa-automate-nodejs.git)) for Sierra Estates New Cairo real estate outreach and lead routing.

---

## 1. Overview

- **Capacity**: Manages **8 WhatsApp SIM lines** simultaneously (`line-1` to `line-8`).
- **Engine**: Headless WhatsApp Web instances via Chromium.
- **Port**: `2785` (matches Sierra Estates `WHATSAPP_API_URL=http://127.0.0.1:2785`).
- **Dashboard**: Web dashboard on `http://localhost:2785` displaying live status, auto-refreshing QR codes, and test message forms for each line.
- **Persistent Auth**: Sessions are stored under `./whatsapp-auth/line-1` through `./whatsapp-auth/line-8`. Once paired, sessions automatically resume across restarts without needing to scan QR codes again.
- **Anti-Ban Protection**: Staggered browser startup (3.5s per instance) + automated 3–5s jitter queue per line.

---

## 2. Quick Start (Windows)

1. Double click [`start-openwa-8lines.bat`](file:///h:/Sierra%20Estates/start-openwa-8lines.bat) in the repository root.
   - It will automatically install dependencies on first run.
   - It will launch the 8-line worker on port 2785.
   - It will open your web browser to `http://localhost:2785`.
2. On your phones, open WhatsApp -> **Linked Devices** -> **Link a Device**.
3. Scan the corresponding QR code shown for **SIM #1** through **SIM #8**.
4. Once connected, each card turns **GREEN (READY)** and displays the phone number.

Alternatively, from the terminal:

```bash
# Install dependencies
pnpm openwa:8lines:install

# Start the gateway
pnpm openwa:8lines
```

---

## 3. Integration with Sierra Outreach Workflows

In your `workflows/.env`:

```ini
WHATSAPP_API_URL=http://127.0.0.1:2785
OPENWA_SESSION_IDS=line-1,line-2,line-3,line-4,line-5,line-6,line-7,line-8
WF_PARALLEL_LINES=8
WF_OWNER_CONTACT_DAILY_CAP=40
```

When [`workflows/09-owner-outreach/outreach.js`](file:///h:/Sierra%20Estates/workflows/09-owner-outreach/outreach.js) or [`workflows/10-whatsapp-dispatch/dispatch.js`](file:///h:/Sierra%20Estates/workflows/10-whatsapp-dispatch/dispatch.js) runs:

- It queries `GET http://127.0.0.1:2785/api/sessions`
- It resolves all 8 lines (`line-1` .. `line-8`)
- It distributes owner outreach in parallel across the ready lines while adhering to safe per-line pacing and daily caps.

---

## 4. App Bridge — inbound webhook forwarding + heartbeat (`app-bridge.js`)

The worker forwards **every inbound message** (DMs and broker groups) to the
Sierra Estates production webhook and pulses the app heartbeat — no EC2
gateway box in the path:

```text
WhatsApp line ──► worker (this app, :2785)
                    ├─► POST https://admin.sierra-estates.net/api/webhooks/whatsapp
                    │      header: x-sbr-secret-key = ADMIN SBR_SECRET_KEY
                    │      body:   { event:'message.received', sessionId, data:{…} }
                    └─► POST https://sierra-estates.net/api/whatsapp/heartbeat (60 s, while ≥1 line READY)
```

- The app flattens the envelope, records a heartbeat, routes DMs to the
  Scribe/Laila conversation layer, and silently skips auto-replies inside
  broker groups (its own policy — the worker forwards everything and lets
  the app decide).
- Heartbeat honesty: pulses flow **only while at least one line is READY**.
  Zero paired lines ⇒ no pulses ⇒ `/api/whatsapp/health` honestly reports
  `stale` — never a fake green.
- Retries: 3 attempts (0.5 s / 2 s / 8 s backoff), fire-and-forget — an
  unreachable app can never stall WhatsApp message processing. The app
  deduplicates by message id, so retries are safe.

### Required `.env` (see `.env.example`)

```ini
SBR_SECRET_KEY=<ADMIN project value — sierra-sec…>
# SE_APP_WEBHOOK_URL=https://admin.sierra-estates.net/api/webhooks/whatsapp   # default
# SE_HEARTBEAT_URL=https://sierra-estates.net/api/whatsapp/heartbeat          # default
```

> ⚠️ **SBR_SECRET_KEY is project-scoped.** The two Vercel projects hold
> DIFFERENT values (`admin-dashboard` = `sierra-sec…`, `client-portal` =
> `sbr_e666…`). Inbound has always used the **ADMIN** value — copy that one,
> and keep the webhook URL pointed at the admin domain.

### The outbound reply loop (one more step)

DM auto-replies leave through the app's provider chain, which reaches this
worker at `WHATSAPP_API_URL`. The app runs on Vercel, so `127.0.0.1` does
not work there: when the worker runs on your machine, expose it with the
repo's cloudflared setup and set `OPENWA_HOST`/`OPENWA_PORT` (or
`WHATSAPP_API_URL`) on **both Vercel projects** to the tunnel's public URL.
Until then, inbound flows and is stored, but auto-replies fall back to the
graceful simulation provider.

---

## 5. Mobile Pairing Portal (`/pair`) — replaces the retired EC2 `:2786/pair`

The worker now hosts its own mobile-friendly pairing page, so the WhatsApp
role of the old EC2 runner is fully migrated to this local app:

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /pair` | public | Mobile portal — live QR cards for line-1 … line-8, EN/AR toggle |
| `GET /api/pair/status` | public | Minimal `{lines:[{id,status,hasQr}]}` — no phone numbers |
| `GET /api/pair/qr/:id.png` | public | Ephemeral pairing QR PNG (only while awaiting scan) |
| `GET /api/pair/info` | public | `{pairUrl}` — the portal's public URL (env or captured tunnel host) |
| `GET /api/pair/link-qr.png` | public | QR PNG encoding the portal URL (admin sidebar asset) |

The portal page is self-contained (inline CSS/JS, no build step) and polls
`/api/pair/status` every 4 s, swapping in fresh QR images only for lines that
are awaiting a scan. It exposes **no** phone numbers and **no** send
capability — pairing QR codes are ephemeral and only useful with physical
access to the WhatsApp account.

The **admin console** (`/admin/whatsapp`, ITQANE-style WhatsApp Command
Center) renders the same portal URL as a QR code in its sidebar via the
auth-guarded proxy route `GET /api/admin/whatsapp/qr?target=pair-link` —
scan it with a phone to jump straight to the pairing portal.

---

## 6. Activation Runbook (local gateway → production)

1. **Start the worker locally** (Windows):
   `start-openwa-8lines.bat` (or `pnpm openwa:8lines`) → dashboard at
   `http://localhost:2785`, pairing portal at `http://localhost:2785/pair`.
2. **Pair the lines**: on each phone, WhatsApp → Linked Devices → Link a
   Device → scan the QR at `/pair` (or from the admin console at
   `/admin/whatsapp`). Sessions persist under `./whatsapp-auth/`.
3. **Expose the worker** with the repo's cloudflared tunnel (see
   `infra/google-cloud/` notes): note the `https://….trycloudflare.com` URL.
4. **Point production at the tunnel** — on **both Vercel projects**
   (`admin-dashboard` and `client-portal`) set:
   ```ini
   WHATSAPP_API_URL=https://<tunnel-host>          # replaces 127.0.0.1:2785
   # optional pins:
   CLOUDFLARE_TUNNEL_URL=https://<tunnel-host>
   WHATSAPP_PUBLIC_URL=https://<tunnel-host>       # used by /api/pair/info
   ```
   Keep the header key in sync: the gateway expects
   `X-API-Key: $OPENWA_ADMIN_API_KEY` (default `sierra-admin-secret`).
5. **Verify**:
   - `GET https://admin.sierra-estates.net/api/admin/whatsapp/outbox` →
     `gateway.reachable: true`, `activeSessions: n/8`.
   - `/admin/whatsapp` status wall turns green per paired line; the sidebar
     QR opens `https://<tunnel-host>/pair` on the phone.
   - `/api/whatsapp/health` on the client portal flips from `stale` to
     `live` once ≥1 line is READY (honest heartbeat).

> The legacy AWS EC2 host (`54.89.162.250`) is **retired** — runners, the
> pairing portal, and the gateway now all live in this local worker plus the
> Vercel app. Historical references to the old IP remain only in execution
> reports.

