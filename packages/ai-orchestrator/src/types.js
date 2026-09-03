import { z } from 'zod';

 



































export const WorkflowResultSchema = z.object({
  workflowId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'paused']),
  results: z.record(z.string(), z.any()),
  metrics: z.object({
    durationMs: z.number(),
    stepsTotal: z.number(),
    stepsCompleted: z.number(),
    tokensUsed: z.number().optional(),
  }),
  timestamp: z.string(),
});

 










