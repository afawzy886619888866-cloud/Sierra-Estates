import { describe, it, expect } from 'vitest';
import { HarnessEvaluator } from '../evaluator';
import { EvalScenario, EvalScenarioSchema } from '../types';
import { DEFAULT_BENCHMARK_SCENARIOS } from '../scenarios';

describe('DeepSeek Harness Evaluator', () => {
  const evaluator = new HarnessEvaluator();

  it('validates benchmark scenarios schema', () => {
    expect(DEFAULT_BENCHMARK_SCENARIOS.length).toBeGreaterThan(0);
    for (const scenario of DEFAULT_BENCHMARK_SCENARIOS) {
      const parsed = EvalScenarioSchema.safeParse(scenario);
      expect(parsed.success).toBe(true);
    }
  });

  it('evaluates successful output correctly', () => {
    const scenario: EvalScenario = {
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
    const scenario: EvalScenario = {
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
    expect(result.validationErrors?.length).toBe(2);
  });
});
