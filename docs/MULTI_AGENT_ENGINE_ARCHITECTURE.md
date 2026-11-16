# Sierra Estates · Autonomous Multi-Agent Engine Architecture

This document formalizes the dedicated **Autonomous Agent Engine Topology** for Sierra Estates. Each core subsystem has a designated agent responsible for monitoring its performance, executing self-healing recovery actions, resolving edge-case data corruptions, and continuously optimizing operations.

---

## Architecture Overview

```
                   ┌───────────────────────────────────────┐
                   │    SIERRA ESTATES CONTROL PLANE      │
                   │      (Amphion Sentinel & MCD)         │
                   └──────────────────┬────────────────────┘
                                      │
     ┌────────────────────────────────┼────────────────────────────────┐
     │                                │                                │
┌────▼─────────────┐       ┌──────────▼──────────┐       ┌─────────────▼────┐
│   ENGINE 1       │       │      ENGINE 2       │       │    ENGINE 3      │
│ Gateway Sentinel │       │   Phone Sanitizer   │       │ Owner Outreach & │
│      Agent       │       │ & Silent Verifier   │       │   Stage-9 Closer │
│  (Port :2785)    │       │     (Workflow 11)   │       │   (Workflow 09)  │
└────┬─────────────┘       └──────────┬──────────┘       └─────────────┬────┘
     │                                │                                │
     │ WhatsApp Socket                │ Silent Check                   │ Rotating 30m
     │ Health & Line                  │ Whitelist /                    │ 25 Msgs/Slot
     │ Auto-Restart                   │ Blacklist                      │ Closing AI
     ▼                                ▼                                ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           CORE INFRASTRUCTURE                             │
│       • Supabase Postgres & Storage (https://gaxfqcietzoonlmatiot...)     │
│       • Google Master Inventory Sheet (gid: 1127958606)                  │
│       • OpenWA Multi-Session Gateway (4 to 8 Lines Active)               │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
     ┌────────────────────────────────┴────────────────────────────────┐
     │                                                                 │
┌────▼─────────────┐                                      ┌────────────▼─────┐
│   ENGINE 4       │                                      │    ENGINE 5      │
│  Inventory, GIS  │                                      │  Property Finder │
│   & Harvester    │                                      │   Syndicator     │
│  (Workflow 08)   │                                      │  (OpenAPI 3.1)   │
└──────────────────┘                                      └──────────────────┘
```

---

## 1. Engine 1 · WhatsApp Gateway Sentinel Agent (`sierra-gateway-sentinel`)

- **Domain**: OpenWA Multi-Session WebSocket Server (`apps/agents/whatsapp-multi-session/worker.js`, Port `2785`).
- **Primary Mission**: Ensure 100% availability of the 4/8 WhatsApp lines, monitor session states (`ready`, `scan_qr`, `starting`, `error`), and balance traffic.
- **Autonomous Capabilities**:
  - **Auto-Restart**: If a line enters `error` or disconnected state, triggers `POST /api/sessions/:id/restart`.
  - **Dynamic Session Benching**: When a session encounters transient network errors, benches it for 2 minutes and routes outbound messages to the remaining active lines.
  - **QR Code Watchdog**: Detects if a session requires re-pairing and exposes `/api/sessions/:id/qr.png` for operator recovery.
- **Health Check Hook**: `GET http://127.0.0.1:2785/api/health` and `GET http://127.0.0.1:2785/api/sessions`.
- **Target KPI**: 0% message drop rate, >99.5% line uptime during 10:00 AM – 10:00 PM Cairo active hours.

---

## 2. Engine 2 · Contact Sanitizer & Silent Verifier Agent (`sierra-phone-sanitizer`)

- **Domain**: Phone normalization (`workflows/lib/phone-utils.js`) and silent pre-flight validation (`workflows/11-number-verifier/verify.js`).
- **Primary Mission**: Eliminate data corruption in owner phone numbers, strip duplicate country codes, and verify WhatsApp account existence before daytime messaging.
- **Root-Cause Fixes Deployed**:
  - **Normalization**: Strips duplicate country code `202010...` -> `2010...`, duplicate 2 prefix `22010...` -> `2010...`, and formula errors `20010...` -> `2010...`.
  - **Silent Probe**: Calls gateway `POST /api/check-number` (`checkNumberStatus`) at night without sending any text message.
  - **Cache Segregation**:
    - `workflows/.state/verified-whatsapp-numbers.json` (Whitelisted for immediate daytime dispatch).
    - `workflows/.state/invalid-whatsapp-numbers.json` (Blacklisted landlines/dead numbers; skipped with 0s penalty).
- **Target KPI**: Zero failed outreach dispatches due to malformed phone numbers or non-WhatsApp numbers.

---

## 3. Engine 3 · Owner Outreach & Stage-9 Closer Agent (`sierra-closer-agent`)

- **Domain**: Rotating outreach engine (`workflows/09-owner-outreach/outreach.js`) and bilingual conversational closer (`apps/agents/sierra-estates-bot`).
- **Primary Mission**: Execute 25 owner contacts per 30-minute slot (10:00 AM – 10:00 PM Cairo), handle incoming owner responses, qualify property availability, and guide deals to scheduled viewings.
- **Autonomous Capabilities**:
  - **Anti-Ban Pacing**: Enforces 30–40s jitter per line during sends; drops to 1s delay on invalid skipped numbers.
  - **Bi-Directional Walker**: Front-to-back and back-to-front cursors meet in the middle, preventing collisions across multiple host instances.
  - **5-Stage Closing Workflow**: Executes Arabic greeting, availability qualification, photo request, price verification, and viewing booking.
- **Target KPI**: Exactly 25 successful messages sent per 30-minute slot, with verified audit logging in Supabase `public.contact_audits`.

---

## 4. Engine 4 · Inventory, GIS & Omnichannel Harvester Agent (`sierra-map-agent`)

- **Domain**: Inventory synchronization (`workflows/08-units-sync/sync.js`) and media extraction (`scripts/import-whatsapp-chat.mjs`).
- **Primary Mission**: Synchronize properties between Google Sheet (gid `1127958606`), Supabase `public.units` and `public.listings`, and the client-facing GIS interactive map.
- **Autonomous Capabilities**:
  - **Pristine Sheet Generator**: Formats and cleans columns, generates compound dropdowns, and locks data validation rules.
  - **GIS Boundary Resolver**: Assigns New Cairo compound coordinates, polygons, and zone tags (Golden Square, 5th Settlement, Northern 90, etc.).
  - **Media Harvester**: Groups multi-message photos from broker groups, filters Property Finder resolution gates (>= 800x600 px), and uploads to Supabase Storage.
- **Target KPI**: <5 minute sync lag between Google Sheet updates and Supabase/Map presentation.

---

## 5. Engine 5 · Property Finder Syndication Agent (`property-finder-syndicator`)

- **Domain**: Ad quality gate (`workflows/lib/pf-approval-studio.html`, `apps/api`) and Property Finder Atlas OpenAPI 3.1 connector.
- **Primary Mission**: Enforce Property Finder's strict portal listing requirements (>= 6 high-res photos, bilingual copy, accurate pricing) and syndicate verified ads.
- **Autonomous Capabilities**:
  - **Quality Gatekeeper**: Blocks ads with <6 photos or low dimensions from syndication.
  - **Institutional Copywriter**: Generates high-polish bilingual Arabic/English property descriptions with compound amenities and price breakdowns.
  - **Admin Studio**: Provides interactive visual review interface (`/admin/pf-approval`) for one-click broker sign-off.
- **Target KPI**: 100% compliance with Property Finder portal ingestion rules and zero rejected feeds.

---

## Self-Healing & Diagnostic Commands

Each engine can be audited, restarted, or tested independently:

```bash
# Engine 1: Check WhatsApp Gateway Pool & Sessions
curl -s http://127.0.0.1:2785/api/health
curl -s http://127.0.0.1:2785/api/sessions

# Engine 2: Run Silent Pre-Flight Number Verification (Night-Time)
node workflows/11-number-verifier/verify.js 50

# Engine 3: Test Owner Outreach Dry-Run
WF_DRY_RUN=1 node workflows/09-owner-outreach/outreach.js

# Engine 4: Run Bidirectional Sheet-DB Inventory Sync
node workflows/08-units-sync/sync.js

# Run Full System Test Suite
pnpm vitest run workflows/__tests__/
```
