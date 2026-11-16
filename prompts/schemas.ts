import { z } from 'zod';

/**
 * Sierra Estates — Strict Structured-Output Zod Schemas for All AI Prompts
 * Versioned schema contracts enforcing zero unvalidated LLM responses.
 */

export const PropertyListingExtractionSchema = z.object({
  compound: z.string().trim().min(1),
  unitType: z.string().trim().min(1),
  unitCode: z.string().trim().optional(),
  bedrooms: z.coerce.number().int().min(0).max(30).default(3),
  bathrooms: z.coerce.number().int().min(0).max(30).default(2),
  areaSqm: z.coerce.number().nonnegative().default(0),
  priceEgp: z.coerce.number().nonnegative().default(0),
  currency: z.enum(['EGP', 'USD']).default('EGP'),
  mode: z.enum(['sale', 'rent']).default('sale'),
  ownerPhone: z.string().trim().optional().default(''),
  channelSource: z.enum(['owner', 'broker', 'website', 'telegram', 'whatsapp', 'sheet']).default('whatsapp'),
  floor: z.string().trim().optional().default(''),
  finishing: z.string().trim().optional().default(''),
  notes: z.string().trim().optional().default(''),
});

export type PropertyListingExtraction = z.infer<typeof PropertyListingExtractionSchema>;

export const UnitCodeValidationSchema = z.object({
  compoundCode: z.string().trim().min(2).max(16),
  zoneCode: z.string().trim().default('NC'),
  buildingNumber: z.string().trim().default('00'),
  unitNumber: z.string().trim().default('00'),
  canonicalCode: z.string().trim().min(4),
  confidence: z.coerce.number().min(0).max(1).default(0.95),
});

export type UnitCodeValidation = z.infer<typeof UnitCodeValidationSchema>;

export const InventoryMatchResultSchema = z.object({
  requestId: z.string().trim().min(1),
  matchedUnitIds: z.array(z.string().trim()).default([]),
  matchScore: z.coerce.number().min(0).max(100),
  priceArbitrageVerdict: z.enum(['UNDERPRICED', 'FAIR_VALUE', 'OVERPRICED']).default('FAIR_VALUE'),
  reasoningAr: z.string().trim().min(1),
  reasoningEn: z.string().trim().min(1),
});

export type InventoryMatchResult = z.infer<typeof InventoryMatchResultSchema>;

export const LeadQualificationSchema = z.object({
  leadId: z.string().trim().min(1),
  intent: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  buyerType: z.enum(['end_user', 'investor', 'broker']).default('end_user'),
  budgetValid: z.boolean().default(true),
  recommendedNextStep: z.string().trim().min(1),
  whatsappReplyAr: z.string().trim().min(1),
});

export type LeadQualification = z.infer<typeof LeadQualificationSchema>;

export const OwnerReplyClassificationSchema = z.object({
  intent: z.enum(['AVAILABLE', 'SOLD', 'POSTPONED', 'PRICE_UPDATE', 'OPT_OUT', 'UNKNOWN']),
  extractedPriceEgp: z.coerce.number().nonnegative().optional(),
  confidence: z.coerce.number().min(0).max(1).default(0.8),
  requiresHumanFollowup: z.boolean().default(false),
});

export type OwnerReplyClassification = z.infer<typeof OwnerReplyClassificationSchema>;

export const CareerEvaluationSchema = z.object({
  applicationId: z.string().trim().min(1),
  roleFitScore: z.coerce.number().min(0).max(100),
  tier: z.enum(['A', 'B', 'C']),
  strengths: z.array(z.string().trim()).default([]),
  interviewQuestionsAr: z.array(z.string().trim()).default([]),
});

export type CareerEvaluation = z.infer<typeof CareerEvaluationSchema>;
