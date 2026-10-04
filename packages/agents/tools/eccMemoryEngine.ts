/**
 * eccMemoryEngine.ts
 *
 * Episodic Context Cache (ECC) & Semantic Entity Graph Memory Engine for Sierra Estates.
 * Implements a 3-tier memory model:
 * 1. Working Memory (Hot, TTL-based session state)
 * 2. Episodic Memory (Warm, chronological journal of price drops, negotiations, viewings)
 * 3. Semantic Entity Graph (Cold/Durable, entities: Buyers, Owners, Properties, Relationships)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@sierra-estates/db';

// A price drop at or above this percentage is tagged as a hot/distressed
// deal. Mirrors apps/api/ecc_memory_engine.py — the two are not wired
// together (TS monorepo package vs. Python microservice), so this constant
// must be changed in both places if the threshold policy changes.
export const HOT_DEAL_THRESHOLD_PCT = 8.0;

export type EpisodeType =
  | 'price_drop'
  | 'price_normalized'
  | 'negotiation_offer'
  | 'ai_counter_offer'
  | 'viewing_scheduled'
  | 'inspection_feedback'
  | 'buyer_preference'
  | 'contract_stage'
  | 'deal_closed'
  | 'objection_handled'
  | 'due_diligence_verified'
  | 'lead_scored'
  | 'owner_listing_drop';

export interface PriceNormalizationOptions {
  propertyType?: string | null;
  mode?: 'rent' | 'sale' | string | null;
  currency?: string | null;
  compound?: string | null;
  usdToEgpRate?: number;
}

export interface PriceNormalizationResult {
  priceEGP: number;
  originalInput: string | number;
  mode: 'rent' | 'sale';
  confidence: number;
  rationale: string;
  isAdjusted: boolean;
}

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

export const DEFAULT_USD_TO_EGP = 50.0;

export const ECC_MARKET_FLOORS_EGP: Record<string, { rent: number; sale: number }> = {
  villa:            { rent:  30_000, sale:  7_000_000 },
  'standalone villa': { rent: 45_000, sale: 10_000_000 },
  standalone:       { rent:  45_000, sale: 10_000_000 },
  townhouse:        { rent:  20_000, sale:  5_000_000 },
  'twin house':     { rent:  20_000, sale:  5_000_000 },
  duplex:           { rent:  15_000, sale:  4_000_000 },
  apartment:        { rent:   8_000, sale:  2_000_000 },
  penthouse:        { rent:  25_000, sale:  6_500_000 },
  studio:           { rent:   6_000, sale:  1_500_000 },
  admin:            { rent:  10_000, sale:  1_800_000 },
  clinic:           { rent:  10_000, sale:  2_000_000 },
  default:          { rent:   8_000, sale:  2_000_000 },
};

/**
 * Intelligent Real Estate Price Normalizer for Egypt (EGP).
 * Handles user shorthands (e.g. "3" meaning 30,000 EGP or 3M EGP or $3,000 USD),
 * currency conversion ($/USD -> EGP), and enforces realistic market floors so
 * that a villa is never recorded as 3 LE.
 */
export function normalizePriceToEGP(
  rawInput: unknown,
  options: PriceNormalizationOptions = {}
): PriceNormalizationResult {
  const usdRate = options.usdToEgpRate || DEFAULT_USD_TO_EGP;
  const str = String(rawInput ?? '').trim();
  if (!str) {
    return {
      priceEGP: 0,
      originalInput: '',
      mode: (options.mode as 'rent' | 'sale') || 'sale',
      confidence: 0,
      rationale: 'Empty input',
      isAdjusted: false,
    };
  }

  // 1. Detect USD currency markers
  const isUSD = Boolean(
    options.currency?.toUpperCase() === 'USD' ||
    /(\$|usd|dollar|دولار)/i.test(str)
  );

  // 2. Detect text multipliers
  const hasK = /(?:k|الف|ألف)/i.test(str);
  const hasM = /(?:m|مليون|م)/i.test(str);

  // 3. Extract numeric value
  const cleaned = str.replace(/[^0-9.]/g, '');
  const rawNum = parseFloat(cleaned) || 0;

  if (rawNum <= 0) {
    return {
      priceEGP: 0,
      originalInput: rawInput as any,
      mode: (options.mode as 'rent' | 'sale') || 'sale',
      confidence: 0,
      rationale: 'Could not extract numeric price',
      isAdjusted: false,
    };
  }

  // 4. Determine property type category
  const rawType = (options.propertyType || '').toLowerCase().trim();
  const isVillaFamily = /villa|فيلا|standalone|مستقل|town|twin|تاون|توين/.test(rawType);
  const floors = ECC_MARKET_FLOORS_EGP[rawType] ||
    (isVillaFamily ? ECC_MARKET_FLOORS_EGP.villa : ECC_MARKET_FLOORS_EGP.default);

  // 5. Determine operation mode
  const explicitMode = String(options.mode || '').toLowerCase();
  const isRent = explicitMode.includes('rent') || /ايجار|إيجار|rent/i.test(str);
  const mode: 'rent' | 'sale' = isRent ? 'rent' : 'sale';
  const floor = mode === 'rent' ? floors.rent : floors.sale;

  let priceEGP = rawNum;
  let isAdjusted = false;
  let rationale = 'Original price verified in realistic range';
  let confidence = 0.95;

  // Handle explicit USD conversion
  if (isUSD) {
    let numUSD = rawNum;
    if (hasK) numUSD *= 1_000;
    if (hasM) numUSD *= 1_000_000;
    // If someone writes "$3" for rent, they mean $3,000
    if (numUSD < 100 && mode === 'rent') {
      numUSD *= 1_000;
    }
    priceEGP = Math.round(numUSD * usdRate);
    isAdjusted = true;
    rationale = `Converted from USD (${numUSD} USD × ${usdRate} EGP/USD)`;
    confidence = 0.92;
    return { priceEGP, originalInput: rawInput as any, mode, confidence, rationale, isAdjusted };
  }

  // Handle explicit "k" or "m" suffixes
  if (hasM) {
    priceEGP = Math.round(rawNum * 1_000_000);
    isAdjusted = true;
    rationale = `Scaled from millions suffix (${rawNum}M → ${priceEGP.toLocaleString()} EGP)`;
    return { priceEGP, originalInput: rawInput as any, mode, confidence: 0.98, rationale, isAdjusted };
  }

  if (hasK) {
    priceEGP = Math.round(rawNum * 1_000);
    isAdjusted = true;
    rationale = `Scaled from thousands suffix (${rawNum}k → ${priceEGP.toLocaleString()} EGP)`;
    return { priceEGP, originalInput: rawInput as any, mode, confidence: 0.98, rationale, isAdjusted };
  }

  // Under-scaled shorthand disambiguation (e.g. 3, 30, 3000)
  if (rawNum < floor) {
    if (mode === 'sale') {
      if (rawNum <= 50) {
        // e.g. 3 -> 3,000,000 EGP; 35 -> 35,000,000 EGP
        priceEGP = Math.round(rawNum * 1_000_000);
        isAdjusted = true;
        rationale = `Auto-corrected sale price from ${rawNum} to ${priceEGP.toLocaleString()} EGP (detected million-unit shorthand)`;
        confidence = 0.92;
      } else if (rawNum > 50 && rawNum <= 999) {
        const x10k = rawNum * 10_000;
        priceEGP = x10k >= floor ? x10k : Math.round(rawNum * 100_000);
        isAdjusted = true;
        rationale = `Auto-scaled sale price to ${priceEGP.toLocaleString()} EGP to meet market floor`;
        confidence = 0.85;
      } else if (rawNum >= 1_000 && rawNum <= 99_999) {
        priceEGP = Math.round(rawNum * 1_000);
        isAdjusted = true;
        rationale = `Auto-corrected sale shorthand ${rawNum} → ${priceEGP.toLocaleString()} EGP`;
        confidence = 0.9;
      }
    } else {
      // Rent mode:
      if (rawNum <= 50) {
        // "3" for a villa means 30,000 EGP/mo (or $3,000 USD -> 150,000 EGP)
        const scaled10k = Math.round(rawNum * 10_000);
        if (scaled10k >= floor) {
          priceEGP = scaled10k;
          isAdjusted = true;
          rationale = `Auto-corrected rent from ${rawNum} to ${priceEGP.toLocaleString()} EGP/mo (scaled shorthand to match 10k broker convention)`;
          confidence = 0.88;
        } else {
          // If villa floor is higher, scale to 30,000 minimum
          priceEGP = Math.max(scaled10k, floor);
          isAdjusted = true;
          rationale = `Auto-scaled villa rent from ${rawNum} to ${priceEGP.toLocaleString()} EGP/mo (villa rent cannot be 3 LE)`;
          confidence = 0.84;
        }
      } else if (rawNum > 50 && rawNum < 1_000) {
        priceEGP = Math.round(rawNum * 100);
        isAdjusted = true;
        rationale = `Auto-scaled rent shorthand ${rawNum} → ${priceEGP.toLocaleString()} EGP/mo`;
        confidence = 0.85;
      } else if (rawNum >= 1_000 && rawNum < floor) {
        // e.g. 3,000 for a villa where rent floor is 30,000
        if (isVillaFamily) {
          priceEGP = Math.round(rawNum * 10);
          isAdjusted = true;
          rationale = `Auto-corrected villa rent from ${rawNum} to ${priceEGP.toLocaleString()} EGP/mo (villa rent cannot be 3,000 LE)`;
          confidence = 0.85;
        }
      }
    }
  }

  return {
    priceEGP,
    originalInput: rawInput as any,
    mode,
    confidence,
    rationale,
    isAdjusted,
  };
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

  public normalizeAndRecordPrice(
    entityId: string,
    rawPrice: unknown,
    options: PriceNormalizationOptions = {}
  ): PriceNormalizationResult {
    const result = normalizePriceToEGP(rawPrice, options);

    if (result.isAdjusted) {
      this.recordEpisode({
        type: 'price_normalized',
        entityId,
        actor: 'Sierra Price Memory Engine',
        summary: `Price normalized for ${entityId}: "${rawPrice}" → ${result.priceEGP.toLocaleString()} EGP (${result.rationale})`,
        data: {
          entityId,
          originalInput: rawPrice,
          normalizedPriceEGP: result.priceEGP,
          mode: result.mode,
          propertyType: options.propertyType,
          rationale: result.rationale,
          confidence: result.confidence,
        },
      });
    }

    return result;
  }

  public trackAiCounterOffer(
    entityId: string,
    originalOffer: number,
    counterOffer: number,
    rationale: string,
    agentName = 'Sierra Closer Agent'
  ): { episode: Episode; concessionPct: number } {
    const diff = counterOffer - originalOffer;
    const concessionPct = originalOffer ? Number(((diff / originalOffer) * 100).toFixed(1)) : 0;

    const episode = this.recordEpisode({
      type: 'ai_counter_offer',
      entityId,
      actor: agentName,
      summary: `AI counter-offer of ${counterOffer.toLocaleString()} EGP (original: ${originalOffer.toLocaleString()} EGP, diff: ${concessionPct}%): ${rationale}`,
      data: {
        entityId,
        originalOffer,
        counterOffer,
        diff,
        concessionPct,
        rationale,
      },
    });

    return { episode, concessionPct };
  }

  public trackDealStage(
    entityId: string,
    stage: 'inquiry' | 'negotiation' | 'viewing' | 'contract' | 'closed',
    notes?: string,
    actor = 'Sierra Deal Engine'
  ): Episode {
    const episode = this.recordEpisode({
      type: stage === 'closed' ? 'deal_closed' : 'contract_stage',
      entityId,
      actor,
      summary: `Deal stage transitioned to '${stage}'${notes ? `: ${notes}` : ''}`,
      data: {
        entityId,
        stage,
        notes,
      },
    });

    return episode;
  }

  public recordLeadScoring(
    entityId: string,
    score: number,
    category: 'cold' | 'warm' | 'hot' | 'vip',
    breakdown?: Record<string, any>,
    actor = 'Sierra Lead Concierge'
  ): Episode {
    const episode = this.recordEpisode({
      type: 'lead_scored',
      entityId,
      actor,
      summary: `Lead scored at ${score}/100 [${category.toUpperCase()}]`,
      data: {
        entityId,
        score,
        category,
        breakdown: breakdown || {},
      },
    });

    return episode;
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

  public getAllEntities(): EntityProfile[] {
    return Array.from(this.entityGraph.values());
  }

  public getEntitiesByType(type: 'buyer' | 'owner' | 'broker' | 'property'): EntityProfile[] {
    return this.getAllEntities().filter((e) => e.type === type);
  }

  public getWorkingSessions(): WorkingMemorySession[] {
    return Array.from(this.workingMemory.values());
  }

  public getStats() {
    return {
      totalEpisodes: this.episodicJournal.length,
      totalEntities: this.entityGraph.size,
      totalHotDeals: this.getHotDeals().length,
      totalWorkingSessions: this.workingMemory.size,
    };
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

    if (episode.type === 'price_normalized' && episode.data?.normalizedPriceEGP) {
      entity.historicalPrices = [
        ...(entity.historicalPrices || []),
        {
          price: episode.data.normalizedPriceEGP,
          timestamp: episode.timestamp,
          source: 'Price Normalization Memory',
        },
      ];
      entity.tags = Array.from(new Set([...entity.tags, 'PRICE_NORMALIZED']));
    }

    if (episode.type === 'buyer_preference' && episode.data?.budgetMax) {
      entity.type = 'buyer';
      entity.budgetRange = { min: episode.data.budgetMin || 0, max: episode.data.budgetMax };
      entity.compound = episode.data.targetCompound;
      entity.targetPropertyType = episode.data.targetType;
    }

    if (episode.type === 'ai_counter_offer') {
      entity.tags = Array.from(new Set([...entity.tags, 'ACTIVE_NEGOTIATION']));
    }

    if (episode.type === 'deal_closed') {
      entity.tags = Array.from(new Set([...entity.tags, 'DEAL_CLOSED']));
    }

    if (episode.type === 'lead_scored' && episode.data?.category) {
      entity.tags = Array.from(new Set([...entity.tags, `LEAD_${String(episode.data.category).toUpperCase()}`]));
    }

    if (episode.type === 'due_diligence_verified') {
      entity.tags = Array.from(new Set([...entity.tags, 'DUE_DILIGENCE_VERIFIED']));
    }

    if (episode.type === 'objection_handled') {
      entity.tags = Array.from(new Set([...entity.tags, 'OBJECTION_RESOLVED']));
    }

    entity.lastUpdated = episode.timestamp;
    this.entityGraph.set(episode.entityId, entity);
  }

  // --- 5. Supabase Authoritative Cloud Sync ---

  public async syncEpisodeToSupabase(episode: Episode, client?: any): Promise<boolean> {
    try {
      const supabase = client || (isSupabaseAdminConfigured() ? getSupabaseAdmin() : null);
      if (!supabase) return false;

      const { error } = await supabase.from('unified_memory').upsert(
        {
          agent_id: 'ecc-memory-engine',
          session_id: episode.entityId,
          category: episode.type,
          key: `ecc:episode:${episode.id}`,
          value: {
            id: episode.id,
            type: episode.type,
            entityId: episode.entityId,
            actor: episode.actor,
            timestamp: episode.timestamp,
            summary: episode.summary,
            data: episode.data,
            decayWeight: episode.decayWeight,
          },
          source: 'ecc-memory-engine',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'agent_id,key' }
      );

      return !error;
    } catch {
      return false;
    }
  }

  public async syncEntityToSupabase(entity: EntityProfile, client?: any): Promise<boolean> {
    try {
      const supabase = client || (isSupabaseAdminConfigured() ? getSupabaseAdmin() : null);
      if (!supabase) return false;

      const { error } = await supabase.from('unified_memory').upsert(
        {
          agent_id: 'ecc-entity-graph',
          session_id: entity.id,
          category: entity.type,
          key: `ecc:entity:${entity.id}`,
          value: entity,
          source: 'ecc-entity-graph',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'agent_id,key' }
      );

      return !error;
    } catch {
      return false;
    }
  }

  public async syncToSupabase(options?: { client?: any }): Promise<{
    syncedEpisodes: number;
    syncedEntities: number;
    success: boolean;
  }> {
    try {
      const supabase = options?.client !== undefined ? options.client : (isSupabaseAdminConfigured() ? getSupabaseAdmin() : null);
      if (!supabase) {
        return { syncedEpisodes: 0, syncedEntities: 0, success: false };
      }

      let syncedEpisodes = 0;
      let syncedEntities = 0;

      for (const episode of this.episodicJournal) {
        const ok = await this.syncEpisodeToSupabase(episode, supabase);
        if (ok) syncedEpisodes++;
      }

      for (const entity of this.entityGraph.values()) {
        const ok = await this.syncEntityToSupabase(entity, supabase);
        if (ok) syncedEntities++;
      }

      return { syncedEpisodes, syncedEntities, success: true };
    } catch {
      return { syncedEpisodes: 0, syncedEntities: 0, success: false };
    }
  }

  public async loadFromSupabase(options?: { client?: any; limit?: number }): Promise<{
    loadedEpisodes: number;
    loadedEntities: number;
    success: boolean;
  }> {
    try {
      const supabase = options?.client !== undefined ? options.client : (isSupabaseAdminConfigured() ? getSupabaseAdmin() : null);
      if (!supabase) {
        return { loadedEpisodes: 0, loadedEntities: 0, success: false };
      }

      const limit = options?.limit || 100;

      const { data: episodesData, error: epError } = await supabase
        .from('unified_memory')
        .select('value')
        .eq('agent_id', 'ecc-memory-engine')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!epError && Array.isArray(episodesData)) {
        for (const row of episodesData) {
          if (row.value && row.value.id && !this.episodicJournal.some((ep) => ep.id === row.value.id)) {
            this.episodicJournal.push(row.value as Episode);
          }
        }
      }

      const { data: entitiesData, error: entError } = await supabase
        .from('unified_memory')
        .select('value')
        .eq('agent_id', 'ecc-entity-graph')
        .limit(limit);

      if (!entError && Array.isArray(entitiesData)) {
        for (const row of entitiesData) {
          if (row.value && row.value.id) {
            this.entityGraph.set(row.value.id, row.value as EntityProfile);
          }
        }
      }

      return {
        loadedEpisodes: episodesData?.length || 0,
        loadedEntities: entitiesData?.length || 0,
        success: true,
      };
    } catch {
      return { loadedEpisodes: 0, loadedEntities: 0, success: false };
    }
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
