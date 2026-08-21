import { EvalScenario } from './types.js';

export const BENCHMARK_SCENARIOS: EvalScenario[] = [
  {
    id: 'sc-cairo-avm-001',
    category: 'valuation',
    prompt: 'Calculate the AVM market estimate for a 320m2 standalone villa in Hyde Park New Cairo with private garden, finished delivery 2026.',
    context: {
      compound: 'Hyde Park',
      zone: '5th Settlement',
      sqm: 320,
      propertyType: 'villa',
      baselineMeterPriceEgp: 78000,
    },
    expectedOutputKeys: ['estimatedValueEgp', 'confidenceScore', 'pricePerMeter', 'comparablesCount'],
    maxLatencyMs: 4000,
    minAccuracyScore: 0.85,
  },
  {
    id: 'sc-arabic-lead-002',
    category: 'arabic_negotiation',
    prompt: 'عميل يبحث عن شقة للإيجار في ميفيدا التجمع الخامس، 3 غرف نوم، ميزانية حتى 45,000 جنيه شهرياً. قدم عرض مناسب ورتب موعد معاينة.',
    context: {
      clientLanguage: 'ar',
      budgetEgp: 45000,
      location: 'Mivida, New Cairo',
    },
    expectedOutputKeys: ['arabicResponse', 'proposedUnits', 'callToAction', 'intentClassification'],
    maxLatencyMs: 3500,
    minAccuracyScore: 0.9,
  },
  {
    id: 'sc-routing-intent-003',
    category: 'lead_routing',
    prompt: 'Inbound lead with budget of 80M EGP requesting cash purchase of twin-house in Mountain View iCity within 14 days.',
    context: {
      budgetEgp: 80000000,
      urgency: 'high',
      leadType: 'investor_vip',
    },
    expectedOutputKeys: ['assignedAgent', 'urgencyTier', 'routingDestination', 'priorityScore'],
    maxLatencyMs: 2500,
    minAccuracyScore: 0.95,
  },
  {
    id: 'sc-contract-terms-004',
    category: 'contract_drafting',
    prompt: 'Draft standard Sierra Estates luxury lease contract terms for 1-year residential tenancy in Eastown Sodic with 2 months deposit.',
    context: {
      depositMonths: 2,
      durationMonths: 12,
      jurisdiction: 'New Cairo, Egypt',
    },
    expectedOutputKeys: ['depositTerms', 'escalationClause', 'maintenanceResponsibility', 'governingLaw'],
    maxLatencyMs: 4500,
    minAccuracyScore: 0.85,
  },
  {
    id: 'sc-rag-memory-005',
    category: 'rag_memory',
    prompt: 'Retrieve historical transaction data for Uptown Cairo Emaar units sold in Q2 2026 and synthesize compound appreciation rate.',
    context: {
      compound: 'Uptown Cairo',
      period: 'Q2 2026',
    },
    expectedOutputKeys: ['historicalVolume', 'appreciationPct', 'memorySources'],
    maxLatencyMs: 3000,
    minAccuracyScore: 0.88,
  },
];
