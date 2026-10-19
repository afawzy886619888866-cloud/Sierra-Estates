import { NextRequest, NextResponse } from 'next/server';
import {
  runClosingSimulation,
  type PropertyLegalContext,
  type StakeholderProfile,
} from '@sierra-estates/agents';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const unit: PropertyLegalContext = {
      id: body.id || 'unit-closing',
      title: body.title || 'Target Luxury Unit',
      price: Number(body.price || body.purchasePrice || 0),
      ownerType: body.ownerType || 'owner',
      ownerContact: body.ownerContact || '',
      finishingType: body.finishingType || 'fully-finished',
      annualServiceCharge: Number(body.annualServiceCharge || 0),
      hasTitleDeed: body.hasTitleDeed !== undefined ? Boolean(body.hasTitleDeed) : true,
      hasCadastralSurvey: Boolean(body.hasCadastralSurvey),
      hasReconciliationCertificate: body.hasReconciliationCertificate !== undefined ? Boolean(body.hasReconciliationCertificate) : true,
    };

    const stakeholder: StakeholderProfile = {
      id: body.stakeholderId || 'lead-buyer',
      name: body.stakeholderName || 'Prospective Investor',
      capitalBudget: Number(body.capitalBudget || unit.price * 1.05),
      negotiationLeverage: Number(body.negotiationLeverage || 0.95), // standard 5% discount leverage
      paymentMethod: body.paymentMethod || 'cash',
    };

    const simulation = runClosingSimulation(stakeholder, unit);

    return NextResponse.json({
      success: true,
      simulation,
      timeline: simulation.timeline,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 400 }
    );
  }
}
