# 📥 Sourcing Pipeline & Lead Aggregator
> **Path:** `docs/obsidian-vault/Sourcing Pipeline & Lead Aggregator.md`  
> **Parent Node:** `[[Sierra Estates Memory Engine]]`

The primary goal of our sourcing pipeline is to aggregate all properties in the New Cairo (Egypt) resale and rental markets, identify direct-from-owner listings, and filter the absolute best opportunities for clients.

---

## 🎯 The 40% Direct Owner Listing Target
*   **The Problem:** Traditional brokerages rely heavily on sharing listings, leading to massive property duplication and high broker-cooperation fees.
*   **The Strategy:** Sierra Estates prioritizes **direct owner listings** (FSBO - For Sale By Owner). We maintain a minimum of **40%+ direct owner** ratio inside our active database.
*   **The Value:** Owner listings yield higher negotiation margins, unique exclusive terms, and direct communication to facilitate faster, cleaner closures.

---

## 📥 Multi-Channel Sourcing Channels
Our ingestion system monitors five core channels:

### 1. WhatsApp Sourcing Groups
*   **Mechanism:** Brokers and owners share hundreds of listings daily inside dedicated WhatsApp/Telegram real estate groups in Egypt.
*   **Automation:** Agents copy-paste these raw chat messages into **The Scribe Module** inside the Admin Portal.
*   **AI Normalization:** Our parser extracts compound names, pricing, payment terms, and contact numbers, converting raw chat spam into clean, organized database listings.

### 2. Dubizzle (formerly OLX Egypt) & Facebook Groups
*   **Mechanism:** Direct owners frequently list properties on Dubizzle Egypt and Facebook Marketplace/groups to bypass brokerage fees.
*   **Targeting:** Leila/Sierra bot monitors and extracts listings tagged with "من المالك مباشرة" (Direct from owner) or matching direct mobile numbers.

### 3. Bayut Egypt & Aqarmap
*   **Mechanism:** Primary developer launches and large secondary-market broker listings.
*   **Analytics:** Used as base pricing indices to calculate whether a new sourced unit is undervalued.

### 4. Google Sheets Aggregators
*   **Mechanism:** Standardized sheets containing owner lists, developer payment schedules, and inventory spreadsheets.
*   **Integration:** Synced directly into our Firestore database core.

---

## 🔬 Ingestion & Vetting Protocol
When a new property is aggregated, it passes through this vetting sequence:

```
[Raw Listing Aggregated]
          │
          ▼
[AI Scribe Parsing (Extracts Specs & Contact)]
          │
          ▼
[Identify Listing Entity Type]
          ├── Owner Contact Info (Direct Owner Listing) ──► Flag: Owner-Priority (EGP Savings)
          └── Broker Contact Info (Co-Broke Listing) ─────► Flag: Co-Broke Script Triggered
          │
          ▼
[Run Market Valuation Model (Is Price/SqM Undervalued?)]
          ├── YES (Undervalued by >= 10%) ───────────────► Feature on Website Home
          └── NO (Market Average or Overpriced) ─────────► Save in Backup CRM Database
```

