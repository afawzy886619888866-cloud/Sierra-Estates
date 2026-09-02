 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }






const TRANSITIONS = {
  draft: ['pending_verification', 'archived'],
  pending_verification: ['verified', 'draft', 'archived'],
  verified: ['published', 'pending_verification', 'archived'],
  published: ['reserved', 'expired', 'pending_verification', 'archived'],
  reserved: ['sold', 'rented', 'published', 'archived'],
  sold: [],
  rented: ['published'], // rental cycle can relist
  expired: ['pending_verification', 'archived'],
  archived: [],
};

export function canTransition(from, to) {
  return _nullishCoalesce(_optionalChain([TRANSITIONS, 'access', _ => _[from], 'optionalAccess', _2 => _2.includes, 'call', _3 => _3(to)]), () => ( false));
}

export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal listing transition: ${from} → ${to}`);
  }
}

/** States visible on the public site. */
export const PUBLIC_STATUSES = ['published', 'reserved'];

/** States that count toward the "verified listings" figure. */
export const VERIFIED_STATUSES = ['verified', 'published', 'reserved'];

/** Days without re-verification before a published listing is swept to expired. */
export const FRESHNESS_SLA_DAYS = 30;

export function isStale(verifiedAt, now = new Date()) {
  if (!verifiedAt) return true;
  const ageMs = now.getTime() - new Date(verifiedAt).getTime();
  return ageMs > FRESHNESS_SLA_DAYS * 24 * 60 * 60 * 1000;
}
