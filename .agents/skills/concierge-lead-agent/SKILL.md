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

## Entry Points

- `apps/agents/whatsapp-bot/`
- `packages/whatsapp-agent/`
- `apps/sierra-estates-realty/app/api/admin/bots/route.ts`
