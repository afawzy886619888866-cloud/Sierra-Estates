import { z } from 'zod';
import * as schemas from './schemas';
import * as templates from './templates';

export * from './schemas';
export * from './templates';

export type PromptId =
  | 'property-parser'
  | 'unit-coder'
  | 'inventory-matcher'
  | 'lead-qualifier'
  | 'owner-reply-classifier'
  | 'career-evaluator';

export interface PromptDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  id: PromptId;
  version: string;
  stage: 'Stage 1: Ingestion' | 'Stage 2: Parsing & Coding' | 'Stage 3: Sync & Reply' | 'Stage 4: Matching & Dispatch';
  recommendedModel: string;
  trigger: string;
  systemPrompt: string;
  schema: TSchema;
}

export const PROMPT_REGISTRY: Record<PromptId, PromptDefinition> = {
  'property-parser': {
    id: 'property-parser',
    version: '2.1.0',
    stage: 'Stage 2: Parsing & Coding',
    recommendedModel: 'gemini-2.5-flash',
    trigger: 'WhatsApp Group / Telegram Intake / Raw Listing Text',
    systemPrompt: templates.PROPERTY_PARSER_SYSTEM_PROMPT,
    schema: schemas.PropertyListingExtractionSchema,
  },
  'unit-coder': {
    id: 'unit-coder',
    version: '2.0.0',
    stage: 'Stage 2: Parsing & Coding',
    recommendedModel: 'deterministic-rules + gemini-2.5-flash',
    trigger: 'Post-Extraction Canonical Code Assignment',
    systemPrompt: templates.UNIT_CODER_SYSTEM_PROMPT,
    schema: schemas.UnitCodeValidationSchema,
  },
  'inventory-matcher': {
    id: 'inventory-matcher',
    version: '2.2.0',
    stage: 'Stage 4: Matching & Dispatch',
    recommendedModel: 'gemini-2.5-pro / deepseek-reasoner',
    trigger: 'Client Request (/request, /api/inquiries) or Group Buyer Request',
    systemPrompt: templates.INVENTORY_MATCHER_SYSTEM_PROMPT,
    schema: schemas.InventoryMatchResultSchema,
  },
  'lead-qualifier': {
    id: 'lead-qualifier',
    version: '2.0.0',
    stage: 'Stage 4: Matching & Dispatch',
    recommendedModel: 'gemini-2.5-flash',
    trigger: 'Inbound Website Inquiry / Viewing Request / Campaign Lead',
    systemPrompt: templates.LEAD_QUALIFIER_SYSTEM_PROMPT,
    schema: schemas.LeadQualificationSchema,
  },
  'owner-reply-classifier': {
    id: 'owner-reply-classifier',
    version: '2.1.0',
    stage: 'Stage 3: Sync & Reply',
    recommendedModel: 'gemini-2.5-flash',
    trigger: 'Inbound WhatsApp Webhook Reply from Owner/Broker',
    systemPrompt: templates.OWNER_REPLY_CLASSIFIER_PROMPT,
    schema: schemas.OwnerReplyClassificationSchema,
  },
  'career-evaluator': {
    id: 'career-evaluator',
    version: '1.1.0',
    stage: 'Stage 2: Parsing & Coding',
    recommendedModel: 'gemini-2.5-flash',
    trigger: 'Career Landing Page (/career, /api/careers/apply) Submission',
    systemPrompt: templates.CAREER_EVALUATOR_SYSTEM_PROMPT,
    schema: schemas.CareerEvaluationSchema,
  },
};

export function getPrompt(id: PromptId): PromptDefinition {
  const def = PROMPT_REGISTRY[id];
  if (!def) {
    throw new Error(`[PROMPT_REGISTRY] Unknown prompt id: ${id}`);
  }
  return def;
}

export function validatePromptOutput<T = unknown>(
  id: PromptId,
  payload: unknown
): { ok: true; data: T } | { ok: false; errors: string[] } {
  const def = getPrompt(id);
  const parsed = def.schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((iss) => `${iss.path.join('.') || 'root'}: ${iss.message}`),
    };
  }
  return { ok: true, data: parsed.data as T };
}

export function listRegisteredPrompts(): Array<{
  id: PromptId;
  version: string;
  stage: string;
  recommendedModel: string;
  trigger: string;
}> {
  return Object.values(PROMPT_REGISTRY).map((p) => ({
    id: p.id,
    version: p.version,
    stage: p.stage,
    recommendedModel: p.recommendedModel,
    trigger: p.trigger,
  }));
}
