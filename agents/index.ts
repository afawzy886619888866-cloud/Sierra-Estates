import {
  PROMPT_REGISTRY,
  validatePromptOutput,
  formatPublicGroupAutoReply,
  formatPrivateAdminContactForward,
  type PromptId,
  type PropertyListingExtraction,
  type UnitCodeValidation,
  type InventoryMatchResult,
  type LeadQualification,
  type CareerEvaluation,
} from '../prompts/index';
import {
  AGENCY_HELPLINE,
  normalizeEgyptianPhone,
  normalizeCompoundName,
  generateCanonicalUnitCode,
  stripPhoneNumbers,
} from '../core/deduplication';

export type AgentName =
  | 'PropertyParserAgent'
  | 'UnitCoderAgent'
  | 'InventoryMatcherAgent'
  | 'LeadQualifierAgent'
  | 'WhatsAppDispatcherAgent'
  | 'CareerEvaluatorAgent';

export interface AgentDescriptor {
  name: AgentName;
  role: string;
  promptId: PromptId;
  stage: 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4';
  triggerCondition: string;
  inputContract: string;
  outputContract: string;
}

export interface AgentBusEvent {
  timestamp: string;
  agent: AgentName;
  action: string;
  ok: boolean;
  summary: string;
}

const agentMemoryBus: AgentBusEvent[] = [];

export function emitAgentBusEvent(event: Omit<AgentBusEvent, 'timestamp'>): AgentBusEvent {
  const recorded: AgentBusEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  agentMemoryBus.unshift(recorded);
  if (agentMemoryBus.length > 100) agentMemoryBus.pop();
  return recorded;
}

export function getRecentAgentBusEvents(): AgentBusEvent[] {
  return [...agentMemoryBus];
}

export const AGENT_REGISTRY: Record<AgentName, AgentDescriptor> = {
  PropertyParserAgent: {
    name: 'PropertyParserAgent',
    role: 'Extracts structured listing JSON from bilingual WhatsApp/Telegram/sheet messages & classifies owner vs broker.',
    promptId: 'property-parser',
    stage: 'Stage 2',
    triggerCondition: 'Inbound WhatsApp Group message / Telegram intake / Quick paste',
    inputContract: '{ rawText: string; source?: string; defaultPhone?: string }',
    outputContract: 'PropertyListingExtractionSchema (Zod)',
  },
  UnitCoderAgent: {
    name: 'UnitCoderAgent',
    role: 'Assigns canonical SE-<COMPOUND>-<MODE>-<AREA>-<SUFFIX> codes & builds deduplication locks.',
    promptId: 'unit-coder',
    stage: 'Stage 2',
    triggerCondition: 'Immediately after PropertyParserAgent or Web Add-Listing submit',
    inputContract: '{ compound: string; mode: "sale" | "rent"; areaSqm?: number; phone?: string; unitNumber?: string }',
    outputContract: 'UnitCodeValidationSchema (Zod)',
  },
  InventoryMatcherAgent: {
    name: 'InventoryMatcherAgent',
    role: 'Matches buyer/tenant requests (/request or group demand) against available inventory with arbitrage verdicts.',
    promptId: 'inventory-matcher',
    stage: 'Stage 4',
    triggerCondition: 'New /request inquiry or buyer demand message in WhatsApp group',
    inputContract: '{ requestId: string; zone: string; mode: "sale" | "rent"; budgetEgp: number; bedrooms?: number; candidates: Array<...> }',
    outputContract: 'InventoryMatchResultSchema (Zod)',
  },
  LeadQualifierAgent: {
    name: 'LeadQualifierAgent',
    role: 'Qualifies buyer intent (HIGH/MEDIUM/LOW), validates budget & generates Egyptian Arabic concierge reply.',
    promptId: 'lead-qualifier',
    stage: 'Stage 4',
    triggerCondition: 'New website inquiry, viewing request, or WhatsApp DM',
    inputContract: '{ leadId: string; name: string; zone: string; budget: string; notes?: string }',
    outputContract: 'LeadQualificationSchema (Zod)',
  },
  WhatsAppDispatcherAgent: {
    name: 'WhatsAppDispatcherAgent',
    role: 'Dispatches privacy-safe public group unit replies (NO phone numbers) & forwards owner/broker contacts privately to 01092048333.',
    promptId: 'owner-reply-classifier',
    stage: 'Stage 4',
    triggerCondition: 'Group auto-reply match or closed-loop owner reply',
    inputContract: '{ unitCode: string; compound: string; unitType: string; mode: "sale" | "rent"; contactPhone?: string; channelSource?: "owner" | "broker" }',
    outputContract: '{ publicGroupMessage: string; privateAdminForward: string; adminRecipient: "01092048333" }',
  },
  CareerEvaluatorAgent: {
    name: 'CareerEvaluatorAgent',
    role: 'Evaluates job applications (/career) across Sales & Admin tracks and syncs tier scoring to Career_Applications sheet.',
    promptId: 'career-evaluator',
    stage: 'Stage 2',
    triggerCondition: 'POST /api/careers/apply or Admin Online Sheet sync',
    inputContract: '{ applicationId: string; role: string; experienceYears: number; hasVehicle: boolean; achievements: string }',
    outputContract: 'CareerEvaluationSchema (Zod)',
  },
};

export function runPropertyParserDryRun(input: {
  rawText: string;
  source?: 'owner' | 'broker' | 'website' | 'telegram' | 'whatsapp' | 'sheet';
  defaultPhone?: string;
}): PropertyListingExtraction {
  const text = String(input.rawText || '');
  const mode: 'sale' | 'rent' = /(ايجار|للإيجار|للايجار|\brent\b|شهريا|monthly)/i.test(text) ? 'rent' : 'sale';

  const compoundInfo = normalizeCompoundName(text);

  const areaMatch = text.match(/(\d{2,4})\s*(?:م²|متر|م(?=\s|$|[.,،])|sqm|m2)/i);
  const areaSqm = areaMatch ? Number(areaMatch[1]) : 0;

  const bedMatch = text.match(/(\d)\s*(?:غرف|غرفة|bed|br|rooms?)/i);
  const bedrooms = bedMatch ? Number(bedMatch[1]) : 3;

  const bathMatch = text.match(/(\d)\s*(?:حمام|bath)/i);
  const bathrooms = bathMatch ? Number(bathMatch[1]) : 2;

  let priceEgp = 0;
  const millionMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:مليون|m\b|million)/i);
  const thousandMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:الف|ألف|k\b)/i);
  const rawPriceMatch = text.match(/(\d{2,3}(?:,\d{3})+)/);

  if (millionMatch) {
    priceEgp = Math.round(Number(millionMatch[1]) * 1_000_000);
  } else if (thousandMatch) {
    priceEgp = Math.round(Number(thousandMatch[1]) * 1_000);
  } else if (rawPriceMatch) {
    priceEgp = Number(rawPriceMatch[1].replace(/,/g, ''));
  }

  const phoneMatch = text.match(/(?:\+?20|0020)?\s*(0?1[0125]\d[\d\s-]{7,10})/);
  const ownerPhone = normalizeEgyptianPhone(phoneMatch ? phoneMatch[1] : input.defaultPhone);

  let unitType = 'Apartment';
  if (/فيلا|villa|standalone|توين|twin|تاون|townhouse/i.test(text)) unitType = 'Villa';
  else if (/دوبلكس|duplex|i-villa|اي\s*فيلا/i.test(text)) unitType = 'Duplex';
  else if (/بنتهاوس|penthouse|روف|roof/i.test(text)) unitType = 'Penthouse';
  else if (/اداري|office|مكتب|عيادة|clinic|تجاري|shop/i.test(text)) unitType = 'Commercial';

  const isDirectOwner = /(من المالك|مالك مباشر|direct owner|owner direct)/i.test(text);
  const channelSource = input.source || (isDirectOwner ? 'owner' : 'broker');

  const unitCode = generateCanonicalUnitCode({
    compound: compoundInfo.canonicalName,
    mode,
    areaSqm,
    phone: ownerPhone,
  });

  const candidate: PropertyListingExtraction = {
    compound: compoundInfo.canonicalName,
    unitType,
    unitCode,
    bedrooms,
    bathrooms,
    areaSqm,
    priceEgp,
    currency: 'EGP',
    mode,
    ownerPhone,
    channelSource,
    floor: /ارضي|ground/i.test(text) ? 'Ground' : '',
    finishing: /سوبر\s*لوكس|متشطب|fully\s*finished|الترا/i.test(text) ? 'Fully Finished' : 'Core & Shell',
    notes: text.slice(0, 400).trim(),
  };

  const validated = validatePromptOutput<PropertyListingExtraction>('property-parser', candidate);
  if (!validated.ok) {
    throw new Error(`PropertyParser validation failed: ${validated.errors.join('; ')}`);
  }

  emitAgentBusEvent({
    agent: 'PropertyParserAgent',
    action: 'extract',
    ok: true,
    summary: `Parsed ${validated.data.unitType} in ${validated.data.compound} (${validated.data.unitCode})`,
  });

  return validated.data;
}

export function runUnitCoderDryRun(input: {
  compound: string;
  mode: 'sale' | 'rent';
  areaSqm?: number;
  phone?: string;
  unitNumber?: string;
}): UnitCodeValidation {
  const { code } = normalizeCompoundName(input.compound);
  const canonicalCode = generateCanonicalUnitCode(input);

  const payload: UnitCodeValidation = {
    compoundCode: code,
    zoneCode: 'NC',
    buildingNumber: '01',
    unitNumber: input.unitNumber || canonicalCode.split('-').pop() || '00',
    canonicalCode,
    confidence: 0.98,
  };

  const validated = validatePromptOutput<UnitCodeValidation>('unit-coder', payload);
  if (!validated.ok) {
    throw new Error(`UnitCoder validation failed: ${validated.errors.join('; ')}`);
  }

  emitAgentBusEvent({
    agent: 'UnitCoderAgent',
    action: 'assign-code',
    ok: true,
    summary: `Assigned canonical code ${validated.data.canonicalCode}`,
  });

  return validated.data;
}

export function runInventoryMatcherDryRun(input: {
  requestId: string;
  zone: string;
  mode: 'sale' | 'rent';
  budgetEgp: number;
  candidates: Array<{
    unitCode: string;
    compound: string;
    mode: 'sale' | 'rent';
    priceEgp: number;
    areaSqm?: number;
  }>;
}): InventoryMatchResult {
  const targetComp = normalizeCompoundName(input.zone).canonicalName.toLowerCase();
  const scored = input.candidates
    .map((c) => {
      let score = 30;
      const candComp = normalizeCompoundName(c.compound).canonicalName.toLowerCase();
      if (candComp.includes(targetComp) || targetComp.includes(candComp)) score += 40;
      if (c.mode === input.mode) score += 15;
      if (input.budgetEgp > 0 && c.priceEgp <= input.budgetEgp * 1.1) score += 15;
      return { c, score };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  const matchedIds = scored.filter((s) => s.score >= 60).map((s) => s.c.unitCode);
  const bestScore = top ? top.score : 0;

  let priceArbitrageVerdict: 'UNDERPRICED' | 'FAIR_VALUE' | 'OVERPRICED' = 'FAIR_VALUE';
  if (top && input.budgetEgp > 0) {
    if (top.c.priceEgp < input.budgetEgp * 0.85) priceArbitrageVerdict = 'UNDERPRICED';
    else if (top.c.priceEgp > input.budgetEgp * 1.15) priceArbitrageVerdict = 'OVERPRICED';
  }

  const result: InventoryMatchResult = {
    requestId: input.requestId,
    matchedUnitIds: matchedIds,
    matchScore: bestScore,
    priceArbitrageVerdict,
    reasoningAr:
      matchedIds.length > 0
        ? `تم مطابقة ${matchedIds.length} وحدة في ${input.zone} بدرجة توافق ${bestScore}% وتقييم ${priceArbitrageVerdict}.`
        : `لا توجد وحدات متطابقة بالكامل في ${input.zone} حالياً.`,
    reasoningEn:
      matchedIds.length > 0
        ? `Matched ${matchedIds.length} available unit(s) in ${input.zone} at ${bestScore}% score (${priceArbitrageVerdict}).`
        : `No exact available units matched in ${input.zone}.`,
  };

  const validated = validatePromptOutput<InventoryMatchResult>('inventory-matcher', result);
  if (!validated.ok) {
    throw new Error(`InventoryMatcher validation failed: ${validated.errors.join('; ')}`);
  }

  emitAgentBusEvent({
    agent: 'InventoryMatcherAgent',
    action: 'match',
    ok: true,
    summary: `Request ${input.requestId}: matched ${validated.data.matchedUnitIds.length} units (score ${validated.data.matchScore})`,
  });

  return validated.data;
}

export function runLeadQualifierDryRun(input: {
  leadId: string;
  name: string;
  zone: string;
  budget: string;
}): LeadQualification {
  const numericBudget = Number(String(input.budget || '').replace(/[^\d]/g, '')) || 0;
  const intent: 'HIGH' | 'MEDIUM' | 'LOW' = numericBudget > 0 && input.zone ? 'HIGH' : input.zone ? 'MEDIUM' : 'LOW';

  const result: LeadQualification = {
    leadId: input.leadId,
    intent,
    buyerType: 'end_user',
    budgetValid: numericBudget >= 0,
    recommendedNextStep:
      intent === 'HIGH' ? 'Assign Senior Property Advisor & Schedule Viewing' : 'Send Clarifying Budget Prompt on WhatsApp',
    whatsappReplyAr: `أهلاً بحضرتك أستاذ ${input.name} 🌿 وصلنا طلبك العقاري في ${input.zone || 'القاهرة الجديدة'} بميزانية ${input.budget || 'مفتوحة'}. فريق سييرا إيستيتس بيجهزلك أفضل الوحدات المتاحة دلوقتي، للتواصل المباشر: ${AGENCY_HELPLINE}.`,
  };

  const validated = validatePromptOutput<LeadQualification>('lead-qualifier', result);
  if (!validated.ok) {
    throw new Error(`LeadQualifier validation failed: ${validated.errors.join('; ')}`);
  }
  return validated.data;
}

export function runWhatsAppDispatcherDryRun(input: {
  unitCode: string;
  compound: string;
  unitType: string;
  mode: 'sale' | 'rent';
  areaSqm?: number;
  bedrooms?: number;
  priceEgp?: number;
  contactPhone: string;
  contactName?: string;
  channelSource: 'owner' | 'broker';
  rawSnippet?: string;
  groupName?: string;
}): {
  publicGroupMessage: string;
  privateAdminForward: string;
  adminRecipient: string;
} {
  // Privacy Guard: scrub any accidental phone digits from public group reply
  const rawPublic = formatPublicGroupAutoReply({
    unitCode: input.unitCode,
    compound: input.compound,
    unitType: input.unitType,
    mode: input.mode,
    areaSqm: input.areaSqm,
    bedrooms: input.bedrooms,
    priceEgp: input.priceEgp,
  });
  const publicGroupMessage = stripPhoneNumbers(rawPublic);

  const privateAdminForward = formatPrivateAdminContactForward({
    unitCode: input.unitCode,
    compound: input.compound,
    unitType: input.unitType,
    contactPhone: normalizeEgyptianPhone(input.contactPhone) || input.contactPhone,
    contactName: input.contactName,
    channelSource: input.channelSource,
    rawSnippet: input.rawSnippet,
    groupName: input.groupName,
  });

  emitAgentBusEvent({
    agent: 'WhatsAppDispatcherAgent',
    action: 'split-dispatch',
    ok: true,
    summary: `Prepared public group reply (${input.unitCode}) + private forward to ${AGENCY_HELPLINE}`,
  });

  return {
    publicGroupMessage,
    privateAdminForward,
    adminRecipient: AGENCY_HELPLINE,
  };
}

export function runCareerEvaluatorDryRun(input: {
  applicationId: string;
  role: string;
  experienceYears: number;
  hasVehicle: boolean;
  achievements: string;
}): CareerEvaluation {
  let score = 45;
  if (input.experienceYears >= 2) score += 25;
  if (input.hasVehicle) score += 15;
  if (input.achievements.trim().length > 25) score += 15;
  score = Math.min(100, score);

  const tier: 'A' | 'B' | 'C' = score >= 80 ? 'A' : score >= 60 ? 'B' : 'C';

  const result: CareerEvaluation = {
    applicationId: input.applicationId,
    roleFitScore: score,
    tier,
    strengths: [
      `${input.experienceYears} years real estate / ops experience`,
      input.hasVehicle ? 'Has personal vehicle for New Cairo viewings' : 'Office/Admin mobility ready',
      'Submitted documented achievements',
    ],
    interviewQuestionsAr: [
      'ما هو أكبر حجم مبيعات أو صفقات أتممتها في القاهرة الجديدة؟',
      'كيف تدير متابعة عميل يبحث عن فيلا في التجمع الخامس خلال أسبوع؟',
    ],
  };

  const validated = validatePromptOutput<CareerEvaluation>('career-evaluator', result);
  if (!validated.ok) {
    throw new Error(`CareerEvaluator validation failed: ${validated.errors.join('; ')}`);
  }
  return validated.data;
}

export function getAgentManifest() {
  return Object.values(AGENT_REGISTRY).map((agent) => ({
    ...agent,
    promptVersion: PROMPT_REGISTRY[agent.promptId].version,
    recommendedModel: PROMPT_REGISTRY[agent.promptId].recommendedModel,
  }));
}
