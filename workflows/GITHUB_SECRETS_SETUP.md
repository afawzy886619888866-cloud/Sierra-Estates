# GitHub Secrets Setup for CI/CD

All API credentials are stored as **GitHub Secrets** (encrypted) instead of .env files in the repo.

## How to Add Secrets

1. Go to: https://github.com/ahmedfawzy8866/Sierra-Estates-Final
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret below

---

## Required Secrets

### 1. GOOGLE_SERVICE_ACCOUNT_KEY
**Type:** Entire JSON file content  
**How to get:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your project (sierra-blu)
3. Create Service Account → "sierra-estates-workflows"
4. Create JSON key
5. Copy the **entire JSON content** (not the file path)
6. Paste into GitHub secret

**Should look like:**
```json
{"type":"service_account","project_id":"sierra-blu","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"sierra-estates-workflows@...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"..."}
```

---

### 2. BROKER_INBOX_SHEET_ID
**Type:** String  
**How to get:**
1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
2. Copy the `{SHEET_ID}` from the URL
3. Paste into GitHub secret

**Example:**
```
1xAbCdEfGhIjKlMnOpQrStUvWxYz2A3B4C5D6E7F8G9
```

---

### 3. PROPERTY_FINDER_API_BASE
**Type:** URL  
**Value:**
```
https://api.propertyfinder.com.eg/v3
```

---

### 4. PROPERTY_FINDER_JWT_TOKEN
**Type:** JWT Token  
**How to get:**
1. Login to: https://dashboard.propertyfinder.com
2. Go to Settings → API Keys
3. Generate or copy existing JWT token
4. Paste into GitHub secret

---

### 5. WHATSAPP_API_URL
**Type:** URL  
**Value (Meta Cloud API):**
```
https://graph.instagram.com/v18.0
```

---

### 6. WHATSAPP_API_TOKEN
**Type:** Token  
**How to get:**
1. Go to: https://developers.facebook.com/
2. Select your app
3. WhatsApp → API Setup → Get access token
4. Copy the token
5. Paste into GitHub secret

---

### 7. SENDGRID_API_KEY
**Type:** API Key  
**How to get:**
1. Login to: https://app.sendgrid.com
2. Settings → API Keys
3. Create new → Full Access
4. Copy the key
5. Paste into GitHub secret

**Format:**
```
SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 8. SENDGRID_FROM_EMAIL
**Type:** Email address  
**Value:**
```
noreply@sierra-estates.com
```
(Or your verified sender email in SendGrid)

---

### 9. FIREBASE_PROJECT_ID
**Type:** Project ID  
**How to get:**
1. Go to: https://console.firebase.google.com
2. Select sierra-blu
3. Project Settings → General
4. Copy "Project ID"

**Example:**
```
sierra-blu
```

---

### 10. FIREBASE_PRIVATE_KEY
**Type:** Private key (with newlines)  
**How to get:**
1. Go to: https://console.firebase.google.com/project/sierra-blu/settings/serviceaccounts/adminsdk
2. Click "Generate new private key"
3. Open the downloaded JSON file
4. Copy the value of `"private_key"`
5. Paste into GitHub secret

**Should start/end with:**
```
-----BEGIN PRIVATE KEY-----
... (lots of characters)
-----END PRIVATE KEY-----
```

---

### 11. FIREBASE_CLIENT_EMAIL
**Type:** Email  
**How to get:**
1. Open the Firebase private key JSON file
2. Copy the `"client_email"` value
3. Paste into GitHub secret

**Example:**
```
firebase-adminsdk-xxxxx@sierra-blu.iam.gserviceaccount.com
```

---

### 12. TELEGRAM_BOT_TOKEN (Optional)
**Type:** Token  
**For:** Error notifications to Telegram  
**How to get:**
1. Message @BotFather on Telegram
2. Create new bot
3. Copy the token
4. Paste into GitHub secret

---

### 13. TELEGRAM_CHAT_ID (Optional)
**Type:** Chat ID  
**For:** Where to send error notifications  
**How to get:**
1. Message @userinfobot on Telegram
2. Get your chat ID
3. Paste into GitHub secret

---

## Verification Checklist

After adding all secrets:

```bash
# 1. Go to repository secrets page
https://github.com/ahmedfawzy8866/Sierra-Estates-Final/settings/secrets/actions

# 2. Verify all 13 secrets are present:
✅ BROKER_INBOX_SHEET_ID
✅ EMAIL_SENDER
✅ FIREBASE_CLIENT_EMAIL
✅ FIREBASE_PRIVATE_KEY
✅ FIREBASE_PROJECT_ID
✅ GOOGLE_SERVICE_ACCOUNT_KEY
✅ PROPERTY_FINDER_API_BASE
✅ PROPERTY_FINDER_JWT_TOKEN
✅ SENDGRID_API_KEY
✅ SENDGRID_FROM_EMAIL
✅ TELEGRAM_BOT_TOKEN
✅ TELEGRAM_CHAT_ID
✅ WHATSAPP_API_TOKEN
✅ WHATSAPP_API_URL

# 3. Manually trigger workflow to test
# Go to: Actions → External Workflows → Run workflow
```

---

## Cron Schedule Reference

The workflows run on this schedule (all times UTC):

| Workflow | Schedule | Local Time (Cairo UTC+2) |
|----------|----------|--------------------------|
| Owner Search | 9am UTC | 11am Cairo |
| Owner Contact | 10am UTC | 12pm Cairo |
| Email Sender | 8am UTC | 10am Cairo |
| Unit Adder | Every 30 min | Every 30 min |

To change times, edit `.github/workflows/external-workflows.yml`:

```yaml
schedule:
  - cron: '0 9 * * *'      # 9am UTC (change first two numbers)
  - cron: '0 10 * * *'     # 10am UTC
  - cron: '0 8 * * *'      # 8am UTC
  - cron: '*/30 * * * *'   # Every 30 minutes
```

**Cron format:** `minute hour day month weekday`

**Examples:**
- `0 9 * * *` = 9am daily
- `0 9 * * 1` = 9am Mondays only
- `*/15 * * * *` = Every 15 minutes
- `0 2 * * *` = 2am daily

---

## Test Each Secret

```bash
# Test Google Sheets
node -e "
const { google } = require('googleapis');
const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
const auth = new google.auth.GoogleAuth({ credentials: key });
const sheets = google.sheets({ version: 'v4', auth });
sheets.spreadsheets.get({ 
  spreadsheetId: process.env.BROKER_INBOX_SHEET_ID 
}, (err, res) => {
  if (err) console.log('❌', err.message);
  else console.log('✅ Sheets connected');
});
" 2>&1

# Test Property Finder
curl -s "https://api.propertyfinder.com.eg/v3/properties?limit=1" \
  -H "Authorization: Bearer $PROPERTY_FINDER_JWT_TOKEN" | \
  jq '.properties | length'

# Test Firestore
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)) });
admin.firestore().collection('listings').limit(1).get().then(() => {
  console.log('✅ Firestore connected');
}).catch(e => console.log('❌', e.message));
"
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "PERMISSION_DENIED" | Check service account has correct roles (Editor on Sheet, Firestore access in Firebase) |
| "Invalid credential" | Re-copy the entire JSON content (not a file path) |
| "401 Unauthorized" | Check token is current (may need regeneration) |
| Workflow doesn't run | Check "Actions" tab → "External Workflows" → Enable (if disabled) |
| "Scheduled workflows are disabled" | Go to Actions → Enable workflows |

