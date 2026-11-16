/**
 * Persistence contract for the memory engine.
 *
 * The engine keeps its in-process maps as a hot cache (so every existing
 * synchronous call site keeps working unchanged) and mirrors durable facts —
 * execution logs above all — into a MemoryStore. Without a store, execution
 * logs die with the process, which on serverless means they die immediately
 * and every learned statistic is computed from an empty array.
 */
import type { ExecutionLog, Agent, Context } from '../types'

export interface ExecutionLogQuery {
  agentId?: string
  action?: string
  /** ISO timestamp — only logs at or after this instant. */
  since?: string
  limit?: number
}

export interface MemoryStore {
  readonly name: string

  /** Durably record one agent execution. Must not throw on the hot path. */
  appendExecution(log: ExecutionLog): Promise<void>

  /** Read execution history back, newest first. */
  queryExecutions(query?: ExecutionLogQuery): Promise<ExecutionLog[]>

  /** Persist an agent profile (upsert by id). */
  saveAgent(agent: Agent): Promise<void>

  listAgents(): Promise<Agent[]>

  /** Persist a per-agent context snapshot (upsert by agentId). */
  saveContext(agentId: string, context: Context): Promise<void>

  loadContext(agentId: string): Promise<Context | undefined>

  /** True when the backing service is reachable. */
  healthy(): Promise<boolean>
}
