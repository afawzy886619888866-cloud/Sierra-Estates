import { z } from 'zod';

export const EvalScenarioSchema = z.object({
  id: z.string(),
  category: z.enum([
    'valuation',
    'arabic_negotiation',
    'lead_routing',
    'contract_drafting',
    'rag_memory',
    'arbitrage_detection',
    'fx_gold_parity',
    'scribe_extraction',
    'multi_party_negotiation',
    'voice_intent',
  ]),
  prompt: z.string(),
  context: z.record(z.string(), z.any()).optional(),
  expectedOutputKeys: z.array(z.string()),
  maxLatencyMs: z.number().default(5000),
  minAccuracyScore: z.number().min(0).max(1).default(0.8),
});

 




























