 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Supabase-backed memory store with pgvector support.
 *
 * Replaces Firestore storage with PostgreSQL + JSONB + pgvector embeddings.
 */
import { createClient, } from '@supabase/supabase-js'









export class SupabaseMemoryStore  {
   __init() {this.name = 'supabase'}
   __init2() {this.client = null}

  constructor( config = {}) {;this.config = config;SupabaseMemoryStore.prototype.__init.call(this);SupabaseMemoryStore.prototype.__init2.call(this);
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

   getClient() {
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

  async appendExecution(log) {
    const client = this.getClient()
    if (!client) return

    await client.from('agent_executions').insert({
      agent_name: log.agentId,
      task_name: log.action,
      status: log.success ? 'success' : 'failed',
      input_payload: _nullishCoalesce(log.context, () => ( {})),
      output_payload: {
        result: _nullishCoalesce(log.result, () => ( null)),
        error: _nullishCoalesce(log.error, () => ( null)),
        skillsUsed: _nullishCoalesce(log.skillsUsed, () => ( [])),
      },
      latency_ms: 0,
      created_at: new Date(log.timestamp).toISOString(),
    })
  }

  async queryExecutions(query = {}) {
    const client = this.getClient()
    if (!client) return []

    let q = client.from('agent_executions').select('*')
    if (query.agentId) q = q.eq('agent_name', query.agentId)
    if (query.action) q = q.eq('task_name', query.action)
    if (query.since) q = q.gte('created_at', new Date(query.since).toISOString())

    q = q.order('created_at', { ascending: false }).limit(Math.min(_nullishCoalesce(query.limit, () => ( 500)), 2000))

    const { data, error } = await q
    if (error || !data) return []

    return data.map((d) => ({
      agentId: d.agent_name,
      action: d.task_name,
      success: d.status === 'success',
      result: _optionalChain([d, 'access', _ => _.output_payload, 'optionalAccess', _2 => _2.result]),
      error: _optionalChain([d, 'access', _3 => _3.output_payload, 'optionalAccess', _4 => _4.error]),
      skillsUsed: _nullishCoalesce(_optionalChain([d, 'access', _5 => _5.output_payload, 'optionalAccess', _6 => _6.skillsUsed]), () => ( [])),
      context: _nullishCoalesce(d.input_payload, () => ( {})),
      timestamp: new Date(d.created_at),
    }))
  }

  async saveAgent(agent) {
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

  async listAgents() {
    const client = this.getClient()
    if (!client) return []

    const { data } = await client.from('unified_memory').select('value').eq('category', 'agent_profile')
    return (data || []).map((d) => d.value )
  }

  async saveContext(agentId, context) {
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

  async loadContext(agentId) {
    const client = this.getClient()
    if (!client) return undefined

    const { data } = await client
      .from('unified_memory')
      .select('value')
      .eq('agent_id', agentId)
      .eq('key', `context:${agentId}`)
      .single()

    return data ? (data.value ) : undefined
  }

  async healthy() {
    return Boolean(this.getClient())
  }
}
