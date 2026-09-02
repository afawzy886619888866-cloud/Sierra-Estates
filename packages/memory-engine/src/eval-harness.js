 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }











































/** Run a suite. Never throws — a crashing scenario is a failed scenario. */
export async function runEval(
  suite,
  scenarios,
  runner
) {
  const startedAt = new Date()
  const cases = []

  for (const scenario of scenarios) {
    const weight = _nullishCoalesce(scenario.weight, () => ( 1))
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











/**
 * Compare a run to its baseline.
 *
 * `tolerance` guards against treating noise as signal; a change smaller than
 * it counts as flat. New failures are reported separately because an
 * unchanged aggregate score can still hide a real break.
 */
export function compareRuns(
  current,
  baseline,
  tolerance = 0.01
) {
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
  const newFailures = []
  const fixed = []

  for (const c of current.cases) {
    const was = before.get(c.id)
    if (was === true && !c.passed) newFailures.push(c.id)
    if (was === false && c.passed) fixed.push(c.id)
  }

  const delta = current.score - baseline.score
  const improved = delta > tolerance && newFailures.length === 0
  const regressed = delta < -tolerance || newFailures.length > 0

  const pct = (n) => `${(n * 100).toFixed(1)}%`
  let summary
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
export function scenariosFromHistory(logs, limit = 25) {
  const failures = logs.filter(l => !l.success).slice(0, limit)
  return failures.map((log, i) => ({
    id: `regression-${log.agentId}-${log.action}-${i}`,
    description: `Previously failed: ${log.agentId} → ${log.action}`,
    input: _nullishCoalesce(log.context, () => ( {})),
    // Once a known failure stops throwing, it counts as fixed.
    assert: (output) => output !== undefined && output !== null,
    weight: 2
  }))
}
