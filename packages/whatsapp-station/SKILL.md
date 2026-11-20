# Skill: WhatsApp Listing Station

**Name:** `whatsapp-listing-station`
**Package:** `@sierra-estates/whatsapp-station`
**Type:** Agentic skill (harness + RAG + scraper) · portable — embeddable in ANY app (Sierra admin, Antigravity, n8n, a CLI).

---

## What it does

Turns raw WhatsApp broker chatter into staged inventory:

1. **Connect** — pairs to the owner's WhatsApp through the OpenWA gateway (QR screen in the admin *WhatsApp Station* window, session kept by the gateway; a second standalone session is never created → **account-ban safe**), or reads chat exports from the phone plugged in by **USB (File transfer/MTP)**.
2. **Scrape** — runs named broker-group deep queries (e.g. `داتا ايمان`) plus a recent-messages sweep across all live gateway lines.
3. **Extract** — canonical parse engine: 26-compound gazetteer (Mivida, Hyde Park, Madinaty…), Arabic/English price, area, rooms, deal type, media grouping, posted-date parsing, institutional `SE-WA-XXXXXXXX` codes, buyer-request filtering.
4. **Stage** — upserts `public.listing_waiting_list` (dedup on `dedup_hash`, statuses PENDING / APPROVED / REJECTED / IMPORTED).
5. **RAG** — embeds each row (`gemini-embedding-001`, 768-d, same vector space as live inventory) so the triage window can find similar live units; honest degrade when `GEMINI_API_KEY` is absent.
6. **Approve → publish** (admin window) — approve creates the `public.listings` row, the publish gate decides Property-Finder ad eligibility, the row is appended to the Google Sheet tab, and the public site + Leaflet map pick it up automatically (RLS gate: `publish_status='PUBLISHABLE'`).

**Privacy lock (hard):** full broker/owner phone numbers never leave `extraction-engine.mjs` — only `***last-7` masks and the canonical confidential contact `01092048333` travel downstream.

---

## Add to any app (3 steps)

```bash
# 1. copy the skill folder + its one dependency into the target repo
cp -r packages/whatsapp-station  <app>/skills/whatsapp-station
mkdir -p <app>/workflows/21-usb-phone-harvester
cp  workflows/21-usb-phone-harvester/parse-engine.mjs  <app>/workflows/21-usb-phone-harvester/

# 2. env (values only, never commit)
OPENWA_GATEWAY_URL=http://127.0.0.1:2785   # OpenWA multi-session gateway
OPENWA_ADMIN_API_KEY=***                   # gateway X-API-Key
SUPABASE_URL=https://gaxfqcietzoonlmatiot.supabase.co
SUPABASE_SERVICE_ROLE_KEY=***
GEMINI_API_KEY=***                         # optional — enables RAG vectors

# 3. run
node skills/whatsapp-station/src/index.mjs --health
node skills/whatsapp-station/src/index.mjs            # live sweep
node skills/whatsapp-station/src/index.mjs --usb /mnt/phone/WhatsAppExport
```

**Agent harness contract** (same as `packages/agents-core` `BaseAgent`):

```js
import { WhatsAppStationAgent } from '@sierra-estates/whatsapp-station';
const agent = new WhatsAppStationAgent();
const result = await agent.execute({ trigger: 'manual' });
// result: { success, exit: 0|1|2, steps: [{step,status,detail}], data: {staged, parsed, groups, rag} }
```

---

## API surface (Sierra admin)

| Endpoint | Purpose |
| --- | --- |
| `GET/POST /api/admin/whatsapp-station` | station status (gateway/QR/counts) · `action: scrape \| usb-import` |
| `GET/POST /api/admin/waiting-list` | waiting rows · `action: approve \| reject \| similar` (RAG) |
| `workflows/22-whatsapp-station/index.js` | runner workflow — `post /api/workflows/whatsapp-station/run` |

## Files

```
packages/whatsapp-station/
├── SKILL.md                  ← this file
├── package.json
└── src/
    ├── index.mjs             CLI entry (--health/--usb/--similar)
    ├── station-agent.mjs     6-step agentic harness (BaseAgent-compatible)
    ├── extraction-engine.mjs privacy masking + RAG text + waiting-row map
    ├── rag.mjs               768-d Gemini embeddings + cosine retrieval
    └── usb-import.mjs        USB/MTP export harvesting
supabase/migrations/20261120_052_listing_waiting_list.sql
workflows/22-whatsapp-station/index.js
apps/sierra-estates-realty/app/api/admin/{whatsapp-station,waiting-list}/route.ts
apps/sierra-estates-realty/app/admin/views/{WhatsAppStationView,ListingWaitingListView}.tsx
```

## Reference upstream projects (studied, not vendored)

- situmorang-com/Whatsapp-Group-Contacts-Scraper — group-contact sweep model
- SlavyanDesu/BocchiBot — session/QR lifecycle patterns
- erfan4lx/WhatsApp-Group-Contacts-Scraper — contact extraction fields

Both are Baileys/whatsapp-web.js second-session bots; Sierra uses the OpenWA
gateway instead because a second WhatsApp Web session on the owner's SIMs is a
severe account-ban risk (workflow 01 documents the same decision).
