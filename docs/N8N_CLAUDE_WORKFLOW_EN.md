# Sierra Estates: Automated Technical Workflow (n8n / Claude Code Guide)

This document outlines the technical architecture and automation flows for the Sierra Estates PropTech system. It is designed to be fed into automation engines (like n8n, Make, or Claude Code) to build the operational pipelines.

## System Architecture Overview

The system relies on a seamless handoff between AI automation and Human validation.

- **Database (Source of Truth):** Firebase / Firestore.
- **Intermediary Database:** Google Sheets (for raw data dumping).
- **Core Integrations:** WhatsApp API (Twilio), Telegram Bot API, OpenClaw (Routing).

---

## 1. Phase 1: Outbound Owner Outreach (Bulk WhatsApp Sender)

**Objective:** Automate the initial contact with owners using a staggered bulk-sending approach to avoid WhatsApp bans, followed by human handover for negotiation.

### Infrastructure & Rules

- **Database:** `Available_Owners_Sheet` (Contains < 1000 units).
- **Channels:** 4 dedicated WhatsApp numbers.
- **Schedule:** 12:00 PM to 8:00 PM (8-hour window).
- **Pacing:** Every 2 hours, each number sends to 30 owners.
- **Daily Capacity:** 4 numbers *30 messages* 4 batches = 480 owners contacted daily.

### Phase 1 Workflow Logic

1. **Trigger:** Cron Job (Scheduled Trigger) running at 12 PM, 2 PM, 4 PM, 6 PM, and 8 PM.
2. **Action (Google Sheets Node - Read):**
   - Fetch 120 rows where `Contact_Status` == `Pending`.
   - Distribute the 120 rows evenly across the 4 WhatsApp API endpoints (30 rows per number).
3. **Action (WhatsApp API Nodes - e.g., Baileys/Twilio):**
   - Send the initial AI-generated icebreaker message.
4. **Action (Google Sheets Node - Update):**
   - Update `Contact_Status` to `Contacted_Batch_X` to prevent duplicate sending.
5. **Action (Webhook / Routing):**
   - If the owner replies, route the incoming message to the **Human Inside Sales Specialist** on the CRM/Shared Inbox to take over the conversation and close the listing.

---

## 2. Phase 2: Human Validation & CRM Sync (The Operation Flow)

**Objective:** Human operator verifies the raw lead after the owner replies to the bot, enriches it, and pushes it to the CRM.

### Phase 2 Workflow Logic

1. **Trigger:** Polling Google Sheets for changes where `Status` changes from `Pending_Human_Validation` to `Verified_Publish`.
2. **Action (Firestore Node):**
   - Create a new document in the `properties` collection.
   - Assign a unique AI Code (e.g., `OMM406` -> Owner, Mountain View, Mohamed).
3. **Action (HTTP Request Node):**
   - Trigger the Property Finder XML feed update or post ad via API.

---

## 3. Phase 3: Intelligent Triage (The Leila Bot Flow)

**Objective:** Handle inbound leads coming from the published ads, qualify them, and sync to the CRM.

### Phase 3 Workflow Logic

1. **Trigger:** Webhook from WhatsApp/Telegram (Client responding to ad).
2. **Router Node (OpenClaw):**
   - Route message to the `Leila` Agent.
3. **LLM Node (Leila - High Tier LLM):**
   - **System Prompt:** "You are Leila, Sierra Estates's luxury virtual assistant. Keep responses under 40 words. Ask discovery questions: {Apartment/Villa?, Furnishing?, Location?, Move-in date?}. Offer the Elite Voucher for serious clients."
4. **Action (Firestore Node):**
   - Update/Upsert the `clients` collection.
   - Set status to `Hot_Lead`.
   - Attach the top 3 matching `properties` to the client's digital portfolio array.

---

## 4. Phase 4: Field Closing & Automation (The Closer Flow)

**Objective:** Human Closer takes over, schedules viewing, and system handles follow-ups.

### Phase 4 Workflow Logic

1. **Trigger:** Firestore trigger when a `viewing_appointment` is created by the Closer in the CRM.
2. **Action (Google Calendar Node):**
   - Create a calendar event for the Closer and the Client.
3. **Action (WhatsApp API Node):**
   - Send automated confirmation message to the client: "Your viewing is confirmed at [Time]. Please reply with 'Confirm'."
4. **Delay Node (Wait for Event):**
   - Wait 4 hours after the appointment time.
5. **Conditional Logic:**
   - Check if CRM `feedback` field is updated.
   - If empty: Send a Telegram Alert to the Sales Manager: *"Alert: Closer [Name] has not updated feedback for viewing [ID]."*

---
**KPI Implementation Note for LLMs:**
Ensure that all LLM nodes use strict `max_tokens` limits and structured output (JSON schema) to adhere to the core KPI: **Token Efficiency (Lowest Token Usage = Highest Rating)**.
