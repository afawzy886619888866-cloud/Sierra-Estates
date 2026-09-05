---
name: whatsapp-inventory-harvester
description: Comprehensive real estate WhatsApp scraper and NLP extraction skill for OpenClaw. Extracts Arabic/English listings from active and archived WhatsApp groups, classifies direct owner vs broker channels, normalizes compound names, and dedupes into master inventory.
---

# WhatsApp Inventory Harvester Skill · OpenClaw

## Purpose

This skill provides OpenClaw with systematic procedures and NLP pattern recognition rules to harvest, parse, classify, normalize, and deduplicate real estate property listings from WhatsApp groups (both active and archived) across New Cairo, Madinaty, Al Rehab, Mevida, Hyde Park, and Greater Cairo.

## Target WhatsApp Channels & Group Registry

OpenClaw synchronizes across all 19 canonical groups cataloged in [`whatsappGroupRegistry.ts`](file:///h:/last/Main/SE-Vercel-deploy-main/packages/agents/tools/whatsappGroupRegistry.ts):

1. **Direct Owner Channels (`sourceType: owner`)**:
   - `group-owners-aug2026` — *Owners August 2026*
   - `group-owners-units` — *Owners Units*
   - `group-new-owners` — *New Units from Owner*
   - `group-data-owner` — *Group Data Owner*
   - `group-project-inv` — *Owners Project Inventory*
   - `group-badya-owners` — *Badya Owners*
   - `group-mivida-direct` — *Mivida Direct Owner*
   - `group-hydepark-penthouses` — *Hyde Park Penthouse Direct*

2. **Broker & Network Channels (`sourceType: broker`)**:
   - `group-broker-rehab` — *Rehab & Madinaty Brokers*
   - `group-cairo-deals` — *New Cairo Deals Network*
   - `group-gulf-investors` — *Gulf Real Estate Investors*
   - `group-sodic-brokers` — *SODIC & Villette Broker Circle*
   - `group-palm-hills-inv` — *Palm Hills Resale Network*
   - `group-luxury-villas` — *Luxury Cairo Resale Villas*

3. **Archived Channels (`fromArchivedGroup: true`)**:
   - `group-archive-2025-q4` — *Archive 2025 Q4 Deals*
   - `group-archive-owners-legacy` — *Legacy Direct Owners 2025*
   - `group-archive-commercial` — *Archived Commercial & Clinics*
   - `group-archive-summer-north` — *North Coast 2025 Archived*
   - `group-archive-resale-hot` — *Hot Resales Winter 2025*

## Extraction & Normalization Protocols

### 1. Source Classification (`classifySourceType`)

- **Direct Owner**: Match indicators like `من المالك مباشر`, `مالك أصيل`, `بدون عمولة من المالك`, `direct owner`, `no commission from owner`.
- **Broker**: Match broker indicators like `عمولة 2.5%`, `مطلوب مشتري`, `تواصل مع الوسيط`, `co-brokerage`.

### 2. Egyptian Real Estate Terminology & Price Parsing

- **M (Million)**: `38 مليون`, `38M`, `38,000,000` $\rightarrow$ `38000000 EGP`.
- **K (Thousand)**: `35 الف`, `35k`, `35,000` $\rightarrow$ `35000 EGP` (rental monthly rate).
- **Operation Types**:
  - `للبيع`, `كاش`, `اقساط`, `over` $\rightarrow$ `Sale`
  - `للايجار`, `مفروش`, `قانون جديد`, `ايجار سنوي/شهري` $\rightarrow$ `Rent`
- **Finishing Specs**:
  - `الترا سوبر لوكس`, `تشطيب فندقي` $\rightarrow$ `Ultra Super Lux`
  - `سوبر لوكس`, `كامل التشطيب` $\rightarrow$ `Fully Finished`
  - `نصف تشطيب`, `محارة وحلوق`, `Core & Shell` $\rightarrow$ `Core & Shell`

### 3. Idempotency & Deduplication

- Compute hash fingerprint based on `location + compound + bedrooms + area_sqm + operation`.
- Always verify existing entries in `obsidian-store.json` before inserting new keys.
- Update `listedAt` timestamp and mark `isNewListing: true` if posted within `< 48 hours`.

## Execution Commands

```bash
# Ingest all WhatsApp channels + Master Sheets
npx tsx scripts/openclaw-task-runner.ts ingest:all

# Ingest only direct owner channels
npx tsx scripts/openclaw-task-runner.ts ingest:owners

# Reconcile master dataset
npx tsx scripts/merge-inventory-master.ts

# Run audit tests
pnpm --filter sierra-estates-client-page test -- openclaw-bulk-ingest.test.ts
```
