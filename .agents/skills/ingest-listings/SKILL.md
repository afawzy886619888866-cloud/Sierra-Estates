---
name: ingest-listings
description: "End-to-end WhatsApp inventory harvester and real estate listing ingestion engine for Sierra Estates. Ingests owner/broker unit listings from USB phone cable (S24 Ultra), WhatsApp export archives (.zip/_chat.txt), or inbound WhatsApp forward drops (01092048333 -> 01061399688 / owners groups). Performs binary photo dimension verification (>= 800x600 px), uploads media to Supabase Storage, generates luxury Arabic & English marketing descriptions, upserts into Supabase Postgres, and auto-replies with confirmation."
---

# Ingest Listings Skill · Sierra Estates (`ingest-listings`)

## Purpose

The `ingest-listings` skill automates the complete lifecycle of property listings extraction, photo dimension validation, luxury AI marketing copy generation, and cross-system synchronization across Supabase, Property Finder Ads Studio, Google Sheets, and the interactive GIS Client Map.

## Triggering

This skill is invoked whenever the user says:
- `ingest listings`
- `/ingest-listings`
- `تحديث المخزون من الواتساب`
- Or when new WhatsApp exports/media arrive via USB cable or inbound chat.

## Supported Ingestion Channels

### 1. USB MTP Cable (Samsung Galaxy S24 Ultra)
- **Script**: `scripts/pull-s24-whatsapp.ps1` & `sync-phone.bat`
- **Behavior**: Detects phone over USB, automatically sweeps WhatsApp media/chat folders, stages files into `data/whatsapp-phone-import/`, and launches the ingestion engine.

### 2. Live Inbound WhatsApp Webhook & Spy Listener
- **Target Receiver**: `01061399688` (or active OpenWA gateway line)
- **Trusted Sender**: `01092048333` (or direct unit drops from owners/brokers)
- **Target Groups**: Groups containing `owner`, `owners`, `ملاك`, or `augast`
- **Implementation**: [`workflows/lib/inbox.js`](file:///h:/Sierra%20Estates/workflows/lib/inbox.js)
  - `isListingDrop(message)`: Automatically classifies incoming unit drops.
  - `handleInboundListingDrop(message)`: Parses compound, property type, price, area, rooms; generates luxury copy; saves to Supabase `public.listings`; and immediately replies:
    ```
    ✅ تم استلام وفحص الوحدة: [كود الوحدة] بنجاح، وإضافتها إلى المخزون وخريطة العملاء ومراجعة إعلانات بروبرتي فايندر.
    ```

### 3. Staged Archive & Chat Import
- **Directory**: `data/whatsapp-phone-import/`
- **Supported Formats**: `_chat.txt`, `.zip` WhatsApp chat exports, `.jpg`, `.png`, `.webp`
- **Execution**: `node scripts/ingest-listings.mjs`

## Core Verification & Pipeline Gates

1. **Property Finder 6-Photo & Dimension Gate**:
   - Every ad submitted to Property Finder must have $\ge 6$ clean photos with dimensions $\ge 800 \times 600\text{ px}$.
   - Binary headers are inspected via `scripts/import-whatsapp-chat.mjs` (`parseImageDimensions`).
   - Photos uploaded to Supabase Storage bucket `property-media`.

2. **Luxury AI Copywriting Engine**:
   - Module: [`workflows/lib/listing-copywriter.js`](file:///h:/Sierra%20Estates/workflows/lib/listing-copywriter.js)
   - Generates dual-language assets:
     - `titleAr`: Luxury Arabic title under 80 chars.
     - `descriptionAr`: Structured, elegant Arabic description detailing layout, compound landmarks, finishing, and pricing.
     - `titleEn`: High-end English headline.
     - `descriptionEn`: Full English listing narrative.
   - Dual-engine: Attempts Gemini 2.5 Flash if API key is active; uses deterministic institutional copy engine locally for zero latency, zero failure, and minimum token cost.

3. **Multi-Channel Sync**:
   - **Supabase**: Sole backend authority (`public.listings`).
   - **GIS Map**: Synchronized via `scripts/build-map-inventory.mjs` into `data/map-inventory.json`.
   - **Google Sheets**: Synchronized via `scripts/sync-sheets-inventory-bidirectional.mjs` to Master Owner Sheet (`1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk`).
   - **Property Finder Approval Studio**: Visible on `/admin/pf-approval`.

## Execution Commands

```bash
# Full automated run (Cable check + Staging + DB Sync + Map Sync)
node scripts/ingest-listings.mjs

# Specific chat file import with DB sync
node scripts/import-whatsapp-chat.mjs --file "path/to/_chat.txt" --sync-db

# Sync Master Google Sheet
node scripts/sync-sheets-inventory-bidirectional.mjs --direction=db-to-sheet

# Rebuild GIS Map Inventory
node scripts/build-map-inventory.mjs
```
