 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import { NegotiationEngine } from '@sierra-estates/agents-core';











/**
 * Single owner of the "simulate a negotiation" call. Accepts both field-name
 * conventions that existed across the two routes that used to each call
 * NegotiationEngine.simulateNegotiation directly with their own defaults.
 */
export function simulateNegotiationFromBody(body) {
  const askingPrice = Number(body.askingPrice) || 38000000;
  const buyerOfferPrice =
    Number(_nullishCoalesce(body.buyerOfferPrice, () => ( body.buyerOffer))) || Math.round(askingPrice * 0.92);
  const sellerFloorRaw = _nullishCoalesce(body.sellerFloorPrice, () => ( body.sellerFloor));
  const sellerFloorPrice = sellerFloorRaw !== undefined ? Number(sellerFloorRaw) : undefined;
  const buyerMaxYears = Number(_nullishCoalesce(body.buyerMaxYears, () => ( body.maxYears))) || 7;

  return NegotiationEngine.simulateNegotiation(
    askingPrice,
    buyerOfferPrice,
    sellerFloorPrice,
    buyerMaxYears
  );
}
