/**
 * sierra estates — WEALTH INTELLIGENCE ENDPOINT
 * Triggers re-analysis of financial metrics for a specific proposal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS, Proposal, Unit } from '@/lib/models/schema';
import { analyzeAssetFinancials } from '@/lib/services/roi-service';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const { proposalId } = await req.json();

    if (!proposalId) {
      return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
    }

    const proposalSnap = await adminDb.collection(COLLECTIONS.proposals).doc(proposalId).get();
    if (!proposalSnap.exists) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const proposal = proposalSnap.data() as Proposal;
    const updatedUnits: Proposal['units'] = [];
    let totalROI = 0;
    let totalYield = 0;

    // Re-analyze each unit
    for (const unitItem of proposal.units) {
      const unitSnap = await adminDb.collection(COLLECTIONS.units).doc(unitItem.id).get();
      if (unitSnap.exists) {
        const unit = { id: unitSnap.id, ...unitSnap.data() } as Unit;
        const financials = await analyzeAssetFinancials(unit);

        updatedUnits.push({
          ...unitItem,
          financialAnalysis: {
            projectedROI: financials.projectedROI,
            annualYield: financials.annualYield
          }
        });

        totalROI += financials.projectedROI;
        totalYield += financials.annualYield;
      }
    }

    const avgROI = updatedUnits.length > 0 ? Math.round(totalROI / updatedUnits.length) : 0;
    const avgYield = updatedUnits.length > 0 ? (totalYield / updatedUnits.length).toFixed(1) : "0";

    const financialAnalysis = {
      projectedROI: avgROI,
      annualYield: parseFloat(avgYield),
      valuationAnalysis: `Real-time wealth re-analysis confirmed an average projected ROI of ${avgROI}% with a resilient ${avgYield}% net yield profile. Market liquidity benchmarks remain stable.`
    };

    // Update Proposal in Firestore
    await adminDb.collection(COLLECTIONS.proposals).doc(proposalId).update({
      units: updatedUnits,
      financialAnalysis,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      financialAnalysis
    });

  } catch (error: any) {
    logger.error('[Wealth Intelligence] Re-analysis failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
