# Sierra Estates External Workflows

External automation scripts that sync data between Google Sheets, WhatsApp, Property Finder, and Firestore.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your credentials
```

## Workflows

### 01. WhatsApp Scraper

Monitors WhatsApp groups for property listings, writes raw messages to Sheets.

```bash
npm run whatsapp-scraper
```

**Required env vars:**

- `BROKER_INBOX_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `WHATSAPP_BOT_TOKEN`

---

### 02. Owner Search

Searches Property Finder & OLX for direct-owner properties, writes to Sheets.

```bash
npm run owner-search
```

**Schedule:** Daily at 9am (cron: `0 9 * * *`)

**Required env vars:**

- `PROPERTY_FINDER_API_BASE`
- `PROPERTY_FINDER_JWT_TOKEN`
- `BROKER_INBOX_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY`

---

### 03. Owner Contact

Sends WhatsApp messages to property owners, tracks delivery status.

```bash
npm run owner-contact
```

**Schedule:** Daily at 10am (cron: `0 10 * * *`)

**Required env vars:**

- `WHATSAPP_API_URL`
- `WHATSAPP_API_TOKEN`
- `BROKER_INBOX_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY`

---

### 04. Email Sender

Sends bulk emails to investor stakeholders via SendGrid.

```bash
npm run email-sender
```

**Schedule:** Daily at 8am (cron: `0 8 * * *`)

**Required env vars:**

- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `BROKER_INBOX_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY`

---

### 05. Unit Adder

Reads new properties from Sheets, deduplicates, writes to Firestore.

```bash
npm run unit-adder
```

**Schedule:** Every 30 minutes (cron: `*/30 * * * *`)

**Required env vars:**

- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `BROKER_INBOX_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY`

---

## Run All (Except Scraper)

```bash
npm run all
```

This runs owner-search → owner-contact → email-sender → unit-adder in sequence.

---

## Google Sheets Structure

All workflows read/write to a single Google Sheet with these tabs:

| Tab | Columns | Purpose |
| ----- | --------- | --------- |
| `raw_messages` | Timestamp, From, Role, Message, HasMedia, Status | WhatsApp scraper writes here |
| `owner_leads` | Timestamp, Source, Title, Price, Location, Beds/Baths, Contact, URL | Owner search output |
| `email_campaigns` | Email, Template, Variables, Status | Email sender input |
| `new_units` | Compound, BR, BA, Area, Price, Finishing, Furnishing, Type, Address, Lat, Lng, Status | Unit adder input |

---

## Deployment

### GitHub Actions

Add to `.github/workflows/external-workflows.yml`:

```yaml
name: External Workflows

on:
  schedule:
    - cron: '0 9 * * *'    # Owner search at 9am
    - cron: '0 10 * * *'   # Owner contact at 10am
    - cron: '0 8 * * *'    # Email sender at 8am
    - cron: '*/30 * * * *' # Unit adder every 30 min

jobs:
  workflows:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: cd workflows && npm install
      - run: npm run all
        env:
          PROPERTY_FINDER_JWT_TOKEN: ${{ secrets.PF_JWT }}
          WHATSAPP_API_TOKEN: ${{ secrets.WA_TOKEN }}
          SENDGRID_API_KEY: ${{ secrets.SENDGRID_KEY }}
          FIREBASE_PRIVATE_KEY: ${{ secrets.FIREBASE_KEY }}
          GOOGLE_SERVICE_ACCOUNT_KEY: ${{ secrets.GOOGLE_SA }}
          BROKER_INBOX_SHEET_ID: ${{ secrets.SHEET_ID }}
```

---

## Monitoring

Each workflow logs status to Sheets (PENDING → SENT/ADDED/ERROR).
Failures also log to console for debugging.

For production, integrate with:

- **Sentry** for error tracking
- **DataDog** for metrics
- **Telegram** for alerts

---

## 2026-10 — Workflow plane improvements (v1.2)

Upgrades shipped with this revision (deployed via `install.sh` / pushdir to `/opt/se/workflows`, runner restart required):

### Runner
- **Honest telemetry** — `last_run_label` now carries the exit kind: `ec2-runner:ok`, `:error`, `:timeout`, `:unconfigured`. The Workflow Studio can no longer dress up a blocked run as a healthy one.
- **Inbound webhook receiver** — `POST /api/inbound` (X-API-Key guarded) is the delivery target for the gateway's `message.received` webhook; raw deliveries land in `.state/inbox.jsonl` (rotating) and, when Sheets creds are configured, broker-group chatter flows to the `raw_messages` tab — the safe replacement for the banned second-session scraper (workflow 01). Inspect with `GET /api/inbound/preview`.
- **Runner body cap** 256 KB per inbound delivery.

### Scheduler
- `lib/crone.js` upgraded from minute/hour-only to **full 5-field cron** (dom/month/dow with `* , - /`, month names JAN-DEC, day names SUN-SAT, `7 == 0 == Sunday`, POSIX dom/dow OR-semantics). Any cron typed in the Studio now behaves exactly as written, in Africa/Cairo time.

### Workflows
- **06-gateway-sentinel** — escalation path: after `WF_ALERT_FAIL_THRESHOLD` (default 2 ≈ 10 min) consecutive failed probes it writes `.state/alerts.jsonl` and emails `WF_ALERT_EMAIL_TO` via SendGrid when available. On recovery it sends a WhatsApp confirmation to `WF_ALERT_TO` (fallback: the session's own number, "message yourself").
- **07-daily-digest (new)** — 08:00 Cairo Arabic WhatsApp digest: gateway health, per-workflow last exit + success rate, new leads and new units in the last 24 h. Target: `WF_DIGEST_TO` → `LEAD_NOTIFY_WHATSAPP_NUMBER` → session self-chat. Internal ops content — no Cairo Plaza notice per `lib/notice.js` decision table.

### One-time operator actions (2026-10)
- `whatsapp-scraper` row set to **paused** in the workflows registry: it is designed NOT to run on the gateway SIM (second-session ban risk). Its long-term replacement is the inbound webhook → `lib/inbox.js` path above.
- Gateway webhook subscription created for `message.received` → `http://127.0.0.1:2786/api/inbound` with the runner API key as `X-API-Key` header.

### New env vars (see .env.example)
`WF_DIGEST_TO`, `WF_ALERT_TO`, `WF_ALERT_EMAIL_TO`, `WF_ALERT_FAIL_THRESHOLD`, `SCRAPER_GROUP_CHATIDS`

## 2026-10 (later) — Workflow 08: Units Sheet Sync (owner inventory → Supabase)

- **08-units-sync/sync.js** — reads the owner's authoritative inventory Google
  Sheet via the **public gviz CSV endpoint** (no service account needed for
  read) and syncs every unit into `public.listings`, keyed by
  `dupe_check_hash = sha256('sierra-units|' + Code)` (the sheet's own SBR-style
  codes, e.g. `MT-B14-3U-8.34M`).
- Schedule `23 */2 * * *` (every 2 h), category `ingestion`, status `active`;
  also triggerable from the admin Workflow Ops screen ("Run now") — both the
  direct `:2786` HTTP path and the Supabase `run-requested` marker path are
  wired and verified live.
- Live-DB-safe mapping: `garden_sqm` / `furnishing_status` / `verified_at` /
  `publish_status` (PUBLISHABLE for Available units, REVIEW_REQUIRED otherwise)
  — verified against the deployed database via the PostgREST OpenAPI
  definition; repo-only column names (`garden_area`, `verified`,
  `publish_to_client`) are intentionally NOT used.
- Upsert strategy: no ON CONFLICT (the live DB lacks a usable unique
  constraint on `dupe_check_hash`) — probe hashes → PATCH existing, INSERT
  fresh, in-batch dedup (last row per Code wins). Verified idempotent:
  second run = 0 inserted / 242 updated / 0 errors.
- First production run: 324 sheet rows → 264 valid units → **240 inserted +
  2 updated, 0 errors** (60 rows had no Code; 22 duplicate codes collapsed).

### New env vars
`UNITS_SHEET_ID` (default = owner's sheet), `UNITS_SHEET_GID` (default =
inventory tab). Uses existing `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
