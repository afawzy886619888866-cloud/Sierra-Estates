 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { describe, it, expect } from 'vitest';
import { HarnessEvaluator } from '../evaluator';
import { EvalScenarioSchema } from '../types';
import { BENCHMARK_SCENARIOS } from '../scenarios';

describe('DeepSeek Harness Evaluator', () => {
  const evaluator = new HarnessEvaluator();

  it('validates benchmark scenarios schema', () => {
    expect(BENCHMARK_SCENARIOS.length).toBeGreaterThan(0);
    for (const scenario of BENCHMARK_SCENARIOS) {
      const parsed = EvalScenarioSchema.safeParse(scenario);
      expect(parsed.success).toBe(true);
    }
  });


  it('evaluates successful output correctly', () => {
    const scenario = {
      id: 'test-scenario',
      category: 'valuation',
      prompt: 'Calculate fair market value',
      expectedOutputKeys: ['estimatedValue', 'confidence'],
      maxLatencyMs: 2000,
      minAccuracyScore: 0.8,
    };

    const output = {
      estimatedValue: 5000000,
      confidence: 0.95,
    };

    const result = evaluator.evaluateOutput(
      scenario,
      output,
      500,
      { promptTokens: 50, completionTokens: 20, totalTokens: 70 }
    );

    expect(result.success).toBe(true);
    expect(result.accuracyScore).toBe(1);
    expect(result.validationErrors).toBeUndefined();
  });

  it('evaluates missing keys as failure', () => {
    const scenario = {
      id: 'test-scenario-fail',
      category: 'valuation',
      prompt: 'Calculate valuation',
      expectedOutputKeys: ['estimatedValue', 'confidence', 'roi'],
      maxLatencyMs: 2000,
      minAccuracyScore: 0.8,
    };

    const output = {
      estimatedValue: 5000000,
    };

    const result = evaluator.evaluateOutput(
      scenario,
      output,
      500,
      { promptTokens: 50, completionTokens: 20, totalTokens: 70 }
    );

    expect(result.success).toBe(false);
    expect(result.validationErrors).toBeDefined();
    expect(_optionalChain([result, 'access', _ => _.validationErrors, 'optionalAccess', _2 => _2.length])).toBe(2);
  });
});
