import { NextRequest, NextResponse } from 'next/server';
import { PropertyMatchmaker, type PropertyListing, type ClientProfile } from '@sierra-estates/agents-core';

const SAMPLE_LUXURY_INVENTORY: PropertyListing[] = [
  {
    id: 'prop-mivida-001',
    sierraCode: 'MI-S-4F-38M+G+P',
    title: 'Standalone Villa in Mivida New Cairo',
    compound: 'Mivida',
    type: 'Standalone Villa',
    price: 38000000,
    area_sqm: 450,
    bedrooms: 4,
    finishing: 'fully_finished',
    valuationScore: 90,
    urgencyScore: 95,
    features: ['Private Pool', 'Landscaped Garden', 'Smart Home'],
  },
  {
    id: 'prop-hydepark-002',
    sierraCode: 'HY-P-3S-16.5M+R+L',
    title: 'Luxury Lake View Penthouse in Hyde Park',
    compound: 'Hyde Park',
    type: 'Penthouse',
    price: 16500000,
    area_sqm: 280,
    bedrooms: 3,
    finishing: 'semi_finished',
    valuationScore: 75,
    urgencyScore: 60,
    features: ['Roof Terrace', 'Lake View', 'Clubhouse Access'],
  },
  {
    id: 'prop-palmhills-003',
    sierraCode: 'PA-A-3F-11.8M+C',
    title: 'Corner Apartment in Palm Hills New Cairo',
    compound: 'Palm Hills',
    type: 'Apartment',
    price: 11800000,
    area_sqm: 195,
    bedrooms: 3,
    finishing: 'fully_finished',
    valuationScore: 75,
    urgencyScore: 60,
    features: ['Corner Unit', 'North Facing', 'Immediate Delivery'],
  },
  {
    id: 'prop-uptown-004',
    sierraCode: 'UP-T-4F-24M+G',
    title: 'Modern Townhouse in Uptown Cairo',
    compound: 'Uptown Cairo',
    type: 'Townhouse',
    price: 24000000,
    area_sqm: 310,
    bedrooms: 4,
    finishing: 'fully_finished',
    valuationScore: 88,
    urgencyScore: 80,
    features: ['Golf Course View', 'Private Garage'],
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const compound = searchParams.get('compound') || undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const type = searchParams.get('type') || undefined;

  const clientProfile: ClientProfile = {
    targetCompound: compound,
    budgetMax: maxPrice,
    propertyType: type,
  };

  const matches = PropertyMatchmaker.rankProperties(SAMPLE_LUXURY_INVENTORY, clientProfile, 5);

  return NextResponse.json({
    success: true,
    total: matches.length,
    matches,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const clientProfile: ClientProfile = {
      targetCompound: body.targetCompound || body.compound,
      propertyType: body.propertyType || body.type,
      budgetMin: body.budgetMin,
      budgetMax: body.budgetMax || body.budget,
      minBedrooms: body.minBedrooms || body.bedrooms,
      finishing: body.finishing,
      urgency: body.urgency,
    };

    const matches = PropertyMatchmaker.rankProperties(SAMPLE_LUXURY_INVENTORY, clientProfile, body.limit || 5);

    const recommendation = {
      recommendationId: `rec-${Date.now()}`,
      clientId: body.clientId || 'broadcast',
      listingCodes: matches.map((m) => m.property.sierraCode || m.property.id),
      matchScore: matches.length > 0 ? matches[0].matchScore / 100 : 0.9,
      topMatches: matches,
      rationale: matches.length > 0 ? matches[0].reasons.join(' · ') : 'Verified high-yield inventory.',
      suggestedAction: body.suggestedAction || 'send_whatsapp',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, recommendation });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
