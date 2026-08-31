/**
 * Supabase-backed memory store with pgvector support.
 *
 * Replaces Firestore storage with PostgreSQL + JSONB + pgvector embeddings.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { MemoryStore, ExecutionLogQuery } from './types'
import type { ExecutionLog, Agent, Context } from '../types'

export interface SupabaseStoreConfig {
  client?: SupabaseClient
  supabaseUrl?: string
  supabaseKey?: string
}

export class SupabaseMemoryStore implements MemoryStore {
  readonly name = 'supabase'
  private client: SupabaseClient | null = null

  constructor(private config: SupabaseStoreConfig = {}) {
    if (config.client) {
      this.client = config.client
    } else {
      const url = config.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      const key = config.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (url && key) {
        this.client = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      }
    }
  }

  private getClient(): SupabaseClient | null {
    if (this.client) return this.client
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && key) {
      this.client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      return this.client
    }
    return null
  }

  async appendExecution(log: ExecutionLog): Promise<void> {
    const client = this.getClient()
    if (!client) return

    await client.from('agent_executions').insert({
      agent_name: log.agentId,
      task_name: log.action,
      status: log.success ? 'success' : 'failed',
      input_payload: log.context ?? {},
      output_payload: {
        result: log.result ?? null,
        error: log.error ?? null,
        skillsUsed: log.skillsUsed ?? [],
      },
      latency_ms: 0,
      created_at: new Date(log.timestamp).toISOString(),
    })
  }

  async queryExecutions(query: ExecutionLogQuery = {}): Promise<ExecutionLog[]> {
    const client = this.getClient()
    if (!client) return []

    let q = client.from('agent_executions').select('*')
    if (query.agentId) q = q.eq('agent_name', query.agentId)
    if (query.action) q = q.eq('task_name', query.action)
    if (query.since) q = q.gte('created_at', new Date(query.since).toISOString())

    q = q.order('created_at', { ascending: false }).limit(Math.min(query.limit ?? 500, 2000))

    const { data, error } = await q
    if (error || !data) return []

    return data.map((d: any) => ({
      agentId: d.agent_name,
      action: d.task_name,
      success: d.status === 'success',
      result: d.output_payload?.result,
      error: d.output_payload?.error,
      skillsUsed: d.output_payload?.skillsUsed ?? [],
      context: d.input_payload ?? {},
      timestamp: new Date(d.created_at),
    }))
  }

  async saveAgent(agent: Agent): Promise<void> {
    const client = this.getClient()
    if (!client) return

    await client.from('unified_memory').upsert({
      agent_id: agent.id,
      key: `profile:${agent.id}`,
      category: 'agent_profile',
      value: agent,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  }

  async listAgents(): Promise<Agent[]> {
    const client = this.getClient()
    if (!client) return []

    const { data } = await client.from('unified_memory').select('value').eq('category', 'agent_profile')
    return (data || []).map((d: any) => d.value as Agent)
  }

  async saveContext(agentId: string, context: Context): Promise<void> {
    const client = this.getClient()
    if (!client) return

    await client.from('unified_memory').upsert({
      agent_id: agentId,
      key: `context:${agentId}`,
      category: 'agent_context',
      value: context,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  }

  async loadContext(agentId: string): Promise<Context | undefined> {
    const client = this.getClient()
    if (!client) return undefined

    const { data } = await client
      .from('unified_memory')
      .select('value')
      .eq('agent_id', agentId)
      .eq('key', `context:${agentId}`)
      .single()

    return data ? (data.value as Context) : undefined
  }

  async healthy(): Promise<boolean> {
    return Boolean(this.getClient())
  }
}
