import { NextRequest, NextResponse } from 'next/server';
import {
  assessLegalRisk,
  generateLegalSummary,
  type PropertyLegalContext,
} from '@sierra-estates/agents';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const unitContext: PropertyLegalContext = {
      id: body.id || 'unit-direct',
      title: body.title || 'Property Proposal',
      price: Number(body.price || body.purchasePrice || 0),
      ownerType: body.ownerType || 'owner',
      ownerContact: body.ownerContact || '',
      finishingType: body.finishingType || body.finishing || 'fully-finished',
      annualServiceCharge: Number(body.annualServiceCharge || 0),
      hasTitleDeed: body.hasTitleDeed !== undefined ? Boolean(body.hasTitleDeed) : true,
      hasCadastralSurvey: Boolean(body.hasCadastralSurvey),
      hasReconciliationCertificate: body.hasReconciliationCertificate !== undefined ? Boolean(body.hasReconciliationCertificate) : true,
    };

    const riskResult = assessLegalRisk(unitContext);
    const summaryAr = generateLegalSummary(riskResult, 'ar');
    const summaryEn = generateLegalSummary(riskResult, 'en');

    return NextResponse.json({
      success: true,
      data: {
        ...riskResult,
        summaries: {
          ar: summaryAr,
          en: summaryEn,
        },
      },
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
