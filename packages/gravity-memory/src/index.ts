/**
 * Gravity Memory — TypeScript Contract & Definitions
 * Backed by OpenMemory storage engine.
 */

export interface GravityMemoryFact {
  category: string;
  source: string;
  fact: Record<string, unknown>;
  weight?: number;
  timestamp?: string;
}

export interface GravityMemoryEvent {
  content?: string;
  hash?: string;
  record_hash?: string;
  normalized_key?: string;
  [key: string]: unknown;
}

export interface GravityPersona {
  name: string;
  role: string;
  version: string;
  system: string;
}

export const SIERRA_PERSONA: GravityPersona = {
  name: 'Sierra Master Bot',
  role: 'Luxury Real Estate AI Advisor',
  version: '12.0',
  system: 'Sierra Blu Realty',
};
