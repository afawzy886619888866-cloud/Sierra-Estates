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
|-----|---------|---------|
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
