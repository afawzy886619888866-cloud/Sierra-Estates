# Sierra Estates — Master Integration Map

This document outlines the architecture, branch structure, deployments, and integration points for the **Sierra Estates (i:Sierra 2027)** platform.

---

## 1. Directory & Git Branch Structure

The codebase is organized under a single GitHub repository (`ahmedfawzy8866/SE.git`) using two main active branches:

```
ahmedfawzy8866/SE (GitHub Repository)
├── 🌿 main (Branch) ── Deployed to: https://admin.sierra-estates.net
│   └── Next.js App Router workspace containing the Admin dashboard, API webhooks,
│       AI Agents (Laila Bot, matchmakers, closers), and backend automations.
│
└── 🌿 client (Branch) ── Deployed to: https://sierra-estates.net
    └── Pure HTML/CSS/JS Houyez-style luxury landing page and portal.
```

### Local Checkout Setup

- **`H:\SE\`**: Checked out to the `main` branch (Admin + AI + Automations).
- **`H:\SE-client\`**: Checked out to the `client` branch (Static Client Portal).

---

## 2. Deployment Mapping (Vercel)

Both projects are hosted under the Vercel scope `sierra-estates-projects`:

| Domain | Vercel Project Name | Source Branch | Tech Stack | Root Directory |
| --- | --- | --- | --- | --- |
| **`sierra-estates.net`** | `sierra-estates` | `client` | HTML5 + CSS3 + Vanilla JS | `/` |
| **`admin.sierra-estates.net`** | `sierra-estates-admin` | `main` | Next.js 16 (App Router) | `/apps/sierra-estates-realty` |

---

## 3. Database Wiring (Firebase / Firestore)

Both the Client Portal and the Admin/AI backend are wired directly to the same Firestore database instance (**`sierra-blu`**), keeping listings, compounds, and inquiries completely in sync.

```
┌──────────────────────────────────────┐
│  Scrapers & Duplicators (Automations) │
└──────────────────┬───────────────────┘
                   │ writes new units
                   ▼
       ┌───────────────────────┐
       │   Firestore Database  │◄─── Syncs edits
       │     (sierra-blu)      │
       └─────┬───────────▲─────┘
             │ reads     │ writes leads
             ▼           │
 ┌───────────────────────┴──┐
 │    Client Portal (Web)   │
 │   (sierra-estates.net)   │
 └──────────────────────────┘
```

### Core Firestore Collections

1. **`houyez_listings`**: The source of truth for active properties. Written to by scrapers and the admin dashboard; read in real-time by the client portal.
2. **`houyez_compounds`**: Stores compound metadata (grades, average prices, locations). Read by both admin and client pages.
3. **`inquiries`**: Lead capture collection. When a visitor submits a contact or viewing form on the client portal, it writes here.
4. **`careers`**: Careers pipeline. Stores applications submitted via the client portal's careers page.

---

## 4. Automation & Bot Sync

- **`01-whatsapp-scraper`**: Extracts listings from WhatsApp messages.
- **`02-owner-search`**: Finds direct-owner listings on platforms.
- **`03-owner-contact`**: Reaches out to direct owners automatically.
- **`04-email-sender`**: Dispatches automated email pitches.
- **`05-unit-adder`**: Processes raw leads and safely appends them into `houyez_listings` without duplication.
- **`whatsapp-bot`**: Listens in real-time to the `inquiries` collection, triggering the Laila bot to follow up with new leads on WhatsApp.

---

## 5. Third-Party & Portal Integrations

### Property Finder (PF) Integration

Managed by `PFIntegrationService.ts` and the webhook router:

- **Lead Syncing**: Incoming leads from Property Finder are ingested by `/api/cron/sync-leads` or the webhook, parsed, and added to the `leads` collection in Firestore.
- **Listing Syncing**: Properties in the `listings` collection are published to the Property Finder Enterprise API (`atlas.propertyfinder.com/v1`) via `/api/sync/publish` or updated automatically by `/api/cron/sync-listings`.

### EasyListing Sourcing Hub

The intake tool for manual sourcing:

- **AI Extraction**: Converts raw copypasted chat logs (e.g. from WhatsApp) into formatted real estate data models.
- **Verification**: Cross-references parsed compound names, bedroom configurations, and pricing patterns against compound limits.
- **Deduplication**: Resolves potential conflicts before writing verified clean units into the `listings` and `houyez_listings` collections.

---

## 6. Security & Credentials

- All API keys, WhatsApp tokens, and Firebase Service Accounts are securely stored as Vercel Environment Variables (under project `sierra-estates-admin`) and in local `.env.local` files.
- Static client configurations are safely stored in `firebase-config.js` (using public web keys only).
