import { NegotiationEngine } from '@sierra-estates/agents-core';

export interface NegotiationSimulateBody {
  askingPrice?: number | string;
  buyerOfferPrice?: number | string;
  buyerOffer?: number | string;
  sellerFloorPrice?: number | string;
  sellerFloor?: number | string;
  buyerMaxYears?: number | string;
  maxYears?: number | string;
}

/**
 * Single owner of the "simulate a negotiation" call. Accepts both field-name
 * conventions that existed across the two routes that used to each call
 * NegotiationEngine.simulateNegotiation directly with their own defaults.
 */
export function simulateNegotiationFromBody(body: NegotiationSimulateBody) {
  const askingPrice = Number(body.askingPrice) || 38_000_000;
  const buyerOfferPrice =
    Number(body.buyerOfferPrice ?? body.buyerOffer) || Math.round(askingPrice * 0.92);
  const sellerFloorRaw = body.sellerFloorPrice ?? body.sellerFloor;
  const sellerFloorPrice = sellerFloorRaw !== undefined ? Number(sellerFloorRaw) : undefined;
  const buyerMaxYears = Number(body.buyerMaxYears ?? body.maxYears) || 7;

  return NegotiationEngine.simulateNegotiation(
    askingPrice,
    buyerOfferPrice,
    sellerFloorPrice,
    buyerMaxYears
  );
}
