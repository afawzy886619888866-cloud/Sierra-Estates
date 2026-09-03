 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { TearSheetGenerator, } from '@sierra-estates/agents-core/src/memo-generator';

export async function POST(request) {
  try {
    const body = await request.json();

    const input = {
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
  } catch (error) {
    return NextResponse.json(
      { error: _optionalChain([error, 'optionalAccess', _ => _.message]) || 'Failed to generate luxury property tear-sheet' },
      { status: 500 }
    );
  }
}
