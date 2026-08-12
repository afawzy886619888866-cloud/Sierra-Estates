# Sierra Estates — n8n Workflows

> Pre-built n8n workflow JSON files for import into the n8n instance.

## Workflows

### 01 — Property Finder Lead Ingestion
**File:** `01-property-finder-leads.json`

Receives leads from Property Finder webhook → creates/updates client in Firestore → creates lead record → creates request ticket.

**Webhook URL:** `POST http://your-vps:5678/webhook/property-finder-leads`

**Expected payload:**
```json
{
  "name": "Ahmed Ali",
  "phone": "01001234567",
  "email": "ahmed@example.com",
  "listing_ref": "Mivida Villa 480",
  "message": "Interested in this property"
}
```

### 02 — WhatsApp Bot Message Handler
**File:** `02-whatsapp-bot-handler.json`

Receives messages from the Baileys WhatsApp scraper → finds/creates client → appends to request chat history → generates Gemini AI reply → escalates to human agent if needed.

**Webhook URL:** `POST http://n8n:5678/webhook/whatsapp-incoming`

**Flow:**
1. Parse message from Baileys container
2. Find existing client by phone (dedup)
3. Create new client OR append to existing request's chat
4. Generate bot reply via Gemini 2.0 Flash
5. If reply contains "ESCALATE" → set request status to `ready_for_agent`
6. Return reply to Baileys container (sends back to WhatsApp client)

### 03 — AI Listing Score Scheduler
**File:** `03-ai-score-scheduler.json`

Runs every 4 hours → fetches all active listings → scores each with Gemini AI → updates `ai_score` field in Firestore.

**Schedule:** Every 4 hours (cron)

**Scoring criteria (0-10):**
- Location growth potential
- Price competitiveness
- Property type + size appeal
- Finishing quality
- Rental yield potential

---

## Import Instructions

### 1. Access n8n
Open `http://your-vps-ip:5678` and login with credentials from `.env`.

### 2. Import each workflow
1. Click **"Workflows"** in the left sidebar
2. Click **"Add Workflow"** → **"Import from File"**
3. Select the JSON file (e.g., `01-property-finder-leads.json`)
4. Repeat for each workflow

### 3. Configure credentials
Each workflow uses Firebase + Gemini API. Configure these credentials in n8n:

**Firebase:**
1. Go to **Settings → Credentials**
2. Click **"Add Credential"** → **"Firebase Realtime Database"**
3. Upload the service account JSON (same as `secrets/firebase-service-account.json`)
4. Name it: `Sierra Firebase`

**Gemini API:**
1. Go to **Settings → Credentials**
2. Click **"Add Credential"** → **"HTTP Header Auth"**
3. Name: `Gemini API`
4. Header name: `x-goog-api-key`
5. Header value: your Gemini API key

### 4. Activate workflows
Click the **"Active"** toggle on each workflow to enable it.

### 5. Test webhooks
```bash
# Test Property Finder webhook
curl -X POST http://your-vps:5678/webhook/property-finder-leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone":"01001234567","message":"Test lead"}'

# Test WhatsApp webhook (simulate Baileys message)
curl -X POST http://your-vps:5678/webhook/whatsapp-incoming \
  -H "Content-Type: application/json" \
  -d '{"messageId":"test123","phone":"+201001234567","senderName":"Test","text":"Hello, I want a villa","timestamp":"2025-01-01T00:00:00Z","jid":"201001234567@s.whatsapp.net"}'
```

---

## Architecture

```
                    Property Finder
                         │
                         ▼
              ┌──────────────────────┐
              │  01. PF Lead         │
              │  Ingestion (webhook) │
              └──────────┬───────────┘
                         │
                         ▼
                    Firestore
              (clients, leads, requests)
                         ▲
                         │
              ┌──────────┴───────────┐
              │  02. WhatsApp Bot    │
              │  Handler (webhook)   │◄──── Baileys container
              │  + Gemini AI reply   │
              └──────────┬───────────┘
                         │
                         │
              ┌──────────┴───────────┐
              │  03. AI Score        │
              │  Scheduler (cron)    │──── Every 4 hours
              │  + Gemini scoring    │
              └──────────────────────┘
```

## Monitoring

- **n8n Executions:** View in n8n UI → "Executions" tab
- **Logs:** `docker compose logs n8n`
- **Firestore:** Check `clients`, `leads`, `requests` collections in Firebase Console

## Troubleshooting

### Webhook not receiving
- Check n8n is running: `docker compose ps n8n`
- Check webhook URL is accessible from outside VPS (firewall)
- Verify the webhook path matches the JSON file

### Firebase connection error
- Verify service account JSON is mounted: `docker compose exec n8n ls /data/firebase-service-account.json`
- Check credential is configured in n8n Settings → Credentials

### Gemini API errors
- Verify `GEMINI_API_KEY` is set in `.env`
- Check API quota in Google Cloud Console
- Gemini 2.0 Flash free tier: 15 requests/minute, 1500/day
