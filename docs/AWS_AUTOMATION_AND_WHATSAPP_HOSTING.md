# AWS EC2 & Cloud Automation Guide for Sierra Estates

## 1. Overview & Architecture

Because GitHub Actions enforces runner minute quotas and $0 spending limits on free tier accounts, mission-critical background automations—such as the **WhatsApp Concierge Bot**, **Scheduled WhatsApp Outreaches**, and **Continuous Agent Fleets**—should be hosted on a dedicated cloud instance (AWS EC2 / AWS Lightsail or Docker VPS) rather than ephemeral CI/CD runners.

```text
┌─────────────────────────────────────────────────────────────┐
│                    AWS Cloud Host (EC2)                     │
│                                                             │
│   ┌─────────────────────┐       ┌────────────────────────┐  │
│   │  WhatsApp Agent     │       │   n8n Automation Hub   │  │
│   │  (whatsapp-web.js)  │◄─────►│   (Webhook / Scrapers) │  │
│   └──────────┬──────────┘       └───────────┬────────────┘  │
│              │                              │               │
└──────────────┼──────────────────────────────┼───────────────┘
               ▼                              ▼
      ┌────────────────────────────────────────────────┐
      │     Supabase Postgres & pgvector Backend       │
      │       https://gaxfqcietzoonlmatiot...          │
      └────────────────────────────────────────────────┘
```

---

## 2. Launching on AWS EC2 (Automated Script)

The repository includes an automated launch script at [scripts/launch-aws-ec2.sh](file:///h:/last/Main/SE-Vercel-deploy-main/.amazonq/SE-Vercel-deploy-main/scripts/launch-aws-ec2.sh).

### Prerequisites

1. Install AWS CLI:

   ```bash
   pip install awscli
   ```

2. Configure credentials with appropriate permissions:

   ```bash
   aws configure
   ```

3. Recommended Instance Type:
   - **`t3.small`** (~$15/month, 2GB RAM): Recommended for running Chromium/Puppeteer for WhatsApp Web + n8n workflows smoothly.
   - **`t3.micro`** (Free Tier eligible for 12 months): 1GB RAM + 2GB swap.
4. Recommended Region:
   - `eu-central-1` (Frankfurt) or `me-south-1` (Bahrain) for lowest latency to Egypt.

### Launch Command

```bash
bash scripts/launch-aws-ec2.sh
```

---

## 3. Running with Docker Compose

On your AWS instance, Docker Compose manages the services:

```bash
# Clone the repository
git clone https://github.com/sierrablue8866-droid/SE-Vercel-deploy-main.git
cd SE-Vercel-deploy-main

# Copy environment variables
cp .env.example .env

# Start n8n and automation services
docker compose -f docker-compose.n8n.prod.yml up -d
```

### Viewing WhatsApp QR Code

When the WhatsApp bot starts, view the QR code in the container logs to link your mobile phone:

```bash
docker compose -f infra/docker-compose.yml logs whatsapp-scraper | grep -A 25 "Scan"
```

---

## 4. WhatsApp Mobile Chat Harvester in Admin Portal

For bulk historic chats, WhatsApp Mobile contains significantly more message history than desktop browser sessions.

The **WhatsApp Mobile Chat Harvester** is integrated directly into the Admin Portal (`/admin` → **All Listings** → **Mobile Harvester**):

1. **Export Chat**: On your mobile phone, open any target WhatsApp owner group (e.g. _Owners August 2026_, _Owners Units_, _Group Data Owner_).
2. **Without Media**: Tap the group header → _Export Chat_ → Select _Without Media_.
3. **Upload or Paste**: Upload the `.txt` file into the Admin Studio or paste the text directly.
4. **Scan & Analyze**: The system runs AI & regex extraction to detect compounds, pricing, bedroom count, and classifies direct owners.
5. **Approve & Ingest**: With 1 click, verified direct owner units are ingested into the live Supabase inventory and deduplicated against existing records.
