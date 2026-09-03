import { NextResponse } from 'next/server';
import { TearSheetGenerator, } from '@sierra-estates/agents-core';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = {
      referenceId: body.referenceId || 'REF-MIV-104',
      title: body.title || 'Luxury Standalone Villa in Mivida',
      compoundName: body.compoundName || 'Mivida',
      unitType: body.unitType || 'Standalone Villa',
      buaSqm: Number(body.buaSqm) || 390,
      landSqm: Number(body.landSqm) || 450,
      bedrooms: Number(body.bedrooms) || 4,
      bathrooms: Number(body.bathrooms) || 5,
      finishing: body.finishing || 'ultra_lux',
      askingPriceEGP: Number(body.askingPriceEGP) || 38000000,
      downPaymentPercent: Number(body.downPaymentPercent) || 10,
      installmentTenureYears: Number(body.installmentTenureYears) || 8,
      deliveryYear: Number(body.deliveryYear) || 2026,
      brokerName: body.brokerName || 'Karim El-Shazly',
      brokerPhone: body.brokerPhone || '+201000000000',
    };

    const sheet = TearSheetGenerator.generateTearSheet(input);

    return NextResponse.json({
      success: true,
      tearSheet: sheet,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error ).message },
      { status: 500 }
    );
  }
}
