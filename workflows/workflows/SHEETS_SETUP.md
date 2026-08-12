# Google Sheets Setup for Sierra Estates Workflows

## 1. Create the Master Sheet

1. Go to https://sheets.google.com
2. Create new spreadsheet: **"Sierra Estates - Broker Inbox"**
3. Share with your Google Cloud Service Account email (ends with `@iam.gserviceaccount.com`)
4. Copy the Sheet ID from URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
5. Paste into `.env` → `BROKER_INBOX_SHEET_ID`

---

## 2. Create 4 Tabs (Sheets)

Rename the default "Sheet1" and create these tabs:

### Tab 1: `raw_messages` (WhatsApp Scraper Output)

| Column | Type | Purpose |
|--------|------|---------|
| A | Timestamp | `=NOW()` |
| B | From | WhatsApp group name |
| C | Role | "broker" \| "subscriber" |
| D | Message | Raw message text |
| E | HasMedia | "YES" \| "NO" |
| F | Status | "PENDING_REVIEW" (scraper writes) |

**Header Row:**
```
Timestamp | From | Role | Message | HasMedia | Status
```

**Example Row:**
```
2026-05-28T10:30:00Z | مجموعة وسطاء التجمع | broker | عرض شقة 3 غرف بقيمة 850K | YES | PENDING_REVIEW
```

---

### Tab 2: `owner_leads` (Owner Search Output)

| Column | Type | Purpose |
|--------|------|---------|
| A | Timestamp | Search date |
| B | Source | "property_finder" \| "olx" |
| C | Title | Property name |
| D | Price | EGP amount |
| E | Location | Compound/area |
| F | Specs | "3 BR, 2 BA, 150 sqm" |
| G | OwnerContact | Phone number |
| H | URL | Link to listing |

**Header Row:**
```
Timestamp | Source | Title | Price | Location | Specs | OwnerContact | URL
```

**Example Row:**
```
2026-05-28T09:15:00Z | property_finder | Penthouse - New Cairo | 2500000 | New Cairo | 3 BR, 2 BA, 250 sqm | +201001234567 | https://pf.com/p/12345
```

---

### Tab 3: `email_campaigns` (Email Sender Input)

| Column | Type | Purpose |
|--------|------|---------|
| A | Email | Recipient email |
| B | Template | Template key |
| C | Variables | JSON object |
| D | Status | "PENDING" → "SENT" \| "ERROR" |

**Header Row:**
```
Email | Template | Variables | Status
```

**Example Row (Welcome email):**
```
investor@example.com | welcome | {} | PENDING
```

**Example Row (Property alert with variables):**
```
investor@example.com | property_alert | {"property_title":"3BR Villa","property_price":"1.5M","property_location":"New Cairo","property_id":"unit_12345"} | PENDING
```

**Available Templates:**
- `welcome` — Welcome email
- `property_alert` — New property match
- `viewing_reminder` — Appointment reminder

---

### Tab 4: `new_units` (Unit Adder Input)

| Column | Type | Purpose |
|--------|------|---------|
| A | Compound | Compound name |
| B | Bedrooms | 1, 2, 3, 4, etc. |
| C | Bathrooms | Number |
| D | Area | Square meters |
| E | Price | EGP amount |
| F | FinishingType | "core-shell" \| "semi-finished" \| "finished" |
| G | Furnishing | "furnished" \| "unfurnished" |
| H | PropertyType | "apartment" \| "villa" \| "townhouse" |
| I | Address | Full address |
| J | Latitude | 30.0 (Cairo default) |
| K | Longitude | 31.0 (Cairo default) |
| L | Status | "PENDING" → "ADDED" \| "DEDUPLICATED" \| "ERROR" |

**Header Row:**
```
Compound | Bedrooms | Bathrooms | Area | Price | FinishingType | Furnishing | PropertyType | Address | Latitude | Longitude | Status
```

**Example Row:**
```
Mountain View Desert | 3 | 2 | 180 | 850000 | finished | furnished | apartment | Villa 5, Building 3, MVD | 30.0045 | 31.3567 | PENDING
```

---

## 3. Column Formatting (Optional but Recommended)

### For `raw_messages` and `owner_leads`:
- Column A (Timestamp): Format → Number → Date time
- Column D/E (Price): Format → Number → Currency (EGP)

### For `new_units`:
- Column E (Price): Format → Currency (EGP)
- Column J-K (Lat/Lng): Format → Number → Decimal (4 places)

---

## 4. Data Validation (Optional)

### For `owner_leads` → Column B (Source):
- Data validation → List → property_finder, olx

### For `new_units` → Column F (FinishingType):
- Data validation → List → core-shell, semi-finished, finished

### For `new_units` → Column G (Furnishing):
- Data validation → List → furnished, unfurnished

### For `new_units` → Column H (PropertyType):
- Data validation → List → apartment, villa, townhouse, duplex, penthouse

---

## 5. Sharing with Service Account

1. Open your Google Sheet
2. Click "Share" (top right)
3. In "Who has access" dialog, find the Service Account email:
   - Format: `sierra-estates-workflows@PROJECT_ID.iam.gserviceaccount.com`
4. Copy from your `service-account-key.json` → `"client_email"`
5. Paste into Share dialog → Give **Editor** access
6. Confirm sharing

---

## 6. Test the Connection

```bash
cd workflows
npm install

# Test reading from Sheet
node -e "
const { google } = require('googleapis');
const fs = require('fs');
const key = JSON.parse(fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY));
const auth = new google.auth.GoogleAuth({ credentials: key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });
sheets.spreadsheets.get({ spreadsheetId: process.env.BROKER_INBOX_SHEET_ID }, (err, res) => {
  if (err) console.error('❌ Error:', err.message);
  else console.log('✅ Sheet connected:', res.data.properties.title);
});
"
```

---

## 7. Monitor Workflow Status

Each workflow updates the **Status** column as it runs:

```
PENDING       → Processing started
SENT          → Email sent (04-email-sender)
ADDED         → Unit added to Firestore (05-unit-adder)
CONTACTED     → WhatsApp sent (03-owner-contact)
DEDUPLICATED  → Duplicate detected (05-unit-adder)
ERROR         → Something failed (check console logs)
SKIPPED       → Intentionally skipped
```

---

## 8. Example Workflow: Complete Flow

1. **Owner Search runs (9am)**
   - Finds 3 new direct-owner properties on PF
   - Writes to `owner_leads` tab with status "PENDING"

2. **Owner Contact runs (10am)**
   - Reads `owner_leads` with status "PENDING"
   - Sends WhatsApp to each owner
   - Updates status to "CONTACTED"

3. **Email Sender runs (8am)**
   - Reads `email_campaigns` with status "PENDING"
   - Sends emails via SendGrid
   - Updates status to "SENT"

4. **Unit Adder runs (every 30 min)**
   - Reads `new_units` with status "PENDING"
   - Checks for duplicates (SHA256 hash)
   - Writes to Firestore if new
   - Updates status to "ADDED" or "DEDUPLICATED"

---

## 9. Troubleshooting

| Issue | Solution |
|-------|----------|
| "❌ Sheet write failed" | Check service account has Editor access |
| "❌ PERMISSION_DENIED" | Re-share Sheet with service account email |
| "DEDUPLICATED" rows | Unit already exists (same compound+area+floor+unit number) |
| Workflows not running | Check GitHub Actions → Workflows tab for errors |

