import { describe, it, expect } from 'vitest';
import { BENCHMARK_SCENARIOS } from '../packages/deepseek-harness/src/scenarios';
import { DeepSeekHarness } from '../packages/deepseek-harness/src/harness';
import { HarnessEvaluator } from '../packages/deepseek-harness/src/evaluator';

describe('Prompts & AI Evaluation Benchmark Suite', () => {
  describe('DeepSeek Benchmark Scenarios & Prompt Contracts', () => {
    it('should load all benchmark evaluation scenarios', () => {
      expect(BENCHMARK_SCENARIOS).toBeDefined();
      expect(BENCHMARK_SCENARIOS.length).toBeGreaterThanOrEqual(10);
    });

    it('each scenario should contain valid prompt, systemPrompt, expectedOutput, and weights', () => {
      for (const scenario of BENCHMARK_SCENARIOS) {
        expect(scenario.id, 'Scenario must have an ID').toBeTruthy();
        expect(scenario.category, 'Scenario must have a category').toBeTruthy();
        expect(scenario.prompt, `Scenario ${scenario.id} must have a prompt`).toBeTruthy();
        expect(scenario.systemPrompt, `Scenario ${scenario.id} must have a systemPrompt`).toBeTruthy();
        expect(scenario.expectedOutput, `Scenario ${scenario.id} must have expectedOutput`).toBeDefined();
        expect(scenario.evaluationWeights, `Scenario ${scenario.id} must have evaluationWeights`).toBeDefined();
        
        const totalWeight = scenario.evaluationWeights.accuracy +
          scenario.evaluationWeights.speed +
          scenario.evaluationWeights.format;
        expect(Math.round(totalWeight * 100) / 100).toBe(1.0);
      }
    });

    it('should include Arabic negotiation and Cairo real estate scenarios', () => {
      const categories = BENCHMARK_SCENARIOS.map(s => s.category);
      expect(categories).toContain('arabic_negotiation');
      expect(categories).toContain('valuation');
      expect(categories).toContain('arbitrage_detection');
      expect(categories).toContain('contract_drafting');
      expect(categories).toContain('fx_gold_parity');
    });
  });

  describe('AI Prompt Evaluator Engine', () => {
    const evaluator = new HarnessEvaluator();

    it('should score high accuracy when output matches expected schema perfectly', () => {
      const scenario = BENCHMARK_SCENARIOS.find(s => s.id === 'val-mivida-villa-q2')!;
      const output = {
        estimatedValueEgp: 25000000,
        confidenceScore: 0.95,
        pricePerMeter: 78125,
        comparablesCount: 14,
      };

      const result = evaluator.evaluateOutput(scenario, output, 450, {
        promptTokens: 100,
        completionTokens: 80,
        totalTokens: 180,
      });

      expect(result.success).toBe(true);
      expect(result.accuracyScore).toBeGreaterThanOrEqual(0.85);
      expect(result.latencyMs).toBe(450);
    });

    it('should flag validation errors when output misses critical keys', () => {
      const scenario = BENCHMARK_SCENARIOS.find(s => s.id === 'val-mivida-villa-q2')!;
      const incompleteOutput = {
        unrelatedKey: 123,
      };

      const result = evaluator.evaluateOutput(scenario, incompleteOutput, 2500, {
        promptTokens: 100,
        completionTokens: 20,
        totalTokens: 120,
      });

      expect(result.validationErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Full Harness Suite Execution Simulation', () => {
    it('DeepSeekHarness should execute full suite and meet minimum 75% accuracy threshold', async () => {
      const harness = new DeepSeekHarness();
      const report = await harness.runFullSuite();

      expect(report).toBeDefined();
      expect(report.totalScenarios).toBe(BENCHMARK_SCENARIOS.length);
      expect(report.passedCount).toBeGreaterThan(0);
      expect(report.overallScore).toBeGreaterThanOrEqual(0.75);
      expect(report.averageLatencyMs).toBeGreaterThan(0);
    });
  });
});
