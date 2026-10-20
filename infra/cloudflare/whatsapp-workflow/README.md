# Sierra Estates — Serverless WhatsApp Outreach on Cloudflare Workers

> **Complete replacement for AWS EC2 `se-workflow-runner` cron.**
> Runs 100% serverless on Cloudflare Workers (Free Tier compatible) with scheduled Cron Triggers. Zero server maintenance, zero EC2 hosting costs.

---

## 1. New Simplified Outreach Message (Arabic)

Following the directive to keep the message simple, polite, and without assuming unverified unit details:

```text
السلام عليكم ورحمة الله وبركاته يا فندم،

مع حضرتك فريق Sierra Estates للتسويق العقاري بالتجمع الخامس.

بعتذر جداً لحضرتك على الإزعاج، كنا حابين نستفسر لو متاح عند حضرتك وحدة معروضة للإيجار أو البيع في [الكمبوند / التجمع الخامس]؟ وحابين نتأكد من التفاصيل الحالية من حضرتك مباشرة إذا مناسب نتعاون في تسويقها لعملائنا.

لو الوحدة غير متاحة حالياً بنعتذر لحضرتك وشكراً جزيلاً لوقتك 🤝
(لعدم استقبال رسائل أخرى أرسل كلمة "إلغاء")
```

### Why this works

- **No unverified numbers**: Does not guess or assert prices, bedroom count, or finish status.
- **Respectful & Humble**: Apologizes for reaching out, states the company name clearly, and asks permission to verify details directly from the owner.
- **Clear Opt-out**: Includes the required `إلغاء` opt-out keyword for compliance and anti-ban safety.

---

## 2. Architecture: AWS EC2 vs. Cloudflare Workers

| Dimension | Previous AWS EC2 (`18.232.148.172`) | New Cloudflare Worker (`sierra-whatsapp-workflow`) |
|---|---|---|
| **Cost** | ~$15 – $40 / month (EC2 + EBS + IPv4 charges) | **$0.00 / month** (Cloudflare Free Tier) |
| **Scheduler** | Local Linux crontab / systemd runner | Cloudflare Scheduled Triggers (`cron`) |
| **Active Hours** | Checked via script | Built-in Cairo time window check (`10:00 – 20:00`) |
| **Deduplication** | Local JSONL ledger on disk (lost if instance restarts) | **Supabase Postgres Table** (`public.owner_outreach_log`) |
| **Maintenance** | OS updates, Docker restarts, memory leaks | Serverless / Zero ops |

---

## 3. How to Deploy to Cloudflare

### Prerequisites

Make sure you have Node.js installed, then navigate to this folder:

```bash
cd "h:\Sierra Estates\infra\cloudflare\whatsapp-workflow"
npm install
```

### Step 1: Login to Cloudflare

```bash
npx wrangler login
```

*(A browser window will open to authenticate with your Cloudflare account).*

### Step 2: Set Secrets in Cloudflare

Run these commands to securely set your production keys in Cloudflare:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

```bash
npx wrangler secret put WHATSAPP_API_TOKEN
```

### Step 3: Deploy

```bash
npx wrangler deploy
```

Once deployed, Cloudflare will output your worker URL (e.g., `https://sierra-whatsapp-workflow.<your-subdomain>.workers.dev`).

---

## 4. WhatsApp Gateway Connectivity (Cloudflare Tunnel)

To connect the Cloudflare Worker to your WhatsApp gateway (Baileys / OpenWA) without paying for EC2:

1. **Option A — Run Gateway Locally with Cloudflare Tunnel (Free & Secure):**
   - Run OpenWA / Baileys on any computer or local mini-PC:

     ```bash
     cd "h:\Sierra Estates\services\openwa"
     npm start
     ```

   - In another terminal, start a Cloudflare Tunnel:

     ```bash
     cloudflared tunnel --url http://127.0.0.1:2785
     ```

   - Copy the generated tunnel URL (e.g. `https://random-words.trycloudflare.com`) and update `WHATSAPP_API_URL` in `wrangler.toml` or set it via `npx wrangler secret put WHATSAPP_API_URL`.

2. **Option B — Point to Existing Gateway URL:**
   - In `wrangler.toml`, set `WHATSAPP_API_URL` to your domain or tunnel address.

---

## 5. Testing & Verification

### Test Health Check

```bash
curl https://sierra-whatsapp-workflow.<your-subdomain>.workers.dev/health
```

Response:

```json
{
  "service": "sierra-whatsapp-workflow-cloudflare",
  "status": "online",
  "runtime": "Cloudflare Workers (Edge)",
  "cairoHour": 15,
  "operatingWindow": "10:00 – 20:00",
  "isWithinActiveHours": true,
  "batchSize": 25,
  "dailyCap": 80
}
```

### Test Manual Outreach (Dry-Run / Simulation)

```bash
curl -X POST https://sierra-whatsapp-workflow.<your-subdomain>.workers.dev/dispatch \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "limit": 5}'
```

This parses the live Google Sheet, checks deduplication against Supabase, and outputs the exact messages that would be sent without sending anything to WhatsApp.

---

## 6. Safely Turning Off AWS EC2 (Stop Paying Charges)

Once you have verified the Cloudflare Worker:

1. Open the **AWS Management Console** -> **EC2 Instances**.
2. Locate instance `i-0be8ff8c5cfba7363` (`18.232.148.172`).
3. Select **Instance state** -> **Stop instance** (or **Terminate** if you no longer need the disk).
4. This instantly halts all hourly compute and public IPv4 billing on AWS.
