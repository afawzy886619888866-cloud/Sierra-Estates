/**
 * ECC Memory Engine - Central Intelligence System
 * Integrates all agents, skills, and contexts into unified platform
 */

import type { Agent, Skill, Context, ExecutionLog, Pattern } from './types'
import type { MemoryStore, ExecutionLogQuery } from './stores/types'
import { InMemoryStore } from './stores/memory-store'
import { SupabaseMemoryStore } from './stores/supabase-store'

export interface MemoryEngineConfig {
  persistenceLayer?: 'file' | 'memory' | 'database'
  learningEnabled?: boolean
  auditTrail?: boolean
  /**
   * Durable backing store. Without one the engine is a cache that dies with
   * the process — on serverless, that is every single request.
   */
  store?: MemoryStore
}

/** Pub/sub subscriber callback — receives the published message. */
export type SubscriberHandler = (message: any) => void

export class MemoryEngine {
  private contexts: Map<string, Context> = new Map()
  private skillRegistry: Map<string, Skill> = new Map()
  private agentProfiles: Map<string, Agent> = new Map()
  private executionLogs: ExecutionLog[] = []
  private subscribers: Map<string, Set<SubscriberHandler>> = new Map()
  private pendingWrites = 0
  private lastStoreError: string | null = null

  private config: MemoryEngineConfig = {
    persistenceLayer: 'memory',
    learningEnabled: true,
    auditTrail: true
  }

  constructor(config: MemoryEngineConfig = {}) {
    this.config = { ...this.config, ...config }
  }

  /**
   * Context Management
   */

  getContext(agentId: string): Context | undefined {
    return this.contexts.get(agentId)
  }

  updateContext(agentId: string, updates: Partial<Context>): void {
    const current = this.contexts.get(agentId) || {}
    this.contexts.set(agentId, { ...current, ...updates })
    this.publish('context:updated', { agentId, updates })
  }

  mergeContext(...contextArray: Context[]): Context {
    return contextArray.reduce((acc, ctx) => ({ ...acc, ...ctx }), {})
  }

  /**
   * Skill Management
   */

  loadSkill(skillId: string): Skill | undefined {
    return this.skillRegistry.get(skillId)
  }

  registerSkill(skill: Skill): void {
    this.skillRegistry.set(skill.id, skill)
  }

  getApplicableSkills(context: Context): Skill[] {
    return Array.from(this.skillRegistry.values()).filter(skill => {
      if (!skill.applicableWhen) return true
      return skill.applicableWhen(context)
    })
  }

  /**
   * Knowledge Base
   */

  logExecution(execution: ExecutionLog): void {
    this.executionLogs.push(execution)
    if (this.config.auditTrail) {
      console.log(`[Memory] Logged execution: ${execution.agentId}:${execution.action}`)
    }
    this.publish('execution:logged', execution)

    // Mirror to the durable store. Deliberately not awaited: logging must never
    // slow down or fail an agent run. Failures are swallowed and surfaced via
    // storeHealthy() instead of thrown into the caller's control flow.
    const store = this.config.store
    if (store) {
      this.pendingWrites++
      store
        .appendExecution(execution)
        .catch(err => {
          this.lastStoreError = err instanceof Error ? err.message : String(err)
          console.error('[Memory] execution persist failed:', this.lastStoreError)
        })
        .finally(() => {
          this.pendingWrites--
        })
    }
  }

  /** Patterns from the in-process cache only (synchronous, may be cold). */
  getPatterns(filter?: (log: ExecutionLog) => boolean): Pattern[] {
    const logs = filter ? this.executionLogs.filter(filter) : this.executionLogs
    return this.analyzePatterns(logs)
  }

  /**
   * Patterns computed over durable history. This is the one to use for any
   * real decision — getPatterns() sees only what this process happened to
   * handle, which on serverless is close to nothing.
   */
  async getPatternsFromStore(query: ExecutionLogQuery = {}): Promise<Pattern[]> {
    const store = this.config.store
    if (!store) return this.getPatterns()
    const logs = await store.queryExecutions({ limit: 1000, ...query })
    return this.analyzePatterns(logs)
  }

  /** Durable execution history, newest first. */
  async getExecutions(query: ExecutionLogQuery = {}): Promise<ExecutionLog[]> {
    const store = this.config.store
    if (!store) {
      return [...this.executionLogs].reverse().slice(0, query.limit ?? 500)
    }
    return store.queryExecutions(query)
  }

  /** Flush outstanding persistence writes — call before a serverless handler returns. */
  async flush(timeoutMs = 2000): Promise<void> {
    const started = Date.now()
    while (this.pendingWrites > 0 && Date.now() - started < timeoutMs) {
      await new Promise(r => setTimeout(r, 25))
    }
  }

  async storeHealthy(): Promise<boolean> {
    const store = this.config.store
    if (!store) return false
    try {
      return await store.healthy()
    } catch {
      return false
    }
  }

  get storeName(): string {
    return this.config.store?.name ?? 'none'
  }

  get storeError(): string | null {
    return this.lastStoreError
  }

  /** Attach or swap the durable store at runtime. */
  setStore(store: MemoryStore): void {
    this.config.store = store
  }

  /**
   * Agent Communication (Pub/Sub)
   */

  publish(topic: string, message: any): void {
    const subscribers = this.subscribers.get(topic)
    if (subscribers) {
      subscribers.forEach(handler => {
        try {
          handler(message)
        } catch (error) {
          console.error(`[Memory] Error in subscriber for ${topic}:`, error)
        }
      })
    }
  }

  subscribe(topic: string, handler: SubscriberHandler): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set())
    }
    this.subscribers.get(topic)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.subscribers.get(topic)?.delete(handler)
    }
  }

  /**
   * Learning System
   */

  private analyzePatterns(logs: ExecutionLog[]): Pattern[] {
    if (!this.config.learningEnabled || logs.length === 0) {
      return []
    }

    // Count successes explicitly and divide at the end. The previous version
    // only touched successRate on success while still incrementing
    // occurrences, so failures never moved the rate and it drifted toward 1.0
    // — an agent learning from that would conclude everything works.
    const acc = new Map<string, { pattern: Pattern; successes: number }>()

    logs.forEach(log => {
      const patternKey = `${log.agentId}:${log.action}`
      const entry = acc.get(patternKey) || {
        pattern: {
          name: patternKey,
          occurrences: 0,
          successRate: 0,
          lastUsed: new Date(0),
          skills: [] as string[]
        },
        successes: 0
      }

      entry.pattern.occurrences++
      if (log.success) entry.successes++

      // Track when the pattern actually ran, not when it was analysed.
      const at = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp)
      if (at.getTime() > entry.pattern.lastUsed.getTime()) {
        entry.pattern.lastUsed = at
      }

      if (log.skillsUsed) {
        entry.pattern.skills = [...new Set([...entry.pattern.skills, ...log.skillsUsed])]
      }

      acc.set(patternKey, entry)
    })

    return Array.from(acc.values()).map(({ pattern, successes }) => ({
      ...pattern,
      successRate: pattern.occurrences ? successes / pattern.occurrences : 0
    }))
  }

  /**
   * Agent Profile Management
   */

  registerAgent(agent: Agent): void {
    this.agentProfiles.set(agent.id, agent)
    this.publish('agent:registered', agent)
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agentProfiles.get(agentId)
  }

  /**
   * System Status
   */

  getStatus() {
    return {
      agents: this.agentProfiles.size,
      skills: this.skillRegistry.size,
      contexts: this.contexts.size,
      executionLogs: this.executionLogs.length,
      patterns: this.getPatterns().length,
      subscribers: Array.from(this.subscribers.keys())
    }
  }

  /**
   * Reset (for testing)
   */

  reset(): void {
    this.contexts.clear()
    this.skillRegistry.clear()
    this.agentProfiles.clear()
    this.executionLogs = []
    this.subscribers.clear()
  }
}

/**
 * Resolve the durable store from MEMORY_PERSISTENCE.
 *
 * This flag existed before but nothing ever branched on it, so every
 * deployment silently ran memory-only. It is honoured now.
 */
function resolveStore(layer: string): MemoryStore {
  // 'firestore' is still accepted so an existing MEMORY_PERSISTENCE value
  // keeps selecting a durable store rather than silently falling back to
  // in-memory; it resolves to Supabase like 'database' does.
  if (layer === 'database' || layer === 'firestore' || layer === 'supabase') {
    return new SupabaseMemoryStore()
  }
  return new InMemoryStore()
}

const PERSISTENCE = process.env.MEMORY_PERSISTENCE || 'memory'

// Global singleton instance
export const memoryEngine = new MemoryEngine({
  persistenceLayer: PERSISTENCE as any,
  learningEnabled: process.env.MEMORY_LEARNING !== 'false',
  auditTrail: process.env.MEMORY_AUDIT !== 'false',
  store: resolveStore(PERSISTENCE)
})

export default memoryEngine
