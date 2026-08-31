import { NextRequest, NextResponse } from 'next/server';
import {
  ContractGeneratorEngine,
  ContractParty,
  ContractPropertySpecs,
} from '@sierra-estates/agents-core';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const seller: ContractParty = body.seller || {
      name: 'Emaar Misr Developments',
      nationalIdOrPassport: 'EG-COM-88910',
      nationality: 'Egyptian',
      address: 'Uptown Cairo, Mokattam, Cairo',
      phone: '+20224148000',
    };

    const buyer: ContractParty = body.buyer || {
      name: 'Dr. Karim Mansour',
      nationalIdOrPassport: '28911010102938',
      nationality: 'Egyptian',
      address: 'Fifth Settlement, New Cairo',
      phone: '+201099887766',
    };

    const property: ContractPropertySpecs = {
      compoundName: body.compoundName || 'Mivida',
      unitNumber: body.unitNumber || 'Villa 142-B',
      unitType: body.unitType || 'Standalone Villa',
      buaSqm: Number(body.buaSqm) || 390,
      totalPriceEGP: Number(body.totalPriceEGP) || 38000000,
      downPaymentEGP: Number(body.downPaymentEGP) || 3800000,
      quarterlyInstallmentEGP: Number(body.quarterlyInstallmentEGP) || 1068750,
      installmentTenureYears: Number(body.installmentTenureYears) || 8,
      deliveryDateStr: body.deliveryDateStr || 'December 2026',
    };

    const spa = ContractGeneratorEngine.generateSPA(seller, buyer, property);

    return NextResponse.json({
      success: true,
      spa,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
