 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * packages/db — Property Finder integration types and helpers
 */
































export async function pushListingToPF(listing) {
  if (!listing.id) return { success: false, error: 'listing.id is required' };

  // Test seam: unit tests inject a token via globalThis.__TEST_TOKEN__ so we
  // don't need a live Firebase Auth session. Never set in production.
  let token =
    (globalThis ).__TEST_TOKEN__;
  if (!token && typeof window !== 'undefined') {
    try {
      const { getAuth } = await import('firebase/auth');
      token = await _optionalChain([getAuth, 'call', _ => _(), 'access', _2 => _2.currentUser, 'optionalAccess', _3 => _3.getIdToken, 'call', _4 => _4()]);
    } catch (e) { /* ignore */ }
  }

  if (!token) return { success: false, error: 'Authentication required' };

  try {
    const res  = await fetch('/api/sync/publish', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId: listing.id }),
    });
    const data = (await res.json()) ;
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, id: _nullishCoalesce(data.id, () => ( listing.id)) };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getPFListingAnalytics(_pfListingId) {
  return { views: 0, leads: 0, phoneReveals: 0, impressions: 0, ctr: 0 };
}
