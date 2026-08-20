/**
 * Agent instrumentation.
 *
 * One wrapper so every agent and bot reports into the same memory without
 * each one hand-rolling try/catch/log. Wrapping is the whole integration:
 * if a run goes through `instrument`, it is visible in the admin console,
 * it feeds the learning loop, and it can seed regression scenarios.
 *
 * Failures are recorded, not swallowed — a learning system that only ever
 * sees successes learns that nothing ever breaks.
 */
import { memoryEngine } from './memory-engine'
import type { Context } from './types'

export interface InstrumentedResult<T> {
  ok: boolean
  value?: T
  error?: string
  durationMs: number
}

export interface RecordRunOptions {
  agentId: string
  action: string
  skillsUsed?: string[]
  context?: Partial<Context>
}

/**
 * Run `fn`, record the outcome, and re-throw on failure so callers keep their
 * existing error handling. Use when the caller wants exceptions.
 */
export async function instrument<T>(
  options: RecordRunOptions,
  fn: () => Promise<T>
): Promise<T> {
  const started = Date.now()
  try {
    const value = await fn()
    memoryEngine.logExecution({
      agentId: options.agentId,
      action: options.action,
      timestamp: new Date(),
      success: true,
      skillsUsed: options.skillsUsed ?? [],
      context: { ...options.context, durationMs: Date.now() - started }
    })
    return value
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    memoryEngine.logExecution({
      agentId: options.agentId,
      action: options.action,
      timestamp: new Date(),
      success: false,
      error: message,
      skillsUsed: options.skillsUsed ?? [],
      context: { ...options.context, durationMs: Date.now() - started }
    })
    throw err
  }
}

/**
 * Same as `instrument` but returns a result object instead of throwing. Use in
 * background jobs and bot handlers where one failed step must not abort the
 * whole batch.
 */
export async function recordRun<T>(
  options: RecordRunOptions,
  fn: () => Promise<T>
): Promise<InstrumentedResult<T>> {
  const started = Date.now()
  try {
    const value = await instrument(options, fn)
    return { ok: true, value, durationMs: Date.now() - started }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - started
    }
  }
}
