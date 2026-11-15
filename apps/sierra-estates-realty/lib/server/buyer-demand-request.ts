import { randomUUID } from 'node:crypto';
import { insertRecord, listRecords } from '@sierra-estates/db';
import { syncRequestToSheet } from '@/lib/services/RequestSheetSyncService';
import { normalizeEgyptianPhone } from '@/lib/utils/phone';

export interface BuyerDemandInput {
  mode?: 'sale' | 'rent';
  name: string;
  phone: string;
  email?: string;
  zone?: string;
  type?: string;
  unitType?: string;
  budget?: string;
  budgetMax?: number;
  compounds?: string[];
  bedrooms?: number;
  finishing?: string;
  notes?: string;
  campaign?: string;
  discountPercent?: number;
  voucherCode?: string;
  dealType?: string;
  targetDate?: string;
}

export interface BuyerDemandTopMatch {
  unitCode: string;
  code: string;
  id: string;
  title: string;
  compound: string;
  unitType: string;
  mode: string;
  price: number | null;
  bedrooms: number | null;
  areaSqm: number | null;
  scoreTier: string | null;
  aiScore: number;
}

export interface BuyerDemandResult {
  ok: true;
  success: true;
  id: string;
  requestId: string;
  matchedUnitCodes: string[];
  topMatches: BuyerDemandTopMatch[];
}

const EXCLUDED_STATUSES = new Set([
  'sold',
  'rented',
  'archived',
  'excluded',
  'broker excluded',
  'inactive',
  'cancelled',
]);

function extractUnitCode(row: Record<string, unknown>): string {
  const candidates = [
    row.Unit_Code,
    row.unit_code,
    row.unitCode,
    row.code,
    row.reference_number,
  ];
  for (const val of candidates) {
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }
  return typeof row.id === 'string' && row.id.trim().length > 0 ? row.id.trim() : '';
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeListingMode(row: Record<string, unknown>): 'sale' | 'rent' | '' {
  const raw = normalizeText(row.mode ?? row.deal_type ?? row.purpose ?? row.listing_type);
  if (raw.includes('rent') || raw.includes('إيجار')) return 'rent';
  if (raw.includes('sale') || raw.includes('resale') || raw.includes('بيع')) return 'sale';
  return '';
}

function extractNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = Number(value.replace(/[^\d.]/g, ''));
    if (Number.isFinite(cleaned) && cleaned > 0) return cleaned;
  }
  return null;
}

function computeCandidateScore(
  row: Record<string, unknown>,
  input: BuyerDemandInput
): { score: number; match: BuyerDemandTopMatch } | null {
  const unitCode = extractUnitCode(row);
  if (!unitCode) return null;

  const status = normalizeText(row.status ?? row.availability);
  if (status && EXCLUDED_STATUSES.has(status)) return null;

  const scoreTierRaw =
    typeof row.score_tier === 'string'
      ? row.score_tier
      : typeof row.scoreTier === 'string'
        ? row.scoreTier
        : typeof row.tier === 'string'
          ? row.tier
          : null;

  let score = 0;
  if (scoreTierRaw === 'tier_1_top_ad') score += 1000;
  else if (scoreTierRaw === 'tier_1_broker_top') score += 900;
  else if (scoreTierRaw === 'tier_1') score += 800;
  else if (scoreTierRaw === 'tier_2_search_only') score += 100;

  const aiScore = Number(row.ai_score ?? row.aiScore ?? 0);
  if (Number.isFinite(aiScore)) score += aiScore;

  const requestedMode = input.mode ?? (input.dealType === 'rent' ? 'rent' : 'sale');
  const listingMode = normalizeListingMode(row);
  if (listingMode) {
    score += listingMode === requestedMode ? 200 : -500;
  }

  const compoundRaw = String(row.compound ?? row.compound_name ?? row.zone ?? row.location ?? '').trim();
  const compoundLower = compoundRaw.toLowerCase();
  const wantedTargets = [
    ...(input.compounds ?? []),
    ...(input.zone ? input.zone.split(',').map((s) => s.trim()) : []),
  ]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (wantedTargets.length > 0 && compoundLower) {
    const hasCompoundMatch = wantedTargets.some(
      (target) => compoundLower.includes(target) || target.includes(compoundLower)
    );
    if (hasCompoundMatch) score += 150;
  }

  const price = extractNumeric(row.price ?? row.price_egp ?? row.asking_price);
  if (price !== null && typeof input.budgetMax === 'number' && input.budgetMax > 0) {
    if (price <= input.budgetMax * 1.15) score += 80;
    else if (price > input.budgetMax * 1.5) score -= 100;
  }

  const requestedUnitType = normalizeText(input.unitType ?? input.type);
  const listingUnitTypeRaw = String(row.unit_type ?? row.unitType ?? row.property_type ?? '').trim();
  if (requestedUnitType && listingUnitTypeRaw.toLowerCase().includes(requestedUnitType)) {
    score += 40;
  }

  const bedrooms = extractNumeric(row.bedrooms);
  if (bedrooms !== null && typeof input.bedrooms === 'number' && bedrooms >= input.bedrooms) {
    score += 30;
  }

  const areaSqm = extractNumeric(row.area_sqm ?? row.areaSqm ?? row.bua);

  return {
    score,
    match: {
      unitCode,
      code: unitCode,
      id: typeof row.id === 'string' && row.id ? row.id : unitCode,
      title: String(
        row.title ?? row.pf_title ?? [listingUnitTypeRaw, compoundRaw].filter(Boolean).join(' · ')
      ),
      compound: compoundRaw,
      unitType: listingUnitTypeRaw,
      mode: listingMode || requestedMode,
      price,
      bedrooms,
      areaSqm,
      scoreTier: scoreTierRaw,
      aiScore: Number.isFinite(aiScore) ? aiScore : 0,
    },
  };
}

export async function processBuyerDemandRequest(input: BuyerDemandInput): Promise<BuyerDemandResult> {
  let candidateRows: Record<string, unknown>[] = [];
  try {
    const listed = await listRecords<Record<string, unknown>>('listings', { limit: 150 });
    if (Array.isArray(listed)) {
      candidateRows = listed;
    }
  } catch {
    candidateRows = [];
  }

  const ranked = candidateRows
    .map((row) => computeCandidateScore(row, input))
    .filter((item): item is { score: number; match: BuyerDemandTopMatch } => item !== null)
    .sort((a, b) => b.score - a.score);

  const seenCodes = new Set<string>();
  const topMatches: BuyerDemandTopMatch[] = [];
  for (const item of ranked) {
    if (seenCodes.has(item.match.unitCode)) continue;
    seenCodes.add(item.match.unitCode);
    topMatches.push(item.match);
    if (topMatches.length >= 3) break;
  }

  const matchedUnitCodes = topMatches.map((m) => m.unitCode);
  const normalizedPhone = normalizeEgyptianPhone(input.phone) || input.phone.trim();
  const requestId = `REQ-${randomUUID().slice(0, 8).toUpperCase()}`;
  const preferredZone =
    (input.compounds && input.compounds.filter(Boolean).join(', ')) ||
    input.zone?.trim() ||
    '';
  const resolvedUnitType = input.unitType?.trim() || input.type?.trim() || '';
  const resolvedMode = input.mode === 'rent' ? 'rent' : 'resale';
  const resolvedBudget =
    input.budget?.trim() ||
    (typeof input.budgetMax === 'number' && input.budgetMax > 0
      ? `Up to ${input.budgetMax.toLocaleString()} EGP`
      : 'Open');
  const createdAt = new Date().toISOString();

  try {
    await insertRecord('inquiries', {
      id: requestId,
      mode: input.mode ?? 'sale',
      name: input.name.trim(),
      phone: normalizedPhone,
      email: input.email?.trim() || null,
      zone: preferredZone,
      unitType: resolvedUnitType,
      bedrooms: input.bedrooms ?? null,
      finishing: input.finishing?.trim() || null,
      budget: resolvedBudget,
      budgetMax: input.budgetMax ?? null,
      campaign: input.campaign?.trim() || null,
      discountPercent: input.discountPercent ?? null,
      voucherCode: input.voucherCode?.trim() || null,
      targetDate: input.targetDate?.trim() || null,
      notes: input.notes?.trim() || null,
      matchedUnits: matchedUnitCodes,
      status: 'new',
      source: 'website_request',
      createdAt,
    });
  } catch {
    // Best-effort persistence on the inquiries projection when upstream DB table/mock rejects
  }

  try {
    await syncRequestToSheet({
      id: requestId,
      type: 'buyer_demand',
      clientName: input.name.trim(),
      clientPhone: normalizedPhone,
      clientEmail: input.email?.trim() || '',
      mode: resolvedMode,
      preferredZone,
      unitType: resolvedUnitType,
      bedrooms: input.bedrooms,
      budget: resolvedBudget,
      finishing: input.finishing?.trim() || 'Any',
      campaign: input.campaign?.trim() || '',
      voucherCode: input.voucherCode?.trim() || '',
      targetDate: input.targetDate?.trim() || '',
      matchedUnits: matchedUnitCodes,
      status: 'new',
      notes: input.notes?.trim() || '',
      createdAt,
      source: 'website_request',
    });
  } catch {
    // Non-blocking mirror sync failure must not block user confirmation
  }

  return {
    ok: true,
    success: true,
    id: requestId,
    requestId,
    matchedUnitCodes,
    topMatches,
  };
}
