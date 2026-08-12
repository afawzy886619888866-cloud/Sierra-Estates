/**
 * Sierra Estates — Central Intelligence Bootstrap
 *
 * Initialises the MemoryEngine singleton and registers all active
 * agents and skills so every service in the app shares one context.
 */
import { memoryEngine } from '@sierra-estates/memory-engine';

import { pfClient } from './property-finder-client';
import { closerAgent } from '@sierra-estates/agents/src/closer-agent-enhanced';

// ── Agent registrations ────────────────────────────────────────────
const CORE_AGENTS = [
  { id: 'scribe',      name: 'Scribe',      domain: 'intake',       description: 'Lead qualification & intake'         },
  { id: 'curator',     name: 'Curator',     domain: 'research',     description: 'Property research & curation'        },
  { id: 'matchmaker',  name: 'Matchmaker',  domain: 'matching',     description: 'Client-property matching engine'     },
  { id: 'closer',      name: 'Closer',      domain: 'closing',      description: 'Deal closing & negotiation'          },
  { id: 'leila',       name: 'Leila',       domain: 'client-facing',description: 'Client-facing qualification agent'   },
  { id: 'nexus',       name: 'Nexus',       domain: 'orchestration',description: 'Master core: persona + intelligence' },
  { id: 'antigravity', name: 'AntiGravity', domain: 'chat',         description: 'Omnichannel chat command processor'  },
];

// ── Skill registrations ────────────────────────────────────────────
const CORE_SKILLS = [
  { 
    id: 'property-finder', 
    name: 'Property Finder', 
    description: 'Search & filter property listings via Enterprise API',     
    execute: async (params: any) => {
      try {
        return await pfClient.searchListings(params || {});
      } catch (err: any) {
        return { error: err.message, data: [] };
      }
    }
  },
  { 
    id: 'closer-negotiate', 
    name: 'AI Deal Closer', 
    description: 'Generate AI proposals and counter-offers via Closer Agent', 
    execute: async (context: any) => {
      return await closerAgent.generateIntelligentProposal(context);
    } 
  },
  { id: 'whatsapp-send',   name: 'WhatsApp Send',   description: 'Send WhatsApp messages via Twilio',    execute: async (p: unknown) => p },
  { id: 'telegram-alert',  name: 'Telegram Alert',  description: 'Send Telegram notifications',          execute: async (p: unknown) => p },
  { id: 'sheets-sync',     name: 'Sheets Sync',     description: 'Sync data with Google Sheets',         execute: async (p: unknown) => p },
  { id: 'crm-lookup',      name: 'CRM Lookup',      description: 'Look up lead data in Firestore CRM',   execute: async (p: unknown) => p },
];

let bootstrapped = false;

/**
 * Call once at server startup (e.g. in middleware or a top-level server component).
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function bootstrapIntelligence(): void {
  if (bootstrapped) return;

  for (const agent of CORE_AGENTS) {
    memoryEngine.registerAgent(agent);
  }

  for (const skill of CORE_SKILLS) {
    memoryEngine.registerSkill(skill);
  }

  bootstrapped = true;
}

/** Pre-bootstrapped singleton — import this anywhere you need the engine. */
export { memoryEngine };
