# Sierra Blue AI Sales Architecture & Implementation Guide

This directory documents the **Sierra Blue AI Sales Architecture**, tracking both the standalone Python reference design and its production integration inside the Next.js / Supabase monorepo.

---

## 1. Architectural Blueprint & Philosophy

The Sierra Blue AI Advisor operates on the philosophy of **"ما وراء الوساطة (Beyond Brokerage)"**:
- **Radical Transparency**: Full honesty regarding live unit availability (`متاحة` vs `مؤجرة` vs `غير متاحة`).
- **Consultative Discovery**: Shifting the customer conversation from querying a single unit to personalized advisory.
- **Warm Professional Tone**: Egyptian dialect designed for luxury compound clients in New Cairo / Fifth Settlement.

---

## 2. The 6-Step Sales Funnel & Production Mapping

| Funnel Step | Objective | Python Reference (`sierra_blue_bot_implementation.py`) | Live Next.js Production Implementation |
|---|---|---|---|
| **Step 1: Greeting & Initial Engagement** | Receive customer, extract unit code/URL, capture move-in timeframe | `SierraBlueBot.process_inquiry()` | [`WhatsAppConversationalService.ts`](file:///H:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/lib/services/WhatsAppConversationalService.ts) |
| **Step 2: API & Inventory Verification** | Query live database for unit status | `PropertyFinderAPI.check_property_availability()` | [`ListingAvailabilitySyncService.ts`](file:///H:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/lib/services/ListingAvailabilitySyncService.ts) & Supabase `public.listings` |
| **Step 3: Transparency Report** | Immediate honest status report (Available / Rented / Not Found) | `SierraBlueBot._step3_availability_report()` | Dynamic System Prompt ([`sierra_blue_bot.ts`](file:///H:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/lib/prompts/sierra_blue_bot.ts)) |
| **Step 4: Discovery Pivot** | 4-question consultative interview (type, furnishing, location, must-haves) | `SierraBlueBot._step4_discovery_pivot()` | ECC Memory Engine & Unified Stakeholder Profiling |
| **Step 5: Matching & Scheduling** | Recommend 3–5 matching units & propose joint viewing schedule | `SierraBlueBot._step5_matching_and_scheduling()` | [`viewing-engine.ts`](file:///H:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/lib/services/viewing-engine.ts) & [`rag-inventory-service.ts`](file:///H:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/lib/services/rag-inventory-service.ts) |
| **Step 6: Human Handover** | Package lead profile, history, and booked viewing for human closer | `SierraBlueBot._step6_human_handover()` | [`OmnichannelChatService.ts`](file:///H:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/lib/services/OmnichannelChatService.ts) & CRM Stakeholder Pipeline |

---

## 3. The Closed-Loop Inventory Outreach Automation

To keep inventory 100% accurate without manual broker audits:
1. **Unavailable Unit Selection**: Admins query unavailable units (sorted by price ascending) in `InventoryCommandView.tsx`.
2. **Dispatched WhatsApp Outreach**: Automated polite Arabic messages query the owner if their property is still available or has updated terms.
3. **Automated Inbound Sync**: When the owner responds via WhatsApp, [`ListingAvailabilitySyncService.ts`](file:///H:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/lib/services/ListingAvailabilitySyncService.ts) parses the message:
   - If confirmed available (`متاح`, `جاهزة`): instantly flips status in Supabase `public.listings` to `available`, updates price, and attaches photos.
   - If rented or sold (`اتأجرت`, `اتباعت`): marks status as `rented` or `sold`.
   - If direct owner sends a new unit listing: parses specs and creates a new entry in `public.listings`.

---

## 4. Reference Files in This Directory

- `sierra_blue_bot_implementation.py`: Pure Python implementation of the 6-step state machine, data models (`PropertyData`, `LeadProfile`), and mock APIs.
- `sierra_blue_api_integration.py`: Integration examples for HubSpot, Property Finder, Twilio WhatsApp, Google Calendar, and Mixpanel.
- `system_prompt_and_deployment.py`: Master prompt specification, Dockerfile, deployment bash script, and monitoring alerting rules.
