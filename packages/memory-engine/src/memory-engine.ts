/**
 * ECC Memory Engine - Central Intelligence System
 * Integrates all agents, skills, and contexts into unified platform
 */

import type { Agent, Skill, Context, ExecutionLog, Pattern } from './types'

export interface MemoryEngineConfig {
  persistenceLayer?: 'file' | 'memory' | 'database'
  learningEnabled?: boolean
  auditTrail?: boolean
}

export class MemoryEngine {
  private contexts: Map<string, Context> = new Map()
  private skillRegistry: Map<string, Skill> = new Map()
  private agentProfiles: Map<string, Agent> = new Map()
  private executionLogs: ExecutionLog[] = []
  private subscribers: Map<string, Set<Function>> = new Map()

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
  }

  getPatterns(filter?: (log: ExecutionLog) => boolean): Pattern[] {
    const logs = filter ? this.executionLogs.filter(filter) : this.executionLogs
    return this.analyzePatterns(logs)
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

  subscribe(topic: string, handler: Function): () => void {
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

    const patterns: Map<string, Pattern> = new Map()

    logs.forEach(log => {
      const patternKey = `${log.agentId}:${log.action}`
      const existing = patterns.get(patternKey) || {
        name: patternKey,
        occurrences: 0,
        successRate: 0,
        lastUsed: new Date(),
        skills: []
      }

      existing.occurrences++
      if (log.success) {
        existing.successRate = (existing.successRate * (existing.occurrences - 1) + 1) / existing.occurrences
      }
      existing.lastUsed = new Date()
      if (log.skillsUsed) {
        existing.skills = [...new Set([...existing.skills, ...log.skillsUsed])]
      }

      patterns.set(patternKey, existing)
    })

    return Array.from(patterns.values())
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

// Global singleton instance
export const memoryEngine = new MemoryEngine({
  persistenceLayer: process.env.MEMORY_PERSISTENCE as any || 'memory',
  learningEnabled: process.env.MEMORY_LEARNING !== 'false',
  auditTrail: process.env.MEMORY_AUDIT !== 'false'
})

export default memoryEngine
