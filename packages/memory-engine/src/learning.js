 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

























/**
 * Wilson score lower bound. Rewards evidence, not luck: it pulls low-sample
 * rates toward zero, so a skill must actually prove itself to rank highly.
 */
export function wilsonLowerBound(successes, attempts, z = 1.96) {
  if (attempts === 0) return 0
  const p = successes / attempts
  const denom = 1 + (z * z) / attempts
  const centre = p + (z * z) / (2 * attempts)
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * attempts)) / attempts)
  return Math.max(0, (centre - margin) / denom)
}

/** Score every skill observed in the given execution history. */
export function scoreSkills(logs) {
  const acc = new Map()

  for (const log of logs) {
    for (const skillId of _nullishCoalesce(log.skillsUsed, () => ( []))) {
      const e = _nullishCoalesce(acc.get(skillId), () => ( { attempts: 0, successes: 0, lastUsed: null }))
      e.attempts++
      if (log.success) e.successes++
      const at = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp)
      if (!e.lastUsed || at > e.lastUsed) e.lastUsed = at
      acc.set(skillId, e)
    }
  }

  return [...acc.entries()]
    .map(([skillId, e]) => ({
      skillId,
      attempts: e.attempts,
      successes: e.successes,
      rawSuccessRate: e.attempts ? e.successes / e.attempts : 0,
      confidence: wilsonLowerBound(e.successes, e.attempts),
      lastUsed: e.lastUsed
    }))
    .sort((a, b) => b.confidence - a.confidence)
}








/**
 * Order candidate skills by measured performance.
 *
 * Under-sampled skills are deliberately placed ahead of well-evidenced poor
 * performers: without that, the first failure of a new skill would bury it
 * permanently and the system would stop learning anything new.
 */
export function rankSkills(
  candidates,
  scores,
  options = {}
) {
  const { explorationFloor = 3, minConfidence = 0.15 } = options
  const byId = new Map(scores.map(s => [s.skillId, s]))

  const scored = candidates.map(skill => {
    const s = byId.get(skill.id)
    return {
      skill,
      attempts: _nullishCoalesce(_optionalChain([s, 'optionalAccess', _ => _.attempts]), () => ( 0)),
      confidence: _nullishCoalesce(_optionalChain([s, 'optionalAccess', _2 => _2.confidence]), () => ( 0)),
      exploring: !s || s.attempts < explorationFloor
    }
  })

  const keep = scored.filter(x => x.exploring || x.confidence >= minConfidence)
  // If evidence disqualified everything, fall back to the full set rather than
  // handing back nothing and stalling the agent.
  const pool = keep.length ? keep : scored

  return pool
    .sort((a, b) => {
      // Exploration first, so new skills earn their sample.
      if (a.exploring !== b.exploring) return a.exploring ? -1 : 1
      return b.confidence - a.confidence
    })
    .map(x => x.skill)
}

/** Human-readable summary of what the system currently believes. */
export function summarisePatterns(patterns)




 {
  if (!patterns.length) {
    return { totalRuns: 0, overallSuccessRate: 0, strongest: null, weakest: null }
  }
  const totalRuns = patterns.reduce((n, p) => n + p.occurrences, 0)
  const weighted = patterns.reduce((n, p) => n + p.successRate * p.occurrences, 0)
  const sorted = [...patterns].sort((a, b) => b.successRate - a.successRate)
  return {
    totalRuns,
    overallSuccessRate: totalRuns ? weighted / totalRuns : 0,
    strongest: _nullishCoalesce(sorted[0], () => ( null)),
    weakest: _nullishCoalesce(sorted[sorted.length - 1], () => ( null))
  }
}

/** Context helper: agents call this to pick their next move. */
export function chooseSkills(
  applicable,
  logs,
  _context,
  options
) {
  return rankSkills(applicable, scoreSkills(logs), options)
}
