import { NextRequest, NextResponse } from 'next/server';
import { 
  DigitalContractData, 
  generateContractNumber, 
  generateSignatureHash, 
  renderBilingualContractHtml 
} from '@/lib/services/digital-contracts';

// In-memory store fallback for development and test environments
const inMemoryContracts: Map<string, DigitalContractData> = new Map();

// Sample seed contract
const sampleContract: DigitalContractData = {
  id: 'con-sample-001',
  contractNumber: 'SBR-RES-2026-A8F2',
  contractType: 'unit_reservation',
  status: 'pending_signatures',
  createdAt: new Date().toISOString(),
  unit: {
    unitCode: 'MT-B14-3U',
    compoundName: 'Madinaty B14',
    propertyType: 'Apartment',
    areaSqm: 140,
    bedrooms: 3,
    bathrooms: 2,
    finishing: 'Ultra Super Lux',
    dealType: 'rent',
    agreedPrice: 35000,
    reservationDeposit: 35000,
    paymentPlanDescription: '1 Month Deposit + 1 Month Advance',
  },
  buyer: {
    name: 'Karim Mansour',
    nationalIdOrPassport: '29201010102938',
    phone: '+201001234567',
    email: 'karim.m@example.com',
  },
  sellerOrOwner: {
    name: 'Mohamed El-Sayed',
    nationalIdOrPassport: '28509090104829',
    phone: '+201022844661',
  },
  signatureHash: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
};

inMemoryContracts.set(sampleContract.id, sampleContract);

export async function GET(req: NextRequest) {
  try {
    const contracts = Array.from(inMemoryContracts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      total: contracts.length,
      contracts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const contractType = body.contractType || 'unit_reservation';
    const contractNumber = generateContractNumber(contractType);
    const contractId = `con-${Date.now()}`;

    const newContract: DigitalContractData = {
      id: contractId,
      contractNumber,
      contractType,
      status: 'pending_signatures',
      createdAt: new Date().toISOString(),
      unit: {
        unitCode: body.unitCode || 'SE-UNIT-NEW',
        compoundName: body.compoundName || 'New Cairo',
        propertyType: body.propertyType || 'Apartment',
        areaSqm: Number(body.areaSqm) || 150,
        bedrooms: Number(body.bedrooms) || 3,
        bathrooms: Number(body.bathrooms) || 2,
        finishing: body.finishing || 'Super Lux',
        dealType: body.dealType || 'rent',
        agreedPrice: Number(body.agreedPrice) || 0,
        reservationDeposit: Number(body.reservationDeposit) || (Number(body.agreedPrice) * 0.1),
        paymentPlanDescription: body.paymentPlanDescription || '',
      },
      buyer: {
        name: body.buyerName || 'Buyer',
        nationalIdOrPassport: body.buyerNationalId || 'N/A',
        phone: body.buyerPhone || '',
        email: body.buyerEmail || '',
      },
      sellerOrOwner: {
        name: body.sellerName || 'Owner',
        nationalIdOrPassport: body.sellerNationalId || 'N/A',
        phone: body.sellerPhone || '',
      },
      commission: body.commissionPercentage ? {
        totalCommissionAmount: (Number(body.agreedPrice) || 0) * (Number(body.commissionPercentage) / 100),
        commissionPercentage: Number(body.commissionPercentage) || 2.5,
        sierraSharePercentage: Number(body.sierraSharePercentage) || 50,
        brokerSharePercentage: Number(body.brokerSharePercentage) || 50,
        externalBrokerName: body.externalBrokerName || '',
        externalBrokerPhone: body.externalBrokerPhone || '',
        vatIncluded: true,
      } : undefined,
      notesAr: body.notesAr || '',
      notesEn: body.notesEn || '',
    };

    newContract.signatureHash = generateSignatureHash(newContract);
    inMemoryContracts.set(newContract.id, newContract);

    const host = req.headers.get('host') || 'sierra-estates.net';
    const proto = host.includes('localhost') ? 'http' : 'https';
    const previewUrl = `${proto}://${host}/contracts/preview/${newContract.id}`;
    const signUrl = `${proto}://${host}/contracts/sign/${newContract.id}`;

    const whatsappBuyerMessage = encodeURIComponent(
      `مرحباً أ/ ${newContract.buyer.name}،\nتم تجهيز مسوّدة عقد حجز الوحدة (${newContract.unit.compoundName} - كود ${newContract.unit.unitCode}) من شركة Sierra Estates.\nيرجى مراجعة العقد والتوقيع الإلكتروني عبر الرابط الآمن:\n${signUrl}`
    );

    const whatsappLink = newContract.buyer.phone 
      ? `https://wa.me/${newContract.buyer.phone.replace(/[^0-9]/g, '')}?text=${whatsappBuyerMessage}`
      : null;

    return NextResponse.json({
      success: true,
      contract: newContract,
      previewUrl,
      signUrl,
      whatsappLink,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
