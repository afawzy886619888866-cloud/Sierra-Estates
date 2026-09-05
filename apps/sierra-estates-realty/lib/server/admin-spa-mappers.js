 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }









const STAGE_TO_LABEL = {
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

const LABEL_TO_STAGE = Object.fromEntries(
  Object.entries(STAGE_TO_LABEL).map(([stage, label]) => [label, stage ])
);

export function leadStageToLabel(stage) {
  return (stage && STAGE_TO_LABEL[stage ]) || 'Initial Contact';
}

export function labelToLeadStage(label) {
  return (label && LABEL_TO_STAGE[label]) || 'inbound';
}

export function mapLeadToSpa(id, data) {
  const isPF = data.source === 'property-finder' || !!data.pfLeadId;
  return {
    id,
    name: data.name || (isPF ? `PF Lead (${data.pfLeadId || id.slice(0, 8)})` : 'Inbound Client'),
    phone: data.phone || '',
    email: data.email || '',
    source: data.source || (isPF ? 'property-finder' : 'website'),
    interest: data.notes || data.preferredPropertyType || _optionalChain([data, 'access', _ => _.interestedProjectIds, 'optionalAccess', _2 => _2[0]]) || (isPF ? `Property Finder Inquiry (${data.notes || 'Inquiry'})` : 'General Inquiry'),
    stage: leadStageToLabel(data.stage || (isPF ? 'inbound' : undefined)),
    color: data.color || (isPF ? '#f97316' : undefined),
    hot: _nullishCoalesce(data.hot, () => ( (isPF ? true : (typeof _optionalChain([data, 'access', _3 => _3.aiProfiling, 'optionalAccess', _4 => _4.score]) === 'number' && data.aiProfiling.score >= 7)))),
    archived: _nullishCoalesce(data.archived, () => ( false)),
    ownerId: data.assignedTo,
    notes: data.notes || '',
    pfLeadId: data.pfLeadId || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function mapSpaToLeadPatch(patch) {
  const out = {};
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

const STATUS_TO_LABEL = {
  available: 'Active',
  reserved: 'Review',
  'off-market': 'Review',
  sold: 'Sold',
  rented: 'Active',
};

const LABEL_TO_STATUS = {
  Active: 'available',
  Review: 'reserved',
  Sold: 'sold',
};

export function mapListingToSpa(id, data) {
  const isPF = _optionalChain([data, 'access', _5 => _5.automation, 'optionalAccess', _6 => _6.isPublishedToPF]) || data.pfStatus === 'published' || !!data.pfReferenceNumber;
  return {
    id,
    code: data.code || data.referenceNumber || data.pfReferenceNumber || id,
    cmp: data.compound || data.location || '',
    type: data.propertyType || 'apartment',
    beds: _nullishCoalesce(data.bedrooms, () => ( 0)),
    area: _nullishCoalesce(data.area, () => ( 0)),
    price: _nullishCoalesce(data.price, () => ( 0)),
    ai: _nullishCoalesce(_nullishCoalesce(_optionalChain([data, 'access', _7 => _7.intelligence, 'optionalAccess', _8 => _8.valuationScore]), () => ( _optionalChain([data, 'access', _9 => _9.intelligence, 'optionalAccess', _10 => _10.urgencyScore]))), () => ( 0)),
    status: STATUS_TO_LABEL[data.status ] || 'Active',
    img: _nullishCoalesce(_optionalChain([data, 'access', _11 => _11.images, 'optionalAccess', _12 => _12.length]), () => ( 0)),
    images: data.images || [],
    publishToClient: _nullishCoalesce(data.publishToClient, () => ( false)),
    isPublishedToPF: isPF,
    pfReferenceNumber: data.pfReferenceNumber || data.code || null,
    pfStatus: data.pfStatus || (isPF ? 'published' : 'draft'),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function mapSpaToListingPatch(patch) {
  const out = {};
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
