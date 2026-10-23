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

export class GravityMemory {
  private static seenHashes: Set<string> = new Set();

  /**
   * Memory-backed deduplication hook: checks if a record hash has already been seen.
   * Returns true if seen previously, false if new (and marks as seen).
   */
  static seen(recordHash: string): boolean {
    if (!recordHash) return false;
    if (this.seenHashes.has(recordHash)) {
      return true;
    }
    this.seenHashes.add(recordHash);
    return false;
  }

  static reset(): void {
    this.seenHashes.clear();
  }

  seen(recordHash: string): boolean {
    return GravityMemory.seen(recordHash);
  }
}

export function seen(recordHash: string): boolean {
  return GravityMemory.seen(recordHash);
}

