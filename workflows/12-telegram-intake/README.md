# Workflow 12 — Telegram Intake Agent (units → inventory → broadcast)

The activation of the repo's Telegram bot area as a **listing ingestion and
broadcasting pipeline**: every agent group ("Fareda units", "Christina
units", "Heba Units" …) texts/photos a new listing → the bot parses it,
sanitizes owner PII, assigns a reference code, logs it to the Master
Inventory sheet + site inventory (Supabase), confirms in the agent's group
and broadcasts the sanitized unit to the **General** group — with **no
owner name or number ever leaving the internal ledger**.

```
agent group ──┬─► parse (AR/EN, deterministic) ─► required-field gate
              │        │                              │ (bilingual ask-back)
              │        ▼                              ▼
              │   redact/extract ────────────── SE-RENT/SE-SALE code
              │   (owner phones + name                │
              │    → internal only)                   │
              │        └──────────────┬───────────────┘
              ▼                       ▼
   Master Sheet "Telegram Intake"   Master Sheet "new_units" (PENDING)
   20-col ledger (owner spec)       └► 05-unit-adder → Supabase listings
              │                          (publish_status=REVIEW_REQUIRED)
              ├──► confirmation in the agent's group (code + row #)
              └──► General group: sanitized template + 3–5 photo album
```

## 1. One-time Telegram setup

1. **Create the bot** (or reuse the existing Sierra bot): message
   [@BotFather](https://t.me/BotFather) → `/newbot` → keep the token
   `<numbers>:<random>`. **Never commit the token** (a live token was
   committed once before and had to be revoked — see
   `scripts/data-pipelines/TELEGRAM_BOT_README.md`).
2. **Group privacy off** (default): in each agent group and the General
   group, the bot must be able to SEE messages. If "Members can only send
   …" restrictions apply, make the bot an **admin** of each group.
3. Add the bot to every agent group + the General group.
4. In each group, send `/chatid` — the bot replies with the numeric chat
   id (this command works in any chat it is member of).
5. Fill `infra/.env`:

```dotenv
TELEGRAM_BOT_TOKEN=123456:AA...            # from @BotFather
TELEGRAM_AGENT_GROUP_IDS=-100111111:Fareda,-100222222:Christina,-100333333:Heba
TELEGRAM_GENERAL_GROUP_ID=-100444444        # the "General" broadcast group
# Sheet (optional — defaults to UNITS_SHEET_ID from the runner compose):
TELEGRAM_MASTER_SHEET_ID=1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk
# Google service account (same one the other sheet workflows use) — inline
# JSON (plain or base64) or a mounted file via GOOGLE_SERVICE_ACCOUNT_KEY:
GOOGLE_SERVICE_ACCOUNT_JSON={"client_email":"…","private_key":"-----BEGIN…"}
```

Then restart:

```bash
docker compose -f infra/docker-compose.runner.yml up -d --build
docker compose -f infra/docker-compose.runner.yml logs -f telegram-intake
```

Without the token/group vars the container **never breaks the runner**: it
sleeps 10 minutes and retries (honest `UNCONFIGURED` + unhealthy status).

## 2. Google Sheet

The bot writes **two tabs** in the Master Inventory spreadsheet (creates
them with headers on first run):

- **`Telegram Intake`** — the 20-column central ledger:
  `Timestamp | Reference Code | Listing Type (Rent/Sale) | Agent Name |
  Compound/Project | City/District | Unit Type | Area SQM | Bedrooms |
  Bathrooms | Furnishing | Finishing | Price/Month | Payment Terms |
  Deposit | Sanitized Description | Internal Private Notes |
  Landlord Contact (Scrubbed) | Media Links | Status`
  - *Internal Private Notes* is the ONLY place with the real landlord
    name/phones + raw intake text — share the sheet with admins/concierge
    only (editor access for the team should hide/delete this column).
  - *Landlord Contact (Scrubbed)* shows masked forms (`100***1490`).
- **`new_units`** — the A–L feed that workflow `05-unit-adder` already
  consumes (`PENDING` → Supabase `listings`, `publish_status=REVIEW_
  REQUIRED` so a human approves publication). The bot triggers unit-adder
  inline right after appending, so inventory is near-instant; the cron lane
  remains the safety net.

Share the spreadsheet with the service account e-mail (**Editor**).

## 3. Env schema (complete)

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | yes | — | BotFather token |
| `TELEGRAM_AGENT_GROUP_IDS` | yes | — | `id:Name` pairs (name optional — resolved from the chat title) |
| `TELEGRAM_GENERAL_GROUP_ID` | yes for broadcast | — | General/team broadcast group |
| `TELEGRAM_MASTER_SHEET_ID` / `GOOGLE_SHEET_ID` / `UNITS_SHEET_ID` | fallback chain | runner default | Master Inventory spreadsheet id |
| `GOOGLE_SERVICE_ACCOUNT_JSON` (= `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` alias) or `GOOGLE_SERVICE_ACCOUNT_KEY` | for sheet sync | — | Service-account creds (inline JSON/base64 or file path) |
| `TELEGRAM_INTAKE_TAB` | no | `Telegram Intake` | Ledger tab name |
| `TELEGRAM_INTAKE_NEW_UNITS_TAB` | no | `new_units` | Inventory feed tab name |
| `TELEGRAM_INTAKE_MAX_PHOTOS` | no | `5` | Photos per broadcast album (3–5 recommended) |
| `TELEGRAM_INTAKE_RUN_UNIT_ADDER` | no | `1` | Inline new_units→Supabase trigger |
| `TELEGRAM_INTAKE_COOLDOWN_MS` | no | `600000` | Dedupe window for identical re-sends |
| `TELEGRAM_INTAKE_MEDIA_GROUP_WAIT_MS` | no | `2500` | Album settle time before processing |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | for unit-adder | — | Passthrough (already in the runner compose) |

## 4. Behavior guarantees

- **Privacy doctrine** (binding owner rule): broadcasts are built ONLY
  from sanitized structured fields — raw intake text never flows into any
  team-facing output; landlord contact material lives only in the internal
  ledger columns; a runtime guard BLOCKS (not patches) any broadcast that
  somehow still contains a non-concierge Egyptian mobile. The concierge
  touchpoint is the reference code, not a phone number.
- **No crashes**: network timeouts and malformed input are caught per
  update; the poller survives. Agents get SPECIFIC replies (missing-field
  lists, spool status, incident ids) — never a generic
  "عذراً، حدث خطأ غير متوقع".
- **No lost units**: sheet outage → the unit is spooled to
  `.state/telegram-intake-spool.json` and flushed with a 10-minute retry;
  broadcast happens only AFTER the ledger accepts the row.
- **No duplicates**: identical text+agent inside the cooldown window is
  answered with the existing code, no second row.
- **Fail-closed routing**: only configured agent groups are ingested;
  unknown chats are logged and ignored. Bot messages are ignored.
- **Commands**: `/chatid` (setup), `/ping` (health: sheet/broadcast/spool),
  `/start` `/help`.

## 5. Local development

```bash
cd workflows
TELEGRAM_BOT_TOKEN=… TELEGRAM_AGENT_GROUP_IDS=-100…:Fareda \
TELEGRAM_GENERAL_GROUP_ID=-100… node 12-telegram-intake/bot.js
```

Tests: `pnpm test:root` (root vitest suite picks up
`__tests__/telegram-intake-pipeline.test.ts`).

## 6. Property Finder linkage (next step, not auto-enabled)

Approved units (a human flips `publish_status` → `PUBLISHABLE`) are already
staged to Property Finder by `workflows/lib/stage-approved-rent-unit.js` +
`workflows/lib/propertyfinder-rent-ad.js`. Intake → inventory → PF is a
review-gated path by design; the bot never publishes to a public portal on
its own.
