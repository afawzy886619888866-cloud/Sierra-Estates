/**
 * In-process store. Honest about what it is: a development and test backend
 * that loses everything on restart. It exists so the engine always has a
 * store object and callers never branch on null.
 */
import type { MemoryStore, ExecutionLogQuery } from './types'
import type { ExecutionLog, Agent, Context } from '../types'

export class InMemoryStore implements MemoryStore {
  readonly name = 'memory'
  private executions: ExecutionLog[] = []
  private agents = new Map<string, Agent>()
  private contexts = new Map<string, Context>()
  private readonly cap: number

  constructor(cap = 5000) {
    this.cap = cap
  }

  async appendExecution(log: ExecutionLog): Promise<void> {
    this.executions.push(log)
    // Bound the array so a long-lived process cannot leak unboundedly.
    if (this.executions.length > this.cap) {
      this.executions.splice(0, this.executions.length - this.cap)
    }
  }

  async queryExecutions(query: ExecutionLogQuery = {}): Promise<ExecutionLog[]> {
    let out = [...this.executions]
    if (query.agentId) out = out.filter((l) => l.agentId === query.agentId)
    if (query.action) out = out.filter((l) => l.action === query.action)
    if (query.since) {
      const floor = new Date(query.since).getTime()
      out = out.filter((l) => new Date(l.timestamp).getTime() >= floor)
    }
    out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return out.slice(0, query.limit ?? 500)
  }

  async saveAgent(agent: Agent): Promise<void> {
    this.agents.set(agent.id, agent)
  }

  async listAgents(): Promise<Agent[]> {
    return [...this.agents.values()]
  }

  async saveContext(agentId: string, context: Context): Promise<void> {
    this.contexts.set(agentId, context)
  }

  async loadContext(agentId: string): Promise<Context | undefined> {
    return this.contexts.get(agentId)
  }

  async healthy(): Promise<boolean> {
    return true
  }
}
