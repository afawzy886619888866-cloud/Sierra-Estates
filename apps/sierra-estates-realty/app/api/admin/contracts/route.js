import { NextResponse } from 'next/server';
import {
 
  generateContractNumber, 
  generateSignatureHash 
} from '@/lib/services/digital-contracts';
import { adminDb } from '@/lib/server/firebase-admin';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';

// In-memory store fallback for development and test environments
const inMemoryContracts = new Map();

// Sample seed contract
const sampleContract = {
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
    nationalIdOrPassport: 'SAMPLE-NATIONAL-ID-1',
    phone: '+20-000-000-0001',
    email: 'karim.m@example.com',
  },
  sellerOrOwner: {
    name: 'Mohamed El-Sayed',
    nationalIdOrPassport: 'SAMPLE-NATIONAL-ID-2',
    phone: '+20-000-000-0002',
  },
  signatureHash: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
};

inMemoryContracts.set(sampleContract.id, sampleContract);

export async function GET(req) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const contracts = [];

    // Attempt to query Firestore
    try {
      const snap = await adminDb.collection('contracts').orderBy('createdAt', 'desc').limit(100).get();
      if (snap && !snap.empty) {
        snap.forEach((doc) => {
          contracts.push({ id: doc.id, ...doc.data() });
        });
      }
    } catch (e) {
      // Fallback silently to in-memory store
    }

    if (contracts.length === 0) {
      const fallbackList = Array.from(inMemoryContracts.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      contracts.push(...fallbackList);
    }

    return NextResponse.json({
      success: true,
      total: contracts.length,
      contracts,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const body = await req.json();
    const contractType = body.contractType || 'unit_reservation';
    const contractNumber = generateContractNumber(contractType);
    const contractId = `con-${Date.now()}`;

    const newContract = {
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

    // Attempt Firestore persistence
    try {
      await adminDb.collection('contracts').doc(newContract.id).set(newContract);
    } catch (e2) {
      // Graceful fallback
    }

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
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
