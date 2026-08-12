/**
 * Schema adapters for the standalone admin SPA (emeraldestatesegypt-ops/-19-6-AI).
 *
 * The SPA was built against its own ad-hoc Firestore shapes (simple stage labels,
 * "Active"/"Review"/"Sold" status strings) which don't match this app's canonical
 * schema (lib/models/schema.ts — PipelineStage enum, PropertyStatus enum, etc).
 * These mappers are the seam: read/write the real schema, expose the SPA's shape.
 */
import type { PipelineStage, PropertyStatus } from '@/lib/models/schema';

const STAGE_TO_LABEL: Record<PipelineStage, string> = {
  inbound: 'Initial Contact',
  qualify: 'AI Matched',
  engage: 'Engaging',
  proposal: 'Proposal Sent',
  viewing: 'Viewing Scheduled',
  negotiate: 'Negotiating',
  reserve: 'Reserved',
  contract: 'Contract Draft',
  handover: 'Handover',
  'closed-won': 'Closed Won',
};

const LABEL_TO_STAGE: Record<string, PipelineStage> = Object.fromEntries(
  Object.entries(STAGE_TO_LABEL).map(([stage, label]) => [label, stage as PipelineStage])
);

export function leadStageToLabel(stage?: string): string {
  return (stage && STAGE_TO_LABEL[stage as PipelineStage]) || 'Initial Contact';
}

export function labelToLeadStage(label?: string): PipelineStage {
  return (label && LABEL_TO_STAGE[label]) || 'inbound';
}

export function mapLeadToSpa(id: string, data: Record<string, any>) {
  return {
    id,
    name: data.name || '',
    phone: data.phone || '',
    interest: data.preferredPropertyType || data.interestedProjectIds?.[0] || data.source || 'General Inquiry',
    stage: leadStageToLabel(data.stage),
    color: data.color,
    hot: data.hot ?? (typeof data.aiProfiling?.score === 'number' && data.aiProfiling.score >= 7),
    archived: data.archived ?? false,
    ownerId: data.assignedTo,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function mapSpaToLeadPatch(patch: Record<string, any>) {
  const out: Record<string, any> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.phone !== undefined) out.phone = patch.phone;
  if (patch.stage !== undefined) out.stage = labelToLeadStage(patch.stage);
  if (patch.color !== undefined) out.color = patch.color;
  if (patch.hot !== undefined) out.hot = patch.hot;
  if (patch.archived !== undefined) out.archived = patch.archived;
  if (patch.ownerId !== undefined) out.assignedTo = patch.ownerId;
  return out;
}

const STATUS_TO_LABEL: Record<PropertyStatus, string> = {
  available: 'Active',
  reserved: 'Review',
  'off-market': 'Review',
  sold: 'Sold',
  rented: 'Active',
};

const LABEL_TO_STATUS: Record<string, PropertyStatus> = {
  Active: 'available',
  Review: 'reserved',
  Sold: 'sold',
};

export function mapListingToSpa(id: string, data: Record<string, any>) {
  return {
    id,
    code: data.code || data.referenceNumber || id,
    cmp: data.compound || data.location || '',
    type: data.propertyType || 'apartment',
    beds: data.bedrooms ?? 0,
    area: data.area ?? 0,
    price: data.price ?? 0,
    ai: data.intelligence?.valuationScore ?? data.intelligence?.urgencyScore ?? 0,
    status: STATUS_TO_LABEL[data.status as PropertyStatus] || 'Active',
    img: data.images?.length ?? 0,
    images: data.images || [],
    publishToClient: data.publishToClient ?? false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function mapSpaToListingPatch(patch: Record<string, any>) {
  const out: Record<string, any> = {};
  if (patch.code !== undefined) out.code = patch.code;
  if (patch.cmp !== undefined) out.compound = patch.cmp;
  if (patch.type !== undefined) out.propertyType = patch.type;
  if (patch.beds !== undefined) out.bedrooms = patch.beds;
  if (patch.area !== undefined) out.area = patch.area;
  if (patch.price !== undefined) out.price = patch.price;
  if (patch.status !== undefined) out.status = LABEL_TO_STATUS[patch.status] || 'available';
  if (patch.publishToClient !== undefined) out.publishToClient = patch.publishToClient;
  return out;
}
