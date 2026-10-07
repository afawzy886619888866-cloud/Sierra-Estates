---
name: sierra-listing-pipeline-agent
description: Autonomous end-to-end listing agent for Sierra Estates. Listens to WhatsApp owner groups (e.g. August Owners), extracts unit specs & media via Gemini AI, enforces price rules (Rent 7k-300k, Resale >=1M), downloads & tags photos, syncs to Supabase & Master Excel, and publishes Property Finder ad syndication feeds.
---

# 🤖 Sierra Estates Listing Pipeline Agent (OpenClaw Powered)

## Overview

The **Sierra Listing Pipeline Agent** is an autonomous OpenClaw agent dedicated to end-to-end real estate intake and automated ad creation. It bridges real-time WhatsApp owner group chatter into verified database records, Excel master workbooks, and live Property Finder ads.

## Core Autonomous Sequence

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. WhatsApp Live Listener (Baileys Multi-Device Socket)    │
│    • Ingests messages & attachments from Owner Groups       │
│    • Downloads full-resolution photos to Owners_Media/      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. OpenClaw Multi-Modal Vision & NLP Extraction             │
│    • Identifies Compound, Deal Type, Beds, Baths, Area      │
│    • Normalizes & sanitizes Owner Phone numbers             │
│    • Resolves photo URLs for CDN hosting                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Price Calibration Guardrails                             │
│    • Rent: 7,000 EGP/mo to 300,000 EGP/mo (USD x 50)        │
│    • Resale: Floor at 1,000,000 EGP (1M minimum)            │
│    • Automatic Cross-Category Flipping                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Slot-Filling & Interactive Group Dialogue                │
│    • If photos or pricing are missing:                      │
│      Auto-prompts sender with exact Arabic guidance         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Instant Multi-Destination Publishing                     │
│    • Supabase: public.listings & public.units               │
│    • Master Excel: Sierra_Estates_Rent_Master.xlsx          │
│    • Property Finder: XML Feed & Portal CSV                 │
│    • Obsidian: Episodic Context Cache (ECC) Log             │
└─────────────────────────────────────────────────────────────┘
```

## Running the Pipeline

### 1. Start Local WhatsApp Socket & Harvester

```bash
cd infra/whatsapp-scraper
node src/owners-harvester.js
```

Open **[http://localhost:3000/whatsapp_qr.html](http://localhost:3000/whatsapp_qr.html)** to scan the pairing QR code.

### 2. Programmatic Execution in Code

```typescript
import { SierraListingPipelineAgent } from '@sierra-estates/agents';

const agent = new SierraListingPipelineAgent();

const result = await agent.processGroupDrop({
  rawMessage: "للايجار شقة في مدينتي 140م دور تالت مفروش سوبر لوكس السعر 35000 شهري 01012345678",
  sender: "+201012345678",
  groupName: "Owners August 2026",
  groupId: "120363044918239011@g.us",
  mediaUrls: ["https://sierra-estates.net/uploads/madinaty-140m.jpg"]
});

console.log(result.action); // 'published_with_photos'
```

### 3. Regenerating Property Finder Feeds

```bash
node scripts/generate-photos-propertyfinder-feed.mjs
```

## Price Governance Rules

- **Rent**: Enforces mid-range floor of 7,000 EGP and ceiling of 300,000 EGP. Any rent $>300,000$ or $\ge 1,000,000$ is reclassified to Resale.
- **Resale**: Enforces minimum 1,000,000 EGP floor.
- **Currency**: Foreign currency ($ / USD) multiplied by 50 to reflect current Egyptian market rate.
