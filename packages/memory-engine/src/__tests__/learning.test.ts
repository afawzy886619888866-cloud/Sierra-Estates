import { MemoryEngine } from '../memory-engine'
import { wilsonLowerBound, scoreSkills, rankSkills } from '../learning'
import { runEval, compareRuns, type EvalRunResult } from '../eval-harness'
import { InMemoryStore } from '../stores/memory-store'
import type { ExecutionLog, Skill } from '../types'

const log = (
  agentId: string,
  action: string,
  success: boolean,
  skillsUsed: string[] = [],
  at = new Date()
): ExecutionLog => ({ agentId, action, success, skillsUsed, timestamp: at })

describe('pattern success rate', () => {
  // Regression guard: the original implementation only adjusted successRate on
  // success while still counting the attempt, so failures were invisible and
  // the rate drifted to 1.0.
  it('counts failures against the success rate', () => {
    const engine = new MemoryEngine({ store: new InMemoryStore() })
    engine.logExecution(log('closer', 'reply', true))
    engine.logExecution(log('closer', 'reply', false))
    engine.logExecution(log('closer', 'reply', false))
    engine.logExecution(log('closer', 'reply', true))

    const [pattern] = engine.getPatterns()
    expect(pattern.occurrences).toBe(4)
    expect(pattern.successRate).toBeCloseTo(0.5, 5)
  })

  it('does not report a perfect rate for an all-failure pattern', () => {
    const engine = new MemoryEngine({ store: new InMemoryStore() })
    engine.logExecution(log('a', 'x', false))
    engine.logExecution(log('a', 'x', false))
    expect(engine.getPatterns()[0].successRate).toBe(0)
  })

  it('reports lastUsed from the log, not from analysis time', () => {
    const engine = new MemoryEngine({ store: new InMemoryStore() })
    const then = new Date('2026-01-01T00:00:00Z')
    engine.logExecution(log('a', 'x', true, [], then))
    expect(engine.getPatterns()[0].lastUsed.toISOString()).toBe(then.toISOString())
  })
})

describe('wilsonLowerBound', () => {
  it('ranks a well-evidenced good skill above a lucky single success', () => {
    const lucky = wilsonLowerBound(1, 1)
    const proven = wilsonLowerBound(87, 100)
    expect(proven).toBeGreaterThan(lucky)
  })

  it('is zero with no attempts', () => {
    expect(wilsonLowerBound(0, 0)).toBe(0)
  })

  it('never exceeds the raw rate', () => {
    expect(wilsonLowerBound(8, 10)).toBeLessThanOrEqual(0.8)
  })
})

describe('skill ranking', () => {
  const skills: Skill[] = [
    { id: 'proven', name: 'proven' },
    { id: 'bad', name: 'bad' },
    { id: 'untried', name: 'untried' }
  ]

  it('explores untried skills first and drops well-evidenced bad ones', () => {
    const logs: ExecutionLog[] = [
      ...Array.from({ length: 20 }, () => log('a', 'x', true, ['proven'])),
      ...Array.from({ length: 20 }, () => log('a', 'x', false, ['bad']))
    ]
    const ranked = rankSkills(skills, scoreSkills(logs))
    const ids = ranked.map(s => s.id)

    // No evidence yet, so it earns a sample before anything is concluded.
    expect(ids[0]).toBe('untried')
    // 20 straight failures clear the confidence floor — 'bad' is excluded.
    expect(ids).not.toContain('bad')
    // The skill with real supporting evidence survives.
    expect(ids).toContain('proven')
  })

  it('never returns an empty list even when all evidence is bad', () => {
    const logs = Array.from({ length: 30 }, () => log('a', 'x', false, ['proven', 'bad']))
    const ranked = rankSkills(
      [skills[0], skills[1]],
      scoreSkills(logs),
      { explorationFloor: 0 }
    )
    expect(ranked.length).toBe(2)
  })
})

describe('eval harness', () => {
  it('scores a suite and treats a throwing scenario as failed', async () => {
    const result = await runEval(
      'demo',
      [
        { id: 'ok', description: '', input: 1, assert: (o) => o === 2 },
        { id: 'boom', description: '', input: 0, assert: () => true }
      ],
      async (input) => {
        if (input === 0) throw new Error('exploded')
        return (input as number) * 2
      }
    )
    expect(result.passed).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.cases.find(c => c.id === 'boom')?.error).toBe('exploded')
    expect(result.score).toBeCloseTo(0.5, 5)
  })

  it('flags a new failure as a regression even when the score is flat', () => {
    const baseline: EvalRunResult = {
      suite: 's', startedAt: '', finishedAt: '', total: 2, passed: 1, failed: 1,
      score: 0.5, durationMs: 0,
      cases: [
        { id: 'a', passed: true, durationMs: 0, weight: 1 },
        { id: 'b', passed: false, durationMs: 0, weight: 1 }
      ]
    }
    const current: EvalRunResult = {
      ...baseline,
      cases: [
        { id: 'a', passed: false, durationMs: 0, weight: 1 },
        { id: 'b', passed: true, durationMs: 0, weight: 1 }
      ]
    }
    const verdict = compareRuns(current, baseline)
    expect(verdict.regressed).toBe(true)
    expect(verdict.newFailures).toEqual(['a'])
    expect(verdict.fixed).toEqual(['b'])
  })
})

describe('durable store', () => {
  it('persists executions and computes patterns from history', async () => {
    const store = new InMemoryStore()
    const engine = new MemoryEngine({ store })
    engine.logExecution(log('a', 'x', true))
    engine.logExecution(log('a', 'x', false))
    await engine.flush()

    const patterns = await engine.getPatternsFromStore()
    expect(patterns[0].occurrences).toBe(2)
    expect(patterns[0].successRate).toBeCloseTo(0.5, 5)
  })

  it('survives a "cold start" — a new engine reads prior history', async () => {
    const store = new InMemoryStore()
    const first = new MemoryEngine({ store })
    first.logExecution(log('a', 'x', true))
    await first.flush()

    // Simulates a fresh serverless process sharing the same backend.
    const second = new MemoryEngine({ store })
    expect(second.getPatterns()).toHaveLength(0)          // cold cache
    expect(await second.getPatternsFromStore()).toHaveLength(1) // durable
  })
})
