 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }






import { InMemoryStore } from './stores/memory-store'
import { SupabaseMemoryStore } from './stores/supabase-store'















export class MemoryEngine {
   __init() {this.contexts = new Map()}
   __init2() {this.skillRegistry = new Map()}
   __init3() {this.agentProfiles = new Map()}
   __init4() {this.executionLogs = []}
   __init5() {this.subscribers = new Map()}
   __init6() {this.pendingWrites = 0}
   __init7() {this.lastStoreError = null}

   __init8() {this.config = {
    persistenceLayer: 'memory',
    learningEnabled: true,
    auditTrail: true
  }}

  constructor(config = {}) {;MemoryEngine.prototype.__init.call(this);MemoryEngine.prototype.__init2.call(this);MemoryEngine.prototype.__init3.call(this);MemoryEngine.prototype.__init4.call(this);MemoryEngine.prototype.__init5.call(this);MemoryEngine.prototype.__init6.call(this);MemoryEngine.prototype.__init7.call(this);MemoryEngine.prototype.__init8.call(this);
    this.config = { ...this.config, ...config }
  }

  /**
   * Context Management
   */

  getContext(agentId) {
    return this.contexts.get(agentId)
  }

  updateContext(agentId, updates) {
    const current = this.contexts.get(agentId) || {}
    this.contexts.set(agentId, { ...current, ...updates })
    this.publish('context:updated', { agentId, updates })
  }

  mergeContext(...contextArray) {
    return contextArray.reduce((acc, ctx) => ({ ...acc, ...ctx }), {})
  }

  /**
   * Skill Management
   */

  loadSkill(skillId) {
    return this.skillRegistry.get(skillId)
  }

  registerSkill(skill) {
    this.skillRegistry.set(skill.id, skill)
  }

  getApplicableSkills(context) {
    return Array.from(this.skillRegistry.values()).filter(skill => {
      if (!skill.applicableWhen) return true
      return skill.applicableWhen(context)
    })
  }

  /**
   * Knowledge Base
   */

  logExecution(execution) {
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
  getPatterns(filter) {
    const logs = filter ? this.executionLogs.filter(filter) : this.executionLogs
    return this.analyzePatterns(logs)
  }

  /**
   * Patterns computed over durable history. This is the one to use for any
   * real decision — getPatterns() sees only what this process happened to
   * handle, which on serverless is close to nothing.
   */
  async getPatternsFromStore(query = {}) {
    const store = this.config.store
    if (!store) return this.getPatterns()
    const logs = await store.queryExecutions({ limit: 1000, ...query })
    return this.analyzePatterns(logs)
  }

  /** Durable execution history, newest first. */
  async getExecutions(query = {}) {
    const store = this.config.store
    if (!store) {
      return [...this.executionLogs].reverse().slice(0, _nullishCoalesce(query.limit, () => ( 500)))
    }
    return store.queryExecutions(query)
  }

  /** Flush outstanding persistence writes — call before a serverless handler returns. */
  async flush(timeoutMs = 2000) {
    const started = Date.now()
    while (this.pendingWrites > 0 && Date.now() - started < timeoutMs) {
      await new Promise(r => setTimeout(r, 25))
    }
  }

  async storeHealthy() {
    const store = this.config.store
    if (!store) return false
    try {
      return await store.healthy()
    } catch (e) {
      return false
    }
  }

  get storeName() {
    return _nullishCoalesce(_optionalChain([this, 'access', _ => _.config, 'access', _2 => _2.store, 'optionalAccess', _3 => _3.name]), () => ( 'none'))
  }

  get storeError() {
    return this.lastStoreError
  }

  /** Attach or swap the durable store at runtime. */
  setStore(store) {
    this.config.store = store
  }

  /**
   * Agent Communication (Pub/Sub)
   */

  publish(topic, message) {
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

  subscribe(topic, handler) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set())
    }
    this.subscribers.get(topic).add(handler)

    // Return unsubscribe function
    return () => {
      _optionalChain([this, 'access', _4 => _4.subscribers, 'access', _5 => _5.get, 'call', _6 => _6(topic), 'optionalAccess', _7 => _7.delete, 'call', _8 => _8(handler)])
    }
  }

  /**
   * Learning System
   */

   analyzePatterns(logs) {
    if (!this.config.learningEnabled || logs.length === 0) {
      return []
    }

    // Count successes explicitly and divide at the end. The previous version
    // only touched successRate on success while still incrementing
    // occurrences, so failures never moved the rate and it drifted toward 1.0
    // — an agent learning from that would conclude everything works.
    const acc = new Map()

    logs.forEach(log => {
      const patternKey = `${log.agentId}:${log.action}`
      const entry = acc.get(patternKey) || {
        pattern: {
          name: patternKey,
          occurrences: 0,
          successRate: 0,
          lastUsed: new Date(0),
          skills: [] 
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

  registerAgent(agent) {
    this.agentProfiles.set(agent.id, agent)
    this.publish('agent:registered', agent)
  }

  getAgent(agentId) {
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

  reset() {
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
function resolveStore(layer) {
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
  persistenceLayer: PERSISTENCE ,
  learningEnabled: process.env.MEMORY_LEARNING !== 'false',
  auditTrail: process.env.MEMORY_AUDIT !== 'false',
  store: resolveStore(PERSISTENCE)
})

export default memoryEngine
