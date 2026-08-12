# 🐍 Sierra Estates Python Scripts

## Overview

Sierra Estates currently documents eight Python script entries in `scripts/python/`: five automation utilities and three implementation/reference scripts:

| Script | Purpose |
| --- | --- |
| `lead-scorer.py` | Score leads on a 1–10 scale from CSV or Firestore |
| `firestore-exporter.py` | Export Firestore collections to JSON or CSV |
| `property-sync.py` | Sync Property Finder listings into Firestore |
| `whatsapp-broadcast.py` | Send templated WhatsApp messages to scored leads |
| `analytics-report.py` | Generate a Markdown KPI report from Firestore |
| `api-integration.py` | Property Finder and CRM integration examples |
| `bot-implementation.py` | Telegram and WhatsApp bot implementation notes |
| `system-prompt-deployment.py` | AI system prompt deployment and rollout notes |

## Setup

```bash
cd scripts/python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file (or export environment variables) before running the Firestore, Property Finder, WhatsApp, or Telegram-enabled scripts.

## CLI Usage

### `lead-scorer.py`

```bash
python lead-scorer.py --source csv --input ./leads.csv --output ./reports/scored-leads.csv --min-score 6
python lead-scorer.py --source firestore --collection Leads --output ./reports/scored-firestore-leads.csv --min-score 7
```

Scores leads using intent, budget, timeline, and compound-target signals. The output report is always written as CSV.

### `firestore-exporter.py`

```bash
python firestore-exporter.py --collection Leads --format json --output ./exports/leads.json
python firestore-exporter.py --collection Properties --format csv --output ./exports/properties.csv --deep
```

Use `--deep` when you need nested subcollections included in the export.

### `property-sync.py`

```bash
python property-sync.py --dry-run --limit 25
python property-sync.py --compound Mivida --limit 50
```

This script fetches Property Finder listings, normalizes the payload, computes the same SHA256 `sync_hash` used by `app/api/crm/property-finder/route.ts`, and upserts the `Properties` collection.

### `whatsapp-broadcast.py`

```bash
python whatsapp-broadcast.py --source csv --input ./reports/scored-leads.csv --template "Hi {name}, we found a {compound} option near {price}." --min-score 7
python whatsapp-broadcast.py --source firestore --collection Leads --template "Hello {name}, new Sierra Estates inventory is live in {compound}." --dry-run
```

Messages support placeholders for `{name}`, `{compound}`, and `{price}`. Non-dry-run execution rate-limits to one message per second.

### `analytics-report.py`

```bash
python analytics-report.py --output-dir ./reports
python analytics-report.py --date-range 2026-06-01:2026-06-30 --send-telegram
```

The report reads from `Leads`, `Properties`, and `Owners`, then writes `analytics-YYYY-MM-DD.md` into the output directory.

## Environment Variables

| Variable | Used By | Purpose |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | `lead-scorer.py`, `firestore-exporter.py`, `property-sync.py`, `whatsapp-broadcast.py`, `analytics-report.py` | Firebase Admin SDK credentials as a JSON string |
| `PF_API_KEY` | `property-sync.py` | Property Finder API key |
| `PF_API_SECRET` | `property-sync.py` | Property Finder API secret |
| `PF_API_BASE_URL` | `property-sync.py` | Optional Property Finder API base URL override |
| `WHATSAPP_API_URL` | `whatsapp-broadcast.py` | WhatsApp message API endpoint |
| `WHATSAPP_API_TOKEN` | `whatsapp-broadcast.py` | WhatsApp API bearer token |
| `TELEGRAM_BOT_TOKEN` | `analytics-report.py` | Telegram bot token for report summaries |
| `TELEGRAM_CHANNEL_ID` | `analytics-report.py` | Telegram chat/channel id for summaries |

## Troubleshooting

- **`firebase-admin` import errors** — activate the virtual environment and reinstall with `pip install -r scripts/python/requirements.txt`.
- **`FIREBASE_SERVICE_ACCOUNT_JSON` missing** — export the raw JSON string for a Firebase service account before using Firestore-backed scripts.
- **Property Finder request failures** — verify `PF_API_KEY`, `PF_API_SECRET`, and (if needed) `PF_API_BASE_URL` against the provider environment you are calling.
- **WhatsApp delivery failures** — confirm the API URL/token pair, then rerun with `--dry-run` to validate rendered message content safely.
- **Telegram summary errors** — make sure the bot is already added to the destination channel and can post messages there.
