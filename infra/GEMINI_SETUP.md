# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — Gemini API Integration Guide
# ═══════════════════════════════════════════════════════════════════════════

## What Gemini Does in This Project

| Workflow | Gemini Usage |
|----------|-------------|
| **WhatsApp Bot** (02) | Generates conversational replies to client messages |
| **AI Score Scheduler** (03) | Scores listings 0-10 based on location, price, type, finishing |

## Get Your Gemini API Key

### 1. Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create a new project (or select existing)
3. Name it: `sierra-estates-ai`

### 2. Enable Gemini API
1. Go to **APIs & Services → Library**
2. Search for "Gemini"
3. Click **"Generative Language API"** → Enable

### 3. Generate API Key
1. Go to **APIs & Services → Credentials**
2. Click **"Create Credentials → API key"**
3. Copy the key (starts with `AIza...`)
4. (Recommended) Restrict the key to "Generative Language API" only

### 4. Add to VPS
```bash
# SSH to your VPS
ssh root@your-vps-ip

# Edit the .env file
nano /opt/sierra-estates/infra/.env

# Update this line:
GEMINI_API_KEY=AIzaSyYourKeyHere

# Restart n8n to pick up the new key:
cd /opt/sierra-estates/infra
docker compose restart n8n
```

## Configure Gemini in n8n

### 1. Add Credential in n8n
1. Open n8n: `http://your-vps-ip:5678`
2. Go to **Settings → Credentials**
3. Click **"Add Credential"**
4. Search for **"HTTP Header Auth"**
5. Configure:
   - **Name:** `Gemini API`
   - **Header name:** `x-goog-api-key`
   - **Header value:** `AIzaSyYourKeyHere`
6. Save

### 2. Update Workflow Nodes
The n8n workflows (02 + 03) reference Gemini via HTTP Request nodes.
After importing the workflows:

1. Open workflow **02-whatsapp-bot-handler**
2. Click the **"Gemini AI Reply"** node
3. Under **Authentication**, select **"HTTP Header Auth"**
4. Select the **"Gemini API"** credential
5. Save + Activate

Repeat for workflow **03-ai-score-scheduler** → "Gemini AI Score" node.

## Gemini API Free Tier Limits

| Resource | Limit |
|----------|-------|
| Gemini 2.0 Flash | 15 RPM (requests/minute) |
| Daily requests | 1,500/day |
| Tokens per minute | 1M TPM |
| Cost | **FREE** |

> 💡 The AI Score scheduler runs every 4 hours with batch size 10.
> That's ~60 requests/day — well within the free tier.

## Gemini API Request Format

The n8n HTTP Request nodes use this endpoint:

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
```

**Headers:**
```
Content-Type: application/json
x-goog-api-key: AIzaSyYourKeyHere
```

**Body (WhatsApp bot reply):**
```json
{
  "contents": [{
    "parts": [{
      "text": "You are Sierra, a real estate assistant...\n\nClient message: Hello\n\nReply format: just the bot reply text."
    }]
  }]
}
```

**Body (AI score):**
```json
{
  "contents": [{
    "parts": [{
      "text": "Score this listing 0-10...\n\nCompound: Mivida\nPrice: 25000000\n\nReply with ONLY a number 0-10."
    }]
  }]
}
```

## Testing Gemini

### Quick test via curl:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: AIzaSyYourKeyHere" \
  -d '{
    "contents": [{"parts": [{"text": "Say hello in Arabic"}]}]
  }'
```

Expected response:
```json
{
  "candidates": [{
    "content": {
      "parts": [{"text": "مرحبا"}]
    }
  }]
}
```

## Troubleshooting

### "API key not valid"
- Check the key is copied correctly (no extra spaces)
- Verify the Generative Language API is enabled in Google Cloud

### "Quota exceeded"
- Free tier: 15 RPM, 1,500/day
- Check usage: Google Cloud Console → APIs & Services → Quotas

### Workflow not sending requests
- Verify the "Gemini AI Reply" / "Gemini AI Score" node has the credential selected
- Check n8n execution logs for HTTP errors
