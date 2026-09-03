 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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

 









































export class EpisodicContextCache {
   __init() {this.workingMemory = new Map()}
   __init2() {this.episodicJournal = []}
   __init3() {this.entityGraph = new Map()}
  

  constructor(customStoragePath) {;EpisodicContextCache.prototype.__init.call(this);EpisodicContextCache.prototype.__init2.call(this);EpisodicContextCache.prototype.__init3.call(this);
    this.storagePath =
      customStoragePath ||
      process.env.ECC_MEMORY_STORAGE_PATH ||
      (process.env.NODE_ENV === 'test'
        ? path.join(os.tmpdir(), `sierra-estates-ecc-${process.pid}.json`)
        : path.resolve(process.cwd(), 'obsidian-store.json'));
    this.loadFromStorage();
  }

  // --- 1. Working Memory (Hot / In-Memory Session Cache) ---

   setWorkingSession(session) {
    this.workingMemory.set(session.sessionId, {
      ...session,
      lastInteraction: _nullishCoalesce(session.lastInteraction, () => ( Date.now())),
    });
  }

   getWorkingSession(sessionId, ttlMs = 30 * 60 * 1000) {
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

   recordEpisode(episode) {
    const fullEpisode = {
      id: episode.id || `ep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: episode.timestamp || new Date().toISOString(),
      decayWeight: _nullishCoalesce(episode.decayWeight, () => ( 1.0)),
      ...episode,
    };

    this.episodicJournal.push(fullEpisode);
    this.updateEntityFromEpisode(fullEpisode);
    this.persistAsync();
    return fullEpisode;
  }

   getEpisodesForEntity(entityId, limit = 20) {
    return this.episodicJournal
      .filter((ep) => ep.entityId.toLowerCase() === entityId.toLowerCase())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

   trackPriceReduction(
    sierraCode,
    oldPrice,
    newPrice,
    source,
    ownerName
  ) {
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

   upsertEntity(profile) {
    const existing = this.entityGraph.get(profile.id);
    const updated = {
      ...existing,
      ...profile,
      tags: Array.from(new Set([...(_optionalChain([existing, 'optionalAccess', _ => _.tags]) || []), ...(profile.tags || [])])),
      historicalPrices: [
        ...(_optionalChain([existing, 'optionalAccess', _2 => _2.historicalPrices]) || []),
        ...(profile.historicalPrices || []),
      ],
      lastUpdated: new Date().toISOString(),
    };

    this.entityGraph.set(profile.id, updated);
    this.persistAsync();
    return updated;
  }

   getEntity(entityId) {
    return this.entityGraph.get(entityId) || null;
  }

   findMatchingBuyers(property



) {
    const matches = [];

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

   updateEntityFromEpisode(episode) {
    let entity = this.entityGraph.get(episode.entityId);
    if (!entity) {
      entity = {
        id: episode.entityId,
        type: episode.entityId.startsWith('SE-') || episode.entityId.startsWith('UNIT-') ? 'property' : 'buyer',
        tags: [],
        lastUpdated: episode.timestamp,
      };
    }

    if (episode.type === 'price_drop' && _optionalChain([episode, 'access', _3 => _3.data, 'optionalAccess', _4 => _4.newPrice])) {
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

    if (episode.type === 'buyer_preference' && _optionalChain([episode, 'access', _5 => _5.data, 'optionalAccess', _6 => _6.budgetMax])) {
      entity.type = 'buyer';
      entity.budgetRange = { min: episode.data.budgetMin || 0, max: episode.data.budgetMax };
      entity.compound = episode.data.targetCompound;
      entity.targetPropertyType = episode.data.targetType;
    }

    entity.lastUpdated = episode.timestamp;
    this.entityGraph.set(episode.entityId, entity);
  }

   persistAsync() {
    try {
      let currentData = {};
      if (fs.existsSync(this.storagePath)) {
        try {
          currentData = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
        } catch (e) {
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
    } catch (e2) {
      // Non-blocking fail-safe in memory
    }
  }

   loadFromStorage() {
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
              this.entityGraph.set(k, v );
            }
          }
        }
      }
    } catch (e3) {
      // In-memory initialization fallback
    }
  }
}

// Global Singleton Instance
export const eccMemory = new EpisodicContextCache();
