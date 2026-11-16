/**
 * The learning loop.
 *
 * Agents do not rewrite themselves. They choose better among the skills they
 * already have, based on what has measurably worked — and every claim of
 * "better" is a number derived from durable execution history.
 *
 * Two things keep this honest:
 *  - Wilson lower bound instead of raw success rate, so 1/1 successes does not
 *    outrank 87/100. A naive mean makes a single lucky run look perfect.
 *  - An explicit exploration floor, so a skill that fails early is not locked
 *    out forever on a sample of one.
 */
import type { ExecutionLog, Pattern, Skill, Context } from './types'

export interface SkillScore {
  skillId: string
  attempts: number
  successes: number
  /** Naive mean — reported for humans, never used for ranking. */
  rawSuccessRate: number
  /** Wilson lower bound at 95% — the ranking signal. */
  confidence: number
  lastUsed: Date | null
}

/**
 * Wilson score lower bound. Rewards evidence, not luck: it pulls low-sample
 * rates toward zero, so a skill must actually prove itself to rank highly.
 */
export function wilsonLowerBound(successes: number, attempts: number, z = 1.96): number {
  if (attempts === 0) return 0
  const p = successes / attempts
  const denom = 1 + (z * z) / attempts
  const centre = p + (z * z) / (2 * attempts)
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * attempts)) / attempts)
  return Math.max(0, (centre - margin) / denom)
}

/** Score every skill observed in the given execution history. */
export function scoreSkills(logs: ExecutionLog[]): SkillScore[] {
  const acc = new Map<string, { attempts: number; successes: number; lastUsed: Date | null }>()

  for (const log of logs) {
    for (const skillId of log.skillsUsed ?? []) {
      const e = acc.get(skillId) ?? { attempts: 0, successes: 0, lastUsed: null }
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

export interface RankOptions {
  /** Skills with fewer attempts than this are always kept in play. */
  explorationFloor?: number
  /** Drop skills whose confidence falls below this once they have evidence. */
  minConfidence?: number
}

/**
 * Order candidate skills by measured performance.
 *
 * Under-sampled skills are deliberately placed ahead of well-evidenced poor
 * performers: without that, the first failure of a new skill would bury it
 * permanently and the system would stop learning anything new.
 */
export function rankSkills(
  candidates: Skill[],
  scores: SkillScore[],
  options: RankOptions = {}
): Skill[] {
  const { explorationFloor = 3, minConfidence = 0.15 } = options
  const byId = new Map(scores.map(s => [s.skillId, s]))

  const scored = candidates.map(skill => {
    const s = byId.get(skill.id)
    return {
      skill,
      attempts: s?.attempts ?? 0,
      confidence: s?.confidence ?? 0,
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
export function summarisePatterns(patterns: Pattern[]): {
  totalRuns: number
  overallSuccessRate: number
  strongest: Pattern | null
  weakest: Pattern | null
} {
  if (!patterns.length) {
    return { totalRuns: 0, overallSuccessRate: 0, strongest: null, weakest: null }
  }
  const totalRuns = patterns.reduce((n, p) => n + p.occurrences, 0)
  const weighted = patterns.reduce((n, p) => n + p.successRate * p.occurrences, 0)
  const sorted = [...patterns].sort((a, b) => b.successRate - a.successRate)
  return {
    totalRuns,
    overallSuccessRate: totalRuns ? weighted / totalRuns : 0,
    strongest: sorted[0] ?? null,
    weakest: sorted[sorted.length - 1] ?? null
  }
}

/** Context helper: agents call this to pick their next move. */
export function chooseSkills(
  applicable: Skill[],
  logs: ExecutionLog[],
  _context?: Context,
  options?: RankOptions
): Skill[] {
  return rankSkills(applicable, scoreSkills(logs), options)
}
