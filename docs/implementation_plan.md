# 🏗️ Technical Blueprint: Sierra Estatese AI OS (V4.0)

This plan outlines the end-to-end engineering effort to transform Sierra Estatese into a fully automated, intelligence-driven Real Estate OS.

## Phase 1: WhatsApp Scraper & Parser (✅ COMPLETED)

Goal: Automate inventory acquisition from broker groups.

### ⚙️ Completed Changes

- `Broker_Listings` collection added to `schema.ts`.
- `WhatsAppParserService.ts` implemented with Gemini 1.5 Flash.
- `/api/webhooks/whatsapp` endpoint created for real-time ingestion.
- Local WhatsApp bot updated to forward messages to the platform.

---

## Phase 2: Hybrid Inventory Database Structure (⏳ IN PROGRESS)

Goal: Separate company assets from broker listings and implement maintenance logic.

### ⚙️ Proposed Changes

#### [NEW] [MaintenanceMonitor.ts](file:///c:/OpenClaw/my-app/lib/services/MaintenanceMonitor.ts)

- Logic to flag units not updated in >30 days.

#### [NEW] [ImageLinkHub.tsx](file:///c:/OpenClaw/my-app/components/Operations/ImageLinkHub.tsx)

- New UI for uploading images that requires entering a `Unit Code`.
- Includes "Skip" functionality for direct uploads.

---

## Phase 3: Matching Engine & OpenClaw WhatsApp Bot (⏳ PLANNED)

Goal: Automate customer intake and discovery via official WhatsApp Cloud API.

### ⚙️ Proposed Changes

#### [MODIFY] [openclaw/route.ts](file:///c:/OpenClaw/my-app/app/api/openclaw/route.ts)

- Upgrade to handle classification tasks (Budget/Location).

#### [NEW] [GoogleIntegrationService.ts](file:///c:/OpenClaw/my-app/lib/services/GoogleIntegrationService.ts)

- Google Sheets sync for Broker Listings.
- Google Calendar event creation for viewings.

---

## Phase 4: KPI Tracking Dashboard (✅ COMPLETED)

Goal: Performance accountability for Sales Advisors.

### ⚙️ Completed Changes

- `KPIProgressBar.tsx` component created.
- Integrated into `LeadsFlow.tsx` sidebar (tracking 25 calls / 50 messages targets).

---

## Phase 5: Luxury UI/UX & Bilingual Polish (⏳ IN PROGRESS)

Goal: Visual excellence (Cinzel/Josefin Sans/Noto) and RTL support.

### ⚙️ Proposed Changes

#### [MODIFY] [layout.tsx](file:///c:/OpenClaw/my-app/app/layout.tsx)

- Inject Google Fonts: **Cinzel**, **Josefin Sans**, **Noto Naskh Arabic**, **Noto Sans Arabic**.
- Status: Basic fonts (IBM Plex Arabic, Playfair Display) are already active.

#### [MODIFY] [globals.css](file:///c:/OpenClaw/my-app/app/globals.css)

- Define text styles for luxury typography.

---

## 🛑 Open Questions (User Review Required)

1. **WhatsApp Scraper**: Which tool are you using to push group messages to the system? I will build the `/api/webhook/whatsapp` endpoint to receive them.
2. **OpenClaw Sales Script**: Can you provide the text of the sales script for better AI tuning?
3. **Google API Credentials**: Should I expect a Service Account JSON for Sheets/Calendar?
4. **Broker_Listings Migration**: Should I move existing data in `listings` to the new structure now?

## Verification Plan

### Automated Tests

- Test parsing regex and Gemini logic with raw WhatsApp messages.
- Verify Firestore triggers for `lastUpdated` and `KPI` updates.

### Manual Verification

- Deploy UI components and verify Luxury Typography (Cinzel/Noto) in the dashboard.
- Simulate WhatsApp webhook for lead classification.
