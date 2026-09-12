/**
 * eccMemoryEngine.ts
 *
 * Episodic Context Cache (ECC) & Semantic Entity Graph Memory Engine for Sierra Estates.
 * Implements a 3-tier memory model:
 * 1. Working Memory (Hot, TTL-based session state)
 * 2. Episodic Memory (Warm, chronological journal of price drops, negotiations, viewings)
 * 3. Semantic Entity Graph (Cold/Durable, entities: Buyers, Owners, Properties, Relationships)
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// A price drop at or above this percentage is tagged as a hot/distressed
// deal. Mirrors apps/api/ecc_memory_engine.py — the two are not wired
// together (TS monorepo package vs. Python microservice), so this constant
// must be changed in both places if the threshold policy changes.
export const HOT_DEAL_THRESHOLD_PCT = 8.0;

export type EpisodeType =
  | 'price_drop'
  | 'negotiation_offer'
  | 'viewing_scheduled'
  | 'inspection_feedback'
  | 'buyer_preference'
  | 'contract_stage'
  | 'owner_listing_drop';

export interface Episode {
  id: string;
  type: EpisodeType;
  entityId: string; // Sierra Code, Buyer Phone, or Owner Phone
  actor: string; // e.g. "Owner Ahmed", "Buyer Tarek", "OpenClaw Harvester"
  timestamp: string;
  summary: string;
  data: Record<string, any>;
  decayWeight?: number; // 0.0 to 1.0 based on recency
}

export interface EntityProfile {
  id: string;
  type: 'buyer' | 'owner' | 'broker' | 'property';
  name?: string;
  contact?: string;
  compound?: string;
  budgetRange?: { min: number; max: number };
  targetPropertyType?: string;
  historicalPrices?: Array<{ price: number; timestamp: string; source: string }>;
  tags: string[];
  lastUpdated: string;
}

export interface WorkingMemorySession {
  sessionId: string;
  userId: string;
  activeCompoundFilter?: string;
  activeBudgetMax?: number;
  lastInteraction: number;
  ephemeralData: Record<string, any>;
}

export class EpisodicContextCache {
  private workingMemory: Map<string, WorkingMemorySession> = new Map();
  private episodicJournal: Episode[] = [];
  private entityGraph: Map<string, EntityProfile> = new Map();
  private storagePath: string;

  constructor(customStoragePath?: string) {
    this.storagePath =
      customStoragePath ||
      process.env.ECC_MEMORY_STORAGE_PATH ||
      (process.env.NODE_ENV === 'test'
        ? path.join(os.tmpdir(), `sierra-estates-ecc-${process.pid}.json`)
        : path.resolve(process.cwd(), 'obsidian-store.json'));
    this.loadFromStorage();
  }

  // --- 1. Working Memory (Hot / In-Memory Session Cache) ---

  public setWorkingSession(session: WorkingMemorySession): void {
    this.workingMemory.set(session.sessionId, {
      ...session,
      lastInteraction: session.lastInteraction ?? Date.now(),
    });
  }

  public getWorkingSession(sessionId: string, ttlMs = 30 * 60 * 1000): WorkingMemorySession | null {
    const session = this.workingMemory.get(sessionId);
    if (!session) return null;

    if (Date.now() - session.lastInteraction > ttlMs) {
      this.workingMemory.delete(sessionId);
      return null;
    }

    session.lastInteraction = Date.now();
    return session;
  }

  // --- 2. Episodic Memory Journal (Chronological Event Stream) ---

  public recordEpisode(episode: Omit<Episode, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): Episode {
    const fullEpisode: Episode = {
      id: episode.id || `ep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: episode.timestamp || new Date().toISOString(),
      decayWeight: episode.decayWeight ?? 1.0,
      ...episode,
    };

    this.episodicJournal.push(fullEpisode);
    this.updateEntityFromEpisode(fullEpisode);
    this.persistAsync();
    return fullEpisode;
  }

  public getEpisodesForEntity(entityId: string, limit = 20): Episode[] {
    return this.episodicJournal
      .filter((ep) => ep.entityId.toLowerCase() === entityId.toLowerCase())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public getRecentEpisodes(limit = 10, entityId?: string): Episode[] {
    const list = entityId
      ? this.episodicJournal.filter((ep) => ep.entityId.toLowerCase() === entityId.toLowerCase())
      : this.episodicJournal;
    return [...list]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public getHotDeals(limit = 10): Episode[] {
    return this.episodicJournal
      .filter(
        (ep) =>
          ep.type === 'price_drop' &&
          (ep.data?.isHotDeal === true || (ep.data?.dropPct && ep.data.dropPct >= HOT_DEAL_THRESHOLD_PCT))
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }


  public trackPriceReduction(
    sierraCode: string,
    oldPrice: number,
    newPrice: number,
    source: string,
    ownerName?: string
  ): { episode: Episode; dropPct: number; isHotDeal: boolean } {
    const dropAmount = oldPrice - newPrice;
    const dropPct = oldPrice ? Number(((dropAmount / oldPrice) * 100).toFixed(1)) : 0;
    const isHotDeal = dropPct >= HOT_DEAL_THRESHOLD_PCT;

    const episode = this.recordEpisode({
      type: 'price_drop',
      entityId: sierraCode,
      actor: ownerName || 'Direct Owner',
      summary: `Price reduction of ${dropPct}% from ${oldPrice.toLocaleString()} EGP to ${newPrice.toLocaleString()} EGP (${source})`,
      data: {
        sierraCode,
        oldPrice,
        newPrice,
        dropAmount,
        dropPct,
        source,
        isHotDeal,
      },
    });

    return { episode, dropPct, isHotDeal };
  }

  // --- 3. Semantic Entity Graph ---

  public upsertEntity(profile: EntityProfile): EntityProfile {
    const existing = this.entityGraph.get(profile.id);
    const updated: EntityProfile = {
      ...existing,
      ...profile,
      tags: Array.from(new Set([...(existing?.tags || []), ...(profile.tags || [])])),
      historicalPrices: [
        ...(existing?.historicalPrices || []),
        ...(profile.historicalPrices || []),
      ],
      lastUpdated: new Date().toISOString(),
    };

    this.entityGraph.set(profile.id, updated);
    this.persistAsync();
    return updated;
  }

  public getEntity(entityId: string): EntityProfile | null {
    return this.entityGraph.get(entityId) || null;
  }

  public findMatchingBuyers(property: {
    compound: string;
    propertyType: string;
    price: number;
  }): EntityProfile[] {
    const matches: EntityProfile[] = [];

    for (const entity of this.entityGraph.values()) {
      if (entity.type === 'buyer') {
        const matchesCompound = !entity.compound || entity.compound.toLowerCase().includes(property.compound.toLowerCase());
        const matchesType = !entity.targetPropertyType || entity.targetPropertyType.toLowerCase().includes(property.propertyType.toLowerCase());
        const matchesBudget = !entity.budgetRange || property.price <= entity.budgetRange.max * 1.1;

        if (matchesCompound && matchesType && matchesBudget) {
          matches.push(entity);
        }
      }
    }

    return matches;
  }

  // --- 4. Persistence & Storage Synchronization ---

  private updateEntityFromEpisode(episode: Episode): void {
    let entity = this.entityGraph.get(episode.entityId);
    if (!entity) {
      entity = {
        id: episode.entityId,
        type: episode.entityId.startsWith('SE-') || episode.entityId.startsWith('UNIT-') ? 'property' : 'buyer',
        tags: [],
        lastUpdated: episode.timestamp,
      };
    }

    if (episode.type === 'price_drop' && episode.data?.newPrice) {
      entity.historicalPrices = [
        ...(entity.historicalPrices || []),
        {
          price: episode.data.newPrice,
          timestamp: episode.timestamp,
          source: episode.data.source || 'WhatsApp Drop',
        },
      ];
      if (episode.data.isHotDeal) {
        entity.tags.push('HOT_DISTRESSED_DEAL');
      }
    }

    if (episode.type === 'buyer_preference' && episode.data?.budgetMax) {
      entity.type = 'buyer';
      entity.budgetRange = { min: episode.data.budgetMin || 0, max: episode.data.budgetMax };
      entity.compound = episode.data.targetCompound;
      entity.targetPropertyType = episode.data.targetType;
    }

    entity.lastUpdated = episode.timestamp;
    this.entityGraph.set(episode.entityId, entity);
  }

  private persistAsync(): void {
    try {
      let currentData: Record<string, any> = {};
      if (fs.existsSync(this.storagePath)) {
        try {
          currentData = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
        } catch {
          currentData = {};
        }
      }

      currentData['ecc_memory'] = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        total_episodes: this.episodicJournal.length,
        total_entities: this.entityGraph.size,
        recent_episodes: this.episodicJournal.slice(-50),
        entities: Object.fromEntries(this.entityGraph.entries()),
      };

      fs.writeFileSync(this.storagePath, JSON.stringify(currentData, null, 2), 'utf-8');
    } catch {
      // Non-blocking fail-safe in memory
    }
  }

  private loadFromStorage(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed['ecc_memory']) {
          const ecc = parsed['ecc_memory'];
          if (Array.isArray(ecc.recent_episodes)) {
            this.episodicJournal = ecc.recent_episodes;
          }
          if (ecc.entities && typeof ecc.entities === 'object') {
            for (const [k, v] of Object.entries(ecc.entities)) {
              this.entityGraph.set(k, v as EntityProfile);
            }
          }
        }
      }
    } catch {
      // In-memory initialization fallback
    }
  }
}

// Global Singleton Instance
export const eccMemory = new EpisodicContextCache();
