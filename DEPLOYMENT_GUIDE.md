# ═══════════════════════════════════════════════════════════════════════════

# Sierra Estates — Complete Deployment Guide

# ═══════════════════════════════════════════════════════════════════════════

## Overview

This guide covers deploying all 4 components of Sierra Estates:

| Component | Where | Cost |
| ----------- | ------- | ------ |
| Client Portal | Vercel | Free |
| Admin SPA | Vercel (or self-host) | Free |
| Database | Supabase | Free (500MB) |
| n8n + WhatsApp Bot | VPS | $10/month |

---

## Phase 1: Database (Supabase) — 10 minutes

### Create Project

1. Go to <https://supabase.com> → Sign up
2. Click "New Project"
3. Name: `sierra-estates-prod`
4. Set database password (save it!)
5. Region: Choose closest to Egypt (eu-central-1 or me-central-1)
6. Wait 2 minutes for provisioning

### Run Schema

1. In Supabase Dashboard → **SQL Editor**
2. Click "New query"
3. Copy entire contents of `infra/schema.sql` from this repo
4. Click **Run** (▶)
5. Verify: 8 tables created (compounds, listings, units, agents, inquiries, career_applications, leads, users)

### Get API Keys

1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** (e.g. `https://abcd1234.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### Configure + Seed

```bash
# Run the automated setup script
cd SE
bash scripts/setup-supabase.sh
# Follow prompts — paste URL + key when asked
```

Or manually:

1. Edit `supabase-config.js` → paste URL + key → set `ENABLED = true`
2. Open `seed-supabase.html` in browser → click "Seed Supabase Now"

### Create Admin User

1. Supabase Dashboard → **Authentication → Users** → Add user
2. Copy the user's UID
3. SQL Editor:

```sql
INSERT INTO users (id, email, name, role)
VALUES ('YOUR-UID', 'your@email.com', 'Ahmed', 'admin');
```

✅ **Database ready!**

---

## Phase 2: Client Portal (Vercel) — 5 minutes

### Deploy

1. Go to <https://vercel.com> → Sign up with GitHub
2. Click "New Project" → Import `SE` repo
3. Configure:
   - **Root Directory:** `apps/client`
   - **Framework:** Next.js (auto-detected)
4. Add Environment Variables (Settings → Environment Variables):

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY = your-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID = your-project
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 000000000000
   NEXT_PUBLIC_FIREBASE_APP_ID = 1:0000:web:0000
   ```

5. Click **Deploy**
6. Vercel provides: `https://sierra-estates-client.vercel.app`

### Custom Domain (optional)

Settings → Domains → Add `sierraestates.com`

✅ **Client portal live!**

---

## Phase 3: Admin SPA (Vercel or self-host) — 5 minutes

### Option A: Vercel (recommended)

1. In Vercel, create another project from same repo
2. Configure:
   - **Root Directory:** `apps/admin`
   - **Framework:** Vite (auto-detected)
3. Add Environment Variables:

   ```
   VITE_FIREBASE_API_KEY = your-key
   VITE_FIREBASE_AUTH_DOMAIN = your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID = your-project
   VITE_FIREBASE_STORAGE_BUCKET = your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID = 000000000000
   VITE_FIREBASE_APP_ID = 1:0000:web:0000
   VITE_N8N_URL = http://your-vps-ip:5678
   ```

4. Deploy

### Option B: Self-host (any static server)

```bash
cd apps/admin
npm install
npm run build
# Serve the dist/ folder with any static server (nginx, caddy, serve)
npx serve dist
```

✅ **Admin SPA live!**

---

## Phase 4: VPS (n8n + WhatsApp Bot) — 20 minutes

### Buy VPS

Recommended providers:

- **Hetzner** (best value): <https://hetzner.cloud> — CX22 (€4.5/mo, 4GB RAM)
- **DigitalOcean**: <https://digitalocean.com> — $10/mo, 2GB RAM
- **Contabo**: <https://contabo.com> — $6/mo, 8GB RAM

Choose **Ubuntu 22.04** in a region close to Egypt (eu-central or me-central).

### Run Setup Script

```bash
# SSH to your VPS
ssh root@YOUR-VPS-IP

# Run the automated setup script
curl -fsSL https://raw.githubusercontent.com/ahmedfawzy8866/SE/dispatch/scripts/setup-vps.sh | bash
```

The script will:

1. ✅ Install Docker + Docker Compose
2. ✅ Clone the SE repo (dispatch branch)
3. ✅ Configure environment variables (prompts for keys)
4. ✅ Start n8n + WhatsApp scraper containers
5. ✅ Print access URLs + WhatsApp QR code

### Link WhatsApp

```bash
# View the QR code
docker compose -f /opt/sierra-estates/infra/docker-compose.yml logs whatsapp-scraper | grep -A 25 "Scan this QR"
```

1. Open WhatsApp on your phone
2. Settings → Linked Devices → Link a device
3. Scan the QR code in terminal

### Import n8n Workflows

1. Open `http://YOUR-VPS-IP:5678` in browser
2. Login (admin / password you set)
3. Workflows → Add → Import from File
4. Import all 3 files from `/opt/sierra-estates/infra/n8n-workflows/`:
   - `01-property-finder-leads.json`
   - `02-whatsapp-bot-handler.json`
   - `03-ai-score-scheduler.json`
5. Activate all 3 workflows (toggle "Active" on each)

### Configure Gemini API in n8n

1. Get Gemini API key (see `infra/GEMINI_SETUP.md`)
2. n8n → Settings → Credentials → Add → "HTTP Header Auth"
   - Name: `Gemini API`
   - Header: `x-goog-api-key`
   - Value: `AIzaSyYourKeyHere`
3. Open workflow 02 → "Gemini AI Reply" node → select credential
4. Open workflow 03 → "Gemini AI Score" node → select credential

### Configure Firebase in n8n

1. Place service account JSON on VPS:

```bash
# Upload from your computer
scp ~/Downloads/service-account.json root@YOUR-VPS-IP:/opt/sierra-estates/infra/secrets/firebase-service-account.json
```
1. n8n → Settings → Credentials → Add → "Firebase Realtime Database"
   - Upload the service account JSON
   - Name: `Sierra Firebase`
2. Each workflow node that uses Firebase → select this credential

✅ **n8n + WhatsApp bot live!**

---

## Verification Checklist

After all 4 phases, verify:

| Check | How |
| ------- | ----- |
| Client portal loads | Visit Vercel URL |
| Listings show on client | Browse `/listings` page |
| Inquiry form works | Submit test inquiry → check Supabase `inquiries` table |
| Admin SPA loads | Visit admin Vercel URL |
| Admin can see listings | Login → Listings Manager |
| n8n is running | Visit `http://VPS-IP:5678` |
| WhatsApp bot connected | Send test message → check n8n executions |
| Gemini replies work | Send WhatsApp message → verify AI reply |
| AI scores updating | Check `listings.ai_score` in Supabase (updates every 4h) |

---

## Cost Summary

| Service | Cost |
| --------- | ------ |
| Vercel (client + admin) | $0 (free tier) |
| Supabase (database) | $0 (free tier, 500MB) |
| VPS (n8n + WhatsApp) | $5-10/month |
| Gemini API | $0 (free tier, 1500 req/day) |
| Firebase | $0 (free tier) |
| GitHub Pages (legacy portal) | $0 |
| **Total** | **$5-10/month** |

---

## Troubleshooting

### Client portal shows no listings

- Check Firebase/Supabase env vars in Vercel
- Verify listings have `status: 'active'` in database
- Check browser console for errors

### Admin SPA can't connect to Firestore

- Verify `VITE_FIREBASE_*` env vars are set
- Check Firestore Security Rules allow admin access
- Verify your user has `role: 'admin'` in `users` table

### n8n workflows not executing

- Check n8n logs: `docker compose logs n8n`
- Verify credentials are configured (Firebase + Gemini)
- Check webhook URLs are correct

### WhatsApp bot not responding

- Check bot logs: `docker compose logs whatsapp-scraper`
- Verify QR code was scanned (session saved in `whatsapp-auth/`)
- Test webhook: `curl -X POST http://VPS-IP:5678/webhook/whatsapp-incoming -H "Content-Type: application/json" -d '{"phone":"+201001234567","text":"test","jid":"test@s.whatsapp.net"}'`

### Gemini API errors

- Verify API key is valid (test with curl in GEMINI_SETUP.md)
- Check free tier quota (1500 req/day)
- Ensure "Generative Language API" is enabled in Google Cloud
