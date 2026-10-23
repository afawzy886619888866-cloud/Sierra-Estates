/**
 * Unified FX — the ONE place that converts between EGP and USD.
 *
 * Before this module existed the codebase hardcoded the rate at the point of
 * use and the points disagreed: `48.5` in ExcelInventoryService, `50` in
 * /api/listings/submit, `48.65` in the FX-gold parity engine. The same
 * listing therefore showed a different USD price depending on which route
 * wrote it. Every conversion now imports from here, and the rate itself is
 * `DEFAULT_FX_RATES.USD` from @sierra-estates/agents-core — the same number
 * the /api/fx-gold parity endpoint and the CurrencyGoldSelector component
 * display, so a buyer never sees two USD figures for one unit.
 *
 * Update cadence: DEFAULT_FX_RATES is the offline-safe default the parity
 * engine also uses for live fetch fallback. Bump it there (one file) and
 * every USD figure in the system moves together.
 */
import { DEFAULT_FX_RATES } from '@sierra-estates/agents-core/src/fx-gold-engine';

/** EGP per 1 USD — single source of truth (agents-core fx-gold-engine). */
export const USD_EGP_RATE: number = DEFAULT_FX_RATES.USD;

/** Convert an EGP amount to USD (rounded to whole dollars). */
export function egpToUsd(egp: number): number {
  if (!Number.isFinite(egp) || egp <= 0) return 0;
  return Math.round(egp / USD_EGP_RATE);
}

/** Convert a USD amount to EGP (rounded to whole pounds). */
export function usdToEgp(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return Math.round(usd * USD_EGP_RATE);
}
