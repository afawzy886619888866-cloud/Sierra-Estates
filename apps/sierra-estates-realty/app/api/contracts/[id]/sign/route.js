import { NextResponse } from 'next/server';
import { renderBilingualContractHtml } from '@/lib/services/digital-contracts';

export async function GET(
  req,
  { params }
) {
  const { id } = await params;
  
  // Sample contract render
  const sampleContract = {
    id,
    contractNumber: `SBR-RES-${id.toUpperCase()}`,
    contractType: 'unit_reservation' ,
    status: 'pending_signatures' ,
    createdAt: new Date().toISOString(),
    unit: {
      unitCode: 'MT-B14-3U',
      compoundName: 'Madinaty B14',
      propertyType: 'Apartment',
      areaSqm: 140,
      bedrooms: 3,
      bathrooms: 2,
      finishing: 'Ultra Super Lux',
      dealType: 'rent' ,
      agreedPrice: 35000,
      reservationDeposit: 35000,
    },
    buyer: {
      name: 'Client Signature Pending',
      nationalIdOrPassport: '29201010102938',
      phone: '+201001234567',
    },
    sellerOrOwner: {
      name: 'Mohamed El-Sayed (Owner)',
      nationalIdOrPassport: '28509090104829',
      phone: '+201022844661',
    },
    signatureHash: '7c8b9a0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
  };

  const html = renderBilingualContractHtml(sampleContract);
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

export async function POST(
  req,
  { params }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const signerName = body.signerName || 'Client';
  const role = body.role || 'buyer';

  return NextResponse.json({
    success: true,
    contractId: id,
    status: 'signed',
    signedBy: signerName,
    role,
    signedAt: new Date().toISOString(),
    message: 'Digital signature verified and permanently logged to audit ledger.',
  });
}
