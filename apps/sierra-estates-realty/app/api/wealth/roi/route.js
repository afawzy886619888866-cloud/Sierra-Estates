/**
 * sierra estates — WEALTH INTELLIGENCE ENDPOINT
 * Triggers re-analysis of financial metrics for a specific proposal.
 */

import { NextResponse } from 'next/server';
import { getRecord, updateRecord } from '@sierra-estates/db';

import { analyzeAssetFinancials } from '@/lib/services/roi-service';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

export async function POST(req) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const { proposalId } = await req.json();

    if (!proposalId) {
      return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
    }

    const proposal = await getRecord('proposals', proposalId);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const updatedUnits = [];
    let totalROI = 0;
    let totalYield = 0;

    // Re-analyze each unit
    for (const unitItem of proposal.units) {
      const unitRecord = await getRecord('listings', unitItem.id);
      if (unitRecord) {
        const unit = { ...unitRecord, id: unitItem.id } ;
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

    // Persist the re-analysis back onto the proposal
    await updateRecord('proposals', proposalId, {
      units: updatedUnits,
      financialAnalysis,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      financialAnalysis
    });

  } catch (error) {
    logger.error('[Wealth Intelligence] Re-analysis failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
