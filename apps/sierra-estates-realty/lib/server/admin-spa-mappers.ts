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
  const isPF = data.source === 'property_finder' || !!data.pfLeadId;
  return {
    id,
    name: data.name || (isPF ? `PF Lead (${data.pfLeadId || id.slice(0, 8)})` : 'Inbound Client'),
    phone: data.phone || '',
    email: data.email || '',
    source: data.source || (isPF ? 'property_finder' : 'website'),
    interest: data.notes || data.preferredPropertyType || data.interestedProjectIds?.[0] || (isPF ? `Property Finder Inquiry (${data.notes || 'Inquiry'})` : 'General Inquiry'),
    stage: leadStageToLabel(data.stage || (isPF ? 'inbound' : undefined)),
    color: data.color || (isPF ? '#f97316' : undefined),
    hot: data.hot ?? (isPF ? true : (typeof data.aiProfiling?.score === 'number' && data.aiProfiling.score >= 7)),
    archived: data.archived ?? false,
    ownerId: data.assignedTo,
    notes: data.notes || '',
    pfLeadId: data.pfLeadId || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function mapSpaToLeadPatch(patch: Record<string, any>) {
  const out: Record<string, any> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.phone !== undefined) out.phone = patch.phone;
  if (patch.email !== undefined) out.email = patch.email;
  if (patch.stage !== undefined) out.stage = labelToLeadStage(patch.stage);
  if (patch.color !== undefined) out.color = patch.color;
  if (patch.hot !== undefined) out.hot = patch.hot;
  if (patch.archived !== undefined) out.archived = patch.archived;
  if (patch.ownerId !== undefined) out.assignedTo = patch.ownerId;
  if (patch.notes !== undefined) out.notes = patch.notes;
  if (patch.source !== undefined) out.source = patch.source;
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
  const isPF = data.automation?.isPublishedToPF || data.pfStatus === 'published' || !!data.pfReferenceNumber;
  return {
    id,
    code: data.code || data.referenceNumber || data.pfReferenceNumber || id,
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
    isPublishedToPF: isPF,
    pfReferenceNumber: data.pfReferenceNumber || data.code || null,
    pfStatus: data.pfStatus || (isPF ? 'published' : 'draft'),
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
