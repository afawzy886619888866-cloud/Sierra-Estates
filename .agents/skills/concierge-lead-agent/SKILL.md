---
name: concierge-lead-agent
description: WhatsApp and Telegram lead concierge agent for Sierra Estates client communication, lead scoring, and automated inquiry handling.
---

# Concierge & Lead Outreach Agent Skill

## Overview

Handles multi-channel inbound inquiries from prospective real-estate buyers, investors, and property owners across WhatsApp and Telegram.

## Responsibilities

- Parse inbound lead messages and extract property preferences (location, budget, property type, payment terms).
- Score lead priority (High / Medium / Low) and dispatch to human brokers or Stage-9 Closer.
- Maintain message histories and conversation state.
- Handle direct-owner cold outreach, objections, and price alignment.

## Entry Points

- `apps/agents/whatsapp-bot/`
- `packages/whatsapp-agent/`
- `apps/sierra-estates-realty/app/api/admin/bots/route.ts`
- `workflows/09-owner-outreach/outreach.js`
- `workflows/03-owner-contact/contact.js`

## High-Converting Communication Principles

### 1. Inbound Speed-to-Lead (Under 60 Seconds)

- Acknowledge inquiry immediately with warmth and high status.
- Qualify intention, timeline, and cash readiness before scheduling viewings.

### 2. Direct-Owner Outreach (Cold Touch)

- Lead with a specific, qualified buyer anchor instead of broker commission pitches.
- Never lead with apologetic groveling ("بعتذر على الإزعاج").
- Reframe from cost to liquidity and speed.

### 3. Objection Handling ("ممنوع الوسطاء")

- Respect owner autonomy: acknowledge they do not want generic broker spam.
- Clarify buyer representation: "أنا بمثل المشتري بشكل مباشر وجاهز للمعاينة، هل يضايق حضرتك لو نسقنا معاينة للمشتري فقط؟"

### 4. Tactical Empathy & Closed Comps Price Alignment

- Anchor to recent actual closed transactions in the compound rather than listing averages.
- Propose cash buyer ceilings without challenging the owner's pride.

### 5. Follow-Up & Re-Engagement Triggers

- Use short, single-sentence re-engagement questions: "هل لسه حضرتك بتفكر في بيع/شراء الوحدة في [الكومباوند]؟"
- Utilize 15-to-25 second conversational voice notes for higher trust and response rates.
