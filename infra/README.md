# Sierra Estates — Infrastructure

> n8n + Baileys WhatsApp scraper running on a $10 VPS.

## Structure

```
infra/
├── docker-compose.yml          ← orchestrates n8n + whatsapp-scraper
├── .env.example                ← copy to .env, fill in your values
├── .gitignore                  ← ignores secrets, n8n-data, whatsapp-auth
│
├── n8n-data/                   ← n8n workflows + credentials (auto-created)
│
├── whatsapp-auth/              ← Baileys session (auto-created, persists QR)
│
├── .env                        ← local Supabase/n8n secrets, never commit
│
└── whatsapp-scraper/           ← Baileys Node.js app
    ├── package.json
    ├── Dockerfile
    ├── .gitignore
    └── src/
        └── index.js            ← main bot script (QR auth + message relay)
```

## Quick Start

### 1. Configure Supabase

```bash
cp .env.example .env
# Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
```

### 2. Configure environment

```bash
cp .env.example .env
nano .env  # fill in: GEMINI_API_KEY, N8N_BASIC_AUTH_PASSWORD, and Supabase values
```

### 3. Start services

```bash
docker compose up -d
docker compose logs -f whatsapp-scraper
```

### 4. Scan QR code

The first time you start the WhatsApp scraper, it prints a QR code in the logs:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scan this QR code with WhatsApp:
  Phone → Settings → Linked Devices → Link a device
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[QR code here]
```

Open WhatsApp on your phone → Settings → Linked Devices → Link a device → scan.

The session is saved to `whatsapp-auth/` — you won't need to re-scan on restart.

### 5. Access n8n

Open `http://your-vps-ip:5678` in your browser. Login with the credentials from `.env`.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  VPS ($10, 4GB RAM, Docker)                                 │
│                                                             │
│  ┌─────────────┐         ┌──────────────────┐               │
│  │   n8n       │◄────────┤ whatsapp-scraper │               │
│  │  (port 5678)│  webhook│  (Baileys bot)   │               │
│  └──────┬──────┘         └────────┬─────────┘               │
│         │                         │                         │
│         │ Supabase write          │ WhatsApp send/receive   │
│         ▼                         ▼                         │
│  ┌─────────────┐         ┌──────────────────┐               │
│  │  Supabase    │         │  Client phone    │               │
│  │ (Postgres)   │         │  (WhatsApp app)  │               │
│  └─────────────┘         └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

## Message Flow

1. **Client sends WhatsApp message** → Baileys receives it
2. **Bot dedupes** (in case of reconnect double-delivery)
3. **Forwards to n8n** webhook (`POST /webhook/whatsapp-incoming`)
4. **n8n processes**: Gemini AI matching, Supabase writes (lead + inquiry)
5. **n8n returns** bot reply text
6. **Bot sends reply** back to client via WhatsApp
7. **Fallback**: if n8n is down, the scraper writes directly to Supabase (no lead lost)

## Backup

```bash
# Backup n8n workflows + WhatsApp session
tar -czf sierra-backup-$(date +%Y%m%d).tar.gz n8n-data/ whatsapp-auth/

# Restore
tar -xzf sierra-backup-YYYYMMDD.tar.gz
docker compose restart
```

## Troubleshooting

### QR code not showing

```bash
docker compose logs whatsapp-scraper | grep -A 20 "Scan this QR"
```

### WhatsApp disconnected

Delete the auth session and re-scan:

```bash
docker compose down
rm -rf whatsapp-auth/
docker compose up -d
docker compose logs -f whatsapp-scraper
```

### n8n not receiving webhooks

Check the webhook URL in `.env`:

```bash
# Should be reachable from whatsapp-scraper container
N8N_WEBHOOK_URL=http://n8n:5678/webhook/whatsapp-incoming
```
