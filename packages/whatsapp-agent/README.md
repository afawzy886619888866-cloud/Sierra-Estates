# Sierra Estates — WhatsApp AI Agent
## Built on OpenWA (@open-wa/wa-automate) + Google Gemini AI

> **⚠️ IMPORTANT:** Use a **dedicated phone number** for this bot. Never use your personal or primary business number — OpenWA uses WhatsApp Web automation which carries a small ban risk.

---

## 🚀 Quick Start (5 steps)

### Step 1 — Set up your `.env` values

Open the root `.env` file and fill in these variables:

```env
# Your Gemini API Key (get free from https://aistudio.google.com/)
GOOGLE_AI_API_KEY=AIza...

# Your WhatsApp number in international format (no + sign, no spaces)
# Example: 201012345678 (Egypt +20 1012345678)
WA_ADMIN_NUMBER=201012345678

# Optional: additional team numbers (comma-separated)
WA_TEAM_NUMBERS=201087654321,201099988877

# Optional: AI model (default: gemini-2.0-flash — fast & free tier)
GEMINI_MODEL=gemini-2.0-flash
```

### Step 2 — Install dependencies

```powershell
cd packages/whatsapp-agent
npm install
```

This installs:
- `@open-wa/wa-automate` — WhatsApp Web bridge
- `@google/generative-ai` — Gemini AI SDK
- `dotenv`, `express`, `nodemon`

### Step 3 — Start the agent

```powershell
npm start
```

A **QR code** will appear in your terminal. Scan it with the **dedicated WhatsApp number**:
- Open WhatsApp on the phone
- Go to **Settings → Linked Devices → Link a Device**
- Scan the QR code

✅ **After the first scan, the session is saved** — you won't need to scan again on restart.

### Step 4 — Verify it works

Send a message from **your admin number** to the bot number:
```
/status
```

You should get back:
```
📡 Sierra Agent Status
✅ Status: ONLINE
⏱ Uptime: 0h 1m
📩 Messages handled: 1
🤖 AI Model: Gemini 2.0 Flash
...
```

### Step 5 — Test the AI

Send any client query to the bot number (from a different phone):
```
What's the price range for apartments in Hyde Park New Cairo?
```

The bot will reply in Gemini AI, with Sierra Estates context!

---

## 📋 Admin Commands

All commands must be sent **from your admin WhatsApp number** (`WA_ADMIN_NUMBER`):

| Command | Description |
|---|---|
| `/help` | Show all available commands |
| `/status` | Bot uptime, messages handled, AI model |
| `/report` | Today's activity summary |
| `/report weekly` | This week's summary |
| `/inventory` | Show listing count by type & status |
| `/add <details>` | Add a listing (AI-parsed) |
| `/leads` | Recent client leads (last 7 days) |
| `/broadcast <msg>` | Send message to all recent leads |
| `/price <compound>` | Get compound price range from AI |
| `/ask <question>` | Ask Gemini a direct question |

### `/add` Examples:
```
/add Villa Mivida 380sqm 15M 4beds ready
/add Apartment Hyde Park 145sqm 4.5M 2beds under_construction
/add Penthouse Fifth Square 220sqm 9M 3beds 2026delivery
```
The AI automatically parses natural language details.

---

## 🤖 Group Features

When added to a WhatsApp group, the bot:
1. Sends a welcome message introducing itself
2. Only responds when **mentioned** or when message starts with "Sierra"
3. Can answer property questions from team members or clients in the group

To mention the bot in a group:
```
@Sierra what's the price of Villette apartments?
Sierra, can you send a report?
```

---

## 📁 File Structure

```
packages/whatsapp-agent/
├── src/
│   ├── index.js          ← Main entry (OpenWA + listeners)
│   ├── gemini-agent.js   ← AI brain (Gemini API wrapper)
│   ├── command-handler.js← Admin /commands parser
│   ├── listing-manager.js← Inventory CRUD (JSON → Firebase)
│   ├── report-generator.js← Daily/weekly report builder
│   └── session-store.js  ← Per-user conversation history
├── data/
│   ├── listings.json     ← Your inventory (auto-created)
│   └── leads.json        ← Client leads (auto-created)
├── wa_sessions/          ← OpenWA saves QR auth here (auto-created)
├── package.json
└── README.md
```

---

## ⚙️ Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `GOOGLE_AI_API_KEY` | *(required)* | Gemini API key from AI Studio |
| `WA_ADMIN_NUMBER` | *(required)* | Your WhatsApp number (digits only) |
| `WA_TEAM_NUMBERS` | `""` | Comma-separated team numbers |
| `WA_PORT` | `8080` | Internal API port |
| `WA_HEADLESS` | `true` | Run Chrome headlessly |
| `WA_REPLY_GROUPS` | `true` | Bot replies in groups |
| `WA_REPLY_DMS` | `true` | Bot replies to DMs |
| `GEMINI_MODEL` | `gemini-2.0-flash` | AI model to use |

---

## 🔒 Security Notes

- **Never share your `wa_sessions/` folder** — it contains your WhatsApp auth tokens
- The `data/` folder is gitignored (add it if not already done)
- Admin commands only work from `WA_ADMIN_NUMBER` — the bot ignores `/commands` from unknown numbers
- Rate limiting: bot waits 1.5s between broadcast messages to avoid WA flagging

---

## 🚀 Running 24/7 (Production)

Use **PM2** to keep the bot alive:

```powershell
npm install -g pm2
cd packages/whatsapp-agent
pm2 start src/index.js --name "sierra-wa-agent"
pm2 save
pm2 startup  # auto-start on system reboot
```

Or use the included `docker-compose.yml`:
```powershell
docker compose up -d sierra-wa-agent
```

---

## 🆙 Upgrading to Firebase

The `ListingManager` currently uses local JSON files. To upgrade to Firebase:

1. Install: `npm install firebase-admin`
2. Set `FIREBASE_SERVICE_ACCOUNT_JSON` in `.env`
3. Replace `_read()` / `_write()` in `listing-manager.js` with Firestore calls

The `SessionStore` can similarly be backed by **Redis** (Upstash) for persistence across restarts.
