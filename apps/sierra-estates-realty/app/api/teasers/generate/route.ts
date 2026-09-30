import { NextResponse } from 'next/server';
import { TearSheetGenerator, TearSheetListingInput } from '@sierra-estates/agents-core/src/memo-generator';

<<<<<<< HEAD
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
      brokerPhone: body.brokerPhone || '+201092048333',
=======
/**
 * §21 no-fabrication contract: a tear-sheet documents a REAL listing. Every
 * property fact and every deal term printed on the sheet must arrive
 * explicitly from the caller. The old defaults invented a complete Hyde Park
 * villa out of nothing ('REF-HYDE-001' / 380 sqm / 5 bed / 35M EGP /
 * 'Sierra Elite Desk') — missing inputs now fail loudly with a 400 that
 * lists exactly what is missing.
 */
function missingTearSheetFields(body: Record<string, unknown>): string[] {
  const required: Array<[string, 'text' | 'number']> = [
    ['referenceId', 'text'],
    ['title', 'text'],
    ['compoundName', 'text'],
    ['unitType', 'text'],
    ['buaSqm', 'number'],
    ['bedrooms', 'number'],
    ['bathrooms', 'number'],
    ['finishing', 'text'],
    ['askingPriceEGP', 'number'],
    ['downPaymentPercent', 'number'],
    ['installmentTenureYears', 'number'],
    ['deliveryYear', 'number'],
    ['brokerName', 'text'],
    ['brokerPhone', 'text'],
  ];
  const missing: string[] = [];
  for (const [field, kind] of required) {
    const v = body[field];
    if (v === undefined || v === null || v === '') {
      missing.push(field);
    } else if (kind === 'number' && !(Number(v) > 0)) {
      missing.push(field);
    }
  }
  return missing;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const missing = missingTearSheetFields(body);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tear-sheet requires real listing data — refusing to generate from defaults',
          missing,
        },
        { status: 400 }
      );
    }

    const input: TearSheetListingInput = {
      referenceId: String(body.referenceId),
      title: String(body.title),
      compoundName: String(body.compoundName),
      unitType: String(body.unitType),
      buaSqm: Number(body.buaSqm),
      // Optional on purpose: land is honestly omitted when the caller does
      // not state it (the generator drops the land line — never invents it).
      landSqm: body.landSqm ? Number(body.landSqm) : undefined,
      bedrooms: Number(body.bedrooms),
      bathrooms: Number(body.bathrooms),
      finishing: body.finishing as TearSheetListingInput['finishing'],
      askingPriceEGP: Number(body.askingPriceEGP),
      downPaymentPercent: Number(body.downPaymentPercent),
      installmentTenureYears: Number(body.installmentTenureYears),
      deliveryYear: Number(body.deliveryYear),
      brokerName: String(body.brokerName),
      brokerPhone: String(body.brokerPhone),
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
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
