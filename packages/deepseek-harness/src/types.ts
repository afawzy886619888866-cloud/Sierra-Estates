import { z } from 'zod';

export const EvalScenarioSchema = z.object({
  id: z.string(),
  category: z.enum(['valuation', 'arabic_negotiation', 'lead_routing', 'contract_drafting', 'rag_memory']),
  prompt: z.string(),
  context: z.record(z.any()).optional(),
  expectedOutputKeys: z.array(z.string()),
  maxLatencyMs: z.number().default(5000),
  minAccuracyScore: z.number().min(0).max(1).default(0.8),
});

export type EvalScenario = z.infer<typeof EvalScenarioSchema>;

export interface EvalResult {
  scenarioId: string;
  success: boolean;
  accuracyScore: number;
  latencyMs: number;
  tokenCount: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  output: any;
  validationErrors?: string[];
  timestamp: string;
}

export interface HarnessSuiteReport {
  suiteId: string;
  totalScenarios: number;
  passedCount: number;
  failedCount: number;
  overallScore: number;
  averageLatencyMs: number;
  results: EvalResult[];
  startedAt: string;
  completedAt: string;
  environment: string;
}
