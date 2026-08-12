# 🔄 WhatsApp CRM & Hand-off Pipeline
> **Path:** `docs/obsidian-vault/WhatsApp CRM & Hand-off Pipeline.md`  
> **Parent Node:** `[[Sierra Estates Memory Engine]]`

This document outlines the conversational workflow, asset matching rules, document generation logic, and automated calendar schedules for **Leila** and **Sierra** when managing incoming real estate clients.

---

## 💬 Conversational Workflow & Needs Matching
When a client contacts Sierra Estates on WhatsApp:

1.  **Onboarding & Discovery:**
    *   Leila greets the client in a premium, welcoming Arabic/English tone.
    *   She asks standard qualification questions:
        *   "Are you looking for rent or resale?"
        *   "Which compounds/districts in New Cairo do you prefer? (e.g. Golden Square, Tagamoa)"
        *   "What is your target budget range and preferred bedroom count?"
2.  **Asset Query & Neural Match:**
    *   Once needs are identified, the bot queries our Firestore database (`[[Sourcing Pipeline & Lead Aggregator]]`).
    *   It selects properties matching the needs, prioritizing **Direct Owner listings** to provide the client with the highest financial discount (saving co-brokerage commissions).
3.  **Proposal Delivery:**
    *   The bot generates and delivers a dynamically compiled **PDF brochure** for the property.
    *   It also generates a premium, high-converting **Photo Offer** card (matching our sleek gold-and-black luxury layout) directly to the WhatsApp chat.

---

## 📐 Dynamic Brochure & Photo Offer Specifications
*   **The Photo Offer Card:**
    *   A high-converting visual card (similar to our luxury design standard).
    *   Features: Elegant title ("Elegant Studio/Apartment For Rent/Resale"), Compound Name, Tagline ("Ready to Move In!"), key metrics (bedrooms, size in m², price in EGP), and 3 prominent circular sub-photos of the interior (kitchen, bathroom, pool/views).
*   **The PDF Brochure:**
    *   Dynamically compiled client-side from the website listing detail page.
    *   Includes our corporate logo, primary property hero photo, complete description, full spec table, and our AI-powered valuation index (explaining why it's a "Good Deal").

---

## 🚪 Agent Handoff & Fail-Safe Auto-Closer Pipeline
We maintain a strict lead response standard to ensure clients are captured instantly:

```
[Lead Qualified & Proposal Sent by Bot]
          │
          ▼
[Forward Lead Notification to Human Agents via Admin Dashboard]
          │
          ▼
[Start 10-Minute Timeout Timer]
          │
          ├── Human Agent Responds < 10 mins ──────► Agent takes over chat (Normal Flow)
          └── No Agent Responds >= 10 mins ────────► FAIL-SAFE: AI Closer Pipeline Triggers
```

### The AI Closer Fail-Safe Action Sequence:
1.  **Bot Resumes Conversation:** Leila/Sierra automatically continues the WhatsApp dialogue to avoid lead drop-off.
2.  **Coordinates viewing:** Leila asks the client for their availability: *"Would tomorrow at 4:00 PM or Saturday at 2:00 PM work better for a viewing?"*
3.  **Google Calendar Sync:** Once the client confirms the slot, the system's Google Calendar API initiates and books a slot.
4.  **Stakeholder Invite:** The calendar invite automatically adds:
    *   The client's email.
    *   `a.fawzy8866@gmail.com` (Ahmed Fawzy).
    *   The corresponding owner or broker's contact details.
5.  **Direct Email Notification:** A detailed notification email (formatted in `[[Sales Scripts & Outreach]]`) is sent to `a.fawzy8866@gmail.com` with the date, property code, owner/broker coordinates, and the appropriate co-broke pitch.

