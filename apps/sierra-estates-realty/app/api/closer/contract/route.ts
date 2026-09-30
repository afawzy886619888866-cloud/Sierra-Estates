import { NextRequest, NextResponse } from 'next/server';
import {
  ContractGeneratorEngine,
  ContractParty,
  ContractPropertySpecs,
} from '@sierra-estates/agents-core';

// §21 no-fabrication: a Sales & Purchase Agreement is a binding legal
// record. The old route silently substituted a complete invented deal —
// seller "Emaar Misr Developments" (fake national ID, fake phone), buyer
// "Dr. Karim Mansour", Mivida "Villa 142-B", 390 sqm BUA, 38M EGP total,
// 3.8M down payment, 1,068,750 quarterly, 8-year tenure, December 2026
// delivery — whenever the request body was missing or partial. Missing
// terms now fail loudly with a 400 listing every missing field; parties,
// unit identity and financial terms must all arrive explicitly.

const REQUIRED_PARTY_FIELDS = ['name', 'nationalIdOrPassport', 'phone'] as const;

function partyMissingFields(party: unknown, prefix: string): string[] {
  if (!party || typeof party !== 'object') {
    return REQUIRED_PARTY_FIELDS.map((f) => `${prefix}.${f}`);
  }
  const record = party as Record<string, unknown>;
  return REQUIRED_PARTY_FIELDS.filter(
    (f) => typeof record[f] !== 'string' || (record[f] as string).trim() === ''
  ).map((f) => `${prefix}.${f}`);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const positiveNum = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    const missing: string[] = [
      ...partyMissingFields(body.seller, 'seller'),
      ...partyMissingFields(body.buyer, 'buyer'),
    ];
    if (!body.compoundName || String(body.compoundName).trim() === '') missing.push('compoundName');
    if (!body.unitNumber || String(body.unitNumber).trim() === '') missing.push('unitNumber');
    if (!body.unitType || String(body.unitType).trim() === '') missing.push('unitType');
    if (positiveNum(body.buaSqm) === null) missing.push('buaSqm');
    if (positiveNum(body.totalPriceEGP) === null) missing.push('totalPriceEGP');
    if (positiveNum(body.downPaymentEGP) === null) missing.push('downPaymentEGP');
    if (positiveNum(body.quarterlyInstallmentEGP) === null) missing.push('quarterlyInstallmentEGP');
    if (positiveNum(body.installmentTenureYears) === null) missing.push('installmentTenureYears');
    if (!body.deliveryDateStr || String(body.deliveryDateStr).trim() === '') missing.push('deliveryDateStr');

    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Contract terms must be provided explicitly — refusing to fabricate parties, unit or pricing defaults',
          missing,
        },
        { status: 400 }
      );
    }

    const seller: ContractParty = {
      name: body.seller.name,
      nationalIdOrPassport: body.seller.nationalIdOrPassport,
      nationality: body.seller.nationality || '',
      address: body.seller.address || '',
      phone: body.seller.phone,
    };

    const buyer: ContractParty = {
      name: body.buyer.name,
      nationalIdOrPassport: body.buyer.nationalIdOrPassport,
      nationality: body.buyer.nationality || '',
      address: body.buyer.address || '',
      phone: body.buyer.phone,
    };

    const property: ContractPropertySpecs = {
      compoundName: body.compoundName,
      unitNumber: body.unitNumber,
      unitType: body.unitType,
      buaSqm: positiveNum(body.buaSqm) as number,
      totalPriceEGP: positiveNum(body.totalPriceEGP) as number,
      downPaymentEGP: positiveNum(body.downPaymentEGP) as number,
      quarterlyInstallmentEGP: positiveNum(body.quarterlyInstallmentEGP) as number,
      installmentTenureYears: positiveNum(body.installmentTenureYears) as number,
      deliveryDateStr: body.deliveryDateStr,
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
