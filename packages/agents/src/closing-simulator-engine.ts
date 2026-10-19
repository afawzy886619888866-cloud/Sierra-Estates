/**
 * SIERRA ESTATES — STAGE 9 & 10: STRATEGIC CLOSING SIMULATOR ENGINE
 * 
 * "Predicting the finish line with deterministic precision."
 * Runs financial and legal scenario simulations to project real estate acquisitions.
 * Handles:
 * - Local registration fees (DLD / Real Estate Publicity & Notarization - الشهر العقاري)
 * - Legal conveyancing, syndicate fees, and trustee disbursements
 * - Commission calculations
 * - Deal timeline milestones (MOU -> Developer NOC -> Trustee Transfer)
 */

import { assessLegalRisk, type LegalRiskResult, type PropertyLegalContext } from './legal-risk-engine';

export interface StakeholderProfile {
  id: string;
  name: string;
  capitalBudget: number;
  negotiationLeverage?: number; // e.g. 0.95 means expect 5% discount
  paymentMethod?: 'cash' | 'installments' | 'mortgage';
}

export interface SettlementProjections {
  basePrice: number;
  negotiatedPrice: number;
  discountAmount: number;
  registrationFees: number;        // ~2.5% real estate disposal tax (ضريبة التصرفات العقارية) or notary fees
  developerTransferFee: number;    // Developer NOC fee (مصاريف تنازل المطور - typically 1-2.5%)
  legalConveyancingFees: number;   // Legal audit & contract fees
  brokerCommissionPercent: number; // typically 2.5%
  brokerCommissionAmount: number;
  totalCapitalRequired: number;
}

export interface AcquisitionTimelineMilestone {
  stage: string;
  expectedDay: number;
  priority: 'critical' | 'high' | 'medium';
  description: string;
}

export interface ClosingSimulationResult {
  simulationId: string;
  stakeholderId: string;
  unitId: string | number;
  isActionable: boolean;
  legalAudit: LegalRiskResult;
  settlement: SettlementProjections;
  timeline: AcquisitionTimelineMilestone[];
  verdict: 'PROCEED' | 'NEGOTIATE_TERMS' | 'HALT_DUE_DILIGENCE';
  strategicRecommendation: string;
}

/**
 * Runs a deterministic closing simulation for an acquisition scenario.
 */
export function runClosingSimulation(
  stakeholder: StakeholderProfile,
  property: PropertyLegalContext
): ClosingSimulationResult {
  const legalAudit = assessLegalRisk(property);

  const basePrice = Math.max(0, property.price || 0);
  const leverage = stakeholder.negotiationLeverage ? Math.min(Math.max(stakeholder.negotiationLeverage, 0.85), 1.0) : 0.97;
  const negotiatedPrice = Math.round(basePrice * leverage);
  const discountAmount = basePrice - negotiatedPrice;

  // Standard Egyptian luxury real estate transaction outlays
  const registrationFees = Math.round(negotiatedPrice * 0.025); // 2.5% real estate transfer fee
  const developerTransferFee = Math.round(negotiatedPrice * 0.015); // 1.5% developer NOC
  const legalConveyancingFees = 15_000; // EGP flat legal conveyancing & POA verification
  const commissionPercent = 2.5;
  const commissionAmount = Math.round(negotiatedPrice * (commissionPercent / 100));

  const totalCapitalRequired =
    negotiatedPrice + registrationFees + developerTransferFee + legalConveyancingFees + commissionAmount;

  const timeline: AcquisitionTimelineMilestone[] = [
    {
      stage: 'Reservation Agreement & Token Deposit',
      expectedDay: 2,
      priority: 'critical',
      description: 'Sign formal reservation contract with 5-10% earnest money deposit',
    },
    {
      stage: 'Legal Audit & Chain of Title Verification',
      expectedDay: 7,
      priority: 'critical',
      description: 'Audit primary purchase contracts, building permits, and developer statements',
    },
    {
      stage: 'Developer NOC (No Objection Certificate)',
      expectedDay: 15,
      priority: 'high',
      description: 'Request formal waiver and release letter from compound developer',
    },
    {
      stage: 'Final Sales Contract & Notarization',
      expectedDay: 25,
      priority: 'critical',
      description: 'Execute tripartite sale deed, handover keys, and verify certified banker checks',
    },
  ];

  let verdict: 'PROCEED' | 'NEGOTIATE_TERMS' | 'HALT_DUE_DILIGENCE' = 'PROCEED';
  let recommendation = `Asset is legally sound and aligns within budget. Target closing at ${negotiatedPrice.toLocaleString()} EGP.`;

  if (legalAudit.riskLevel === 'high') {
    verdict = 'HALT_DUE_DILIGENCE';
    recommendation = `CRITICAL CAUTION: High legal risks detected [${legalAudit.flags.join(', ')}]. Halt deposit until title deeds are verified.`;
  } else if (totalCapitalRequired > stakeholder.capitalBudget && stakeholder.capitalBudget > 0) {
    verdict = 'NEGOTIATE_TERMS';
    recommendation = `Total outlay (${totalCapitalRequired.toLocaleString()} EGP) exceeds allocated capital (${stakeholder.capitalBudget.toLocaleString()} EGP). Structure installment schedule.`;
  }

  const simulationId = `SIM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  return {
    simulationId,
    stakeholderId: stakeholder.id,
    unitId: property.id,
    isActionable: legalAudit.isApprovedForProposal && verdict !== 'HALT_DUE_DILIGENCE',
    legalAudit,
    settlement: {
      basePrice,
      negotiatedPrice,
      discountAmount,
      registrationFees,
      developerTransferFee,
      legalConveyancingFees,
      brokerCommissionPercent: commissionPercent,
      brokerCommissionAmount: commissionAmount,
      totalCapitalRequired,
    },
    timeline,
    verdict,
    strategicRecommendation: recommendation,
  };
}
