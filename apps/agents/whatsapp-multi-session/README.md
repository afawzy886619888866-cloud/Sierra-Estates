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
