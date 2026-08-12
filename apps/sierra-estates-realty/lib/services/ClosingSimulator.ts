import { db } from '../firebase';
import { doc, getDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { assessLegalRisk } from './legal-brain';
import { Unit } from '../models/schema';

/**
 * SIERRA ESTATES — STAGE 10: CLOSING SIMULATOR
 * "Predicting the finish line with deterministic precision."
 * This service runs financial and legal simulations to project the outcome of a real estate transaction.
 * Mandate: Provide investment stakeholders with a transparent view of the 'Final Settlement' before signature.
 */
export class ClosingSimulator {
  /**
   * Runs a 'What-If' closing scenario for a specific Lead and Unit.
   * Integrates Legal Intelligence and Financial Projections.
   */
  static async runClosingSimulation(leadId: string, unitId: string) {
    console.log(`--- 🎰 Running Strategic Closing Simulation: ${leadId} -> ${unitId} ---`);
    
    try {
      // 1. Fetch Stakeholder & Asset Data in Parallel
      const [leadSnap, unitSnap] = await Promise.all([
        getDoc(doc(db, 'leads', leadId)),
        getDoc(doc(db, 'listings', unitId))
      ]);

      if (!leadSnap.exists() || !unitSnap.exists()) {
        throw new Error("Critical synchronization error: Stakeholder or Asset missing in Pipeline.");
      }

      const lead = leadSnap.data();
      const unit = unitSnap.data() as Unit;

      // 2. Intelligence: Legal Risk Calculation via LegalBrain
      const legalAudit = assessLegalRisk(unit);

      // 3. Financial: Forecasted Settlement & Payouts
      // Pricing logic accounts for hypothetical negotiation margins
      const basePrice = unit.price || 0;
      const settlementPrice = basePrice * (lead.negotiationLeverage || 0.98); 
      
      const financialSimulation = {
        settlementPrice,
        registrationFees: settlementPrice * 0.04, // 4% DLD / Local Registry standard
        trusteeFees: 5250, 
        legalConveyancing: 7500,
        totalCapitalOutlay: settlementPrice + (settlementPrice * 0.04) + 12750 + (settlementPrice * 0.02), // Price + Fees + 2% Comms
        commissionProjected: settlementPrice * 0.02,
      };

      // 4. Timeline Projection (Stages 1-4)
      const executionTimeline = [
        { stage: 'MOU (Form F) Ratification', expectedDay: 2, priority: 'critical' },
        { stage: 'Developer NOC Issuance', expectedDay: 12, priority: 'high' },
        { stage: 'Financial Clearance / Valuation', expectedDay: 28, priority: 'medium' },
        { stage: 'Final Deed Transfer at Trustee', expectedDay: 38, priority: 'critical' }
      ];

      // 5. Store Simulation Result for Audit Trail
      const simRef = await addDoc(collection(db, 'closing_simulations'), {
        leadId,
        unitId,
        advisorId: lead.assignedAdvisor || 'system_gen',
        legalAudit,
        financialSimulation,
        executionTimeline,
        status: 'simulated',
        isActionable: legalAudit.isApprovedForProposal,
        createdAt: serverTimestamp(),
        strategicRecommendation: legalAudit.isApprovedForProposal 
          ? "Asset is legally sound. Recommended action: Proceed to MOU with negotiated settlement price."
          : `CAUTION: High-risk flags [${legalAudit.flags.join(', ')}] detected. Manual legal vetting required.`
      });

      return {
        simulationId: simRef.id,
        isApproved: legalAudit.isApprovedForProposal,
        finalProjections: financialSimulation,
        timeline: executionTimeline,
        recommendation: legalAudit.isApprovedForProposal ? '🟢 PROCEED' : '🔴 HALT & REVIEW'
      };

    } catch (error: any) {
      console.error("❌ Strategic Simulation Framework Failure:", error);
      throw error;
    }
  }
}
