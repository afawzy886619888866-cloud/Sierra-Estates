import { NextResponse } from 'next/server';
import { TearSheetGenerator, TearSheetListingInput } from '@sierra-estates/agents-core/src/memo-generator';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const input: TearSheetListingInput = {
      referenceId: body.referenceId || 'REF-HYDE-001',
      title: body.title || 'Luxury Standalone Villa',
      compoundName: body.compoundName || 'Hyde Park',
      unitType: body.unitType || 'Standalone Villa',
      buaSqm: Number(body.buaSqm) || 380,
      landSqm: body.landSqm ? Number(body.landSqm) : 450,
      bedrooms: Number(body.bedrooms) || 5,
      bathrooms: Number(body.bathrooms) || 5,
      finishing: body.finishing || 'ultra_lux',
      askingPriceEGP: Number(body.askingPriceEGP) || 35000000,
      downPaymentPercent: Number(body.downPaymentPercent) || 10,
      installmentTenureYears: Number(body.installmentTenureYears) || 7,
      deliveryYear: Number(body.deliveryYear) || 2026,
      brokerName: body.brokerName || 'Sierra Elite Desk',
      brokerPhone: body.brokerPhone || '+201032206443',
    };

    const tearSheet = TearSheetGenerator.generateTearSheet(input);

    return NextResponse.json({
      success: true,
      tearSheet,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate luxury property tear-sheet' },
      { status: 500 }
    );
  }
}
