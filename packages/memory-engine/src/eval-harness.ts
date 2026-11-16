/**
 * Eval harness.
 *
 * The point of this file is to make "the agents got better" falsifiable. A
 * fixed scenario set runs against an agent, results are scored, and the run is
 * compared to the previous baseline. If a change does not move the number, it
 * did not work — regardless of how reasonable it sounded.
 */
import type { ExecutionLog } from './types'

export interface EvalScenario {
  id: string
  description: string
  /** Arbitrary input handed to the runner. */
  input: unknown
  /** Decide whether the produced output is acceptable. */
  assert: (output: unknown) => boolean | Promise<boolean>
  /** Relative importance when computing the weighted score. */
  weight?: number
}

export interface EvalCaseResult {
  id: string
  passed: boolean
  durationMs: number
  error?: string
  weight: number
}

export interface EvalRunResult {
  suite: string
  startedAt: string
  finishedAt: string
  total: number
  passed: number
  failed: number
  /** Weighted pass rate in [0,1]. */
  score: number
  durationMs: number
  cases: EvalCaseResult[]
}

export type ScenarioRunner = (input: unknown, scenario: EvalScenario) => Promise<unknown>

/** Run a suite. Never throws — a crashing scenario is a failed scenario. */
export async function runEval(
  suite: string,
  scenarios: EvalScenario[],
  runner: ScenarioRunner
): Promise<EvalRunResult> {
  const startedAt = new Date()
  const cases: EvalCaseResult[] = []

  for (const scenario of scenarios) {
    const weight = scenario.weight ?? 1
    const t0 = Date.now()
    try {
      const output = await runner(scenario.input, scenario)
      const passed = await scenario.assert(output)
      cases.push({ id: scenario.id, passed: Boolean(passed), durationMs: Date.now() - t0, weight })
    } catch (err) {
      cases.push({
        id: scenario.id,
        passed: false,
        durationMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
        weight
      })
    }
  }

  const finishedAt = new Date()
  const totalWeight = cases.reduce((n, c) => n + c.weight, 0)
  const passedWeight = cases.reduce((n, c) => n + (c.passed ? c.weight : 0), 0)

  return {
    suite,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    total: cases.length,
    passed: cases.filter(c => c.passed).length,
    failed: cases.filter(c => !c.passed).length,
    score: totalWeight ? passedWeight / totalWeight : 0,
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    cases
  }
}

export interface RegressionVerdict {
  improved: boolean
  regressed: boolean
  delta: number
  /** Scenarios that passed before and fail now — the ones that matter most. */
  newFailures: string[]
  fixed: string[]
  summary: string
}

/**
 * Compare a run to its baseline.
 *
 * `tolerance` guards against treating noise as signal; a change smaller than
 * it counts as flat. New failures are reported separately because an
 * unchanged aggregate score can still hide a real break.
 */
export function compareRuns(
  current: EvalRunResult,
  baseline: EvalRunResult | null,
  tolerance = 0.01
): RegressionVerdict {
  if (!baseline) {
    return {
      improved: false,
      regressed: false,
      delta: 0,
      newFailures: [],
      fixed: [],
      summary: `Baseline recorded at ${(current.score * 100).toFixed(1)}%.`
    }
  }

  const before = new Map(baseline.cases.map(c => [c.id, c.passed]))
  const newFailures: string[] = []
  const fixed: string[] = []

  for (const c of current.cases) {
    const was = before.get(c.id)
    if (was === true && !c.passed) newFailures.push(c.id)
    if (was === false && c.passed) fixed.push(c.id)
  }

  const delta = current.score - baseline.score
  const improved = delta > tolerance && newFailures.length === 0
  const regressed = delta < -tolerance || newFailures.length > 0

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`
  let summary: string
  if (regressed) {
    summary = `Regressed: ${pct(baseline.score)} → ${pct(current.score)}`
    if (newFailures.length) summary += `, ${newFailures.length} newly failing`
  } else if (improved) {
    summary = `Improved: ${pct(baseline.score)} → ${pct(current.score)}`
    if (fixed.length) summary += `, ${fixed.length} fixed`
  } else {
    summary = `No material change (${pct(current.score)})`
  }

  return { improved, regressed, delta, newFailures, fixed, summary }
}

/** Derive a suite from real execution history — regressions you actually hit. */
export function scenariosFromHistory(logs: ExecutionLog[], limit = 25): EvalScenario[] {
  const failures = logs.filter(l => !l.success).slice(0, limit)
  return failures.map((log, i) => ({
    id: `regression-${log.agentId}-${log.action}-${i}`,
    description: `Previously failed: ${log.agentId} → ${log.action}`,
    input: log.context ?? {},
    // Once a known failure stops throwing, it counts as fixed.
    assert: (output: unknown) => output !== undefined && output !== null,
    weight: 2
  }))
}
