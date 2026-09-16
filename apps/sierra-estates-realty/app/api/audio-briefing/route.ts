import { NextRequest, NextResponse } from 'next/server';
import { VoiceBriefingEngine, VoiceBriefingRequest } from '@sierra-estates/agents-core';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') || searchParams.get('propertyId') || 'SE-MIV-01';
  const compound = searchParams.get('compound') || 'Mivida';
  const unitType = searchParams.get('unitType') || 'Apartment';
  const price = Number(searchParams.get('price')) || 12500000;
  const area = Number(searchParams.get('area')) || 185;
  const lang = (searchParams.get('lang') === 'en' || searchParams.get('lang') === 'en-US') ? 'en-US' : 'ar-EG';
  const investor = searchParams.get('investor') || undefined;

  try {
    const payload: VoiceBriefingRequest = {
      sierraCode: code,
      compound,
      unitType,
      priceEGP: price,
      areaSqm: area,
      language: lang,
      investorName: investor,
    };

    const briefing = await VoiceBriefingEngine.generateBriefing(payload);
    return NextResponse.json({ success: true, briefing }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to generate audio briefing' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let propertyData = {
      sierraCode: body.sierraCode || body.propertyId || 'SE-PROMO-01',
      compound: body.compound || 'Mountain View iCity',
      unitType: body.unitType || 'iVilla',
      priceEGP: Number(body.priceEGP || body.price) || 10500000,
      areaSqm: Number(body.areaSqm || body.area) || 210,
      language: (body.language === 'en' || body.language === 'en-US') ? 'en-US' : 'ar-EG',
      investorName: body.investorName || body.name || undefined,
    } as VoiceBriefingRequest;

    // If only propertyId is provided, try looking up from Supabase
    if (body.propertyId && (!body.compound || !body.price)) {
      try {
        const supabase = getSupabaseAdmin();
        const { data } = await supabase
          .from('properties')
          .select('id, title, compound, unit_type, price, area')
          .eq('id', body.propertyId)
          .maybeSingle();

        if (data) {
          propertyData.sierraCode = data.id;
          propertyData.compound = data.compound || propertyData.compound;
          propertyData.unitType = data.unit_type || propertyData.unitType;
          propertyData.priceEGP = Number(data.price) || propertyData.priceEGP;
          propertyData.areaSqm = Number(data.area) || propertyData.areaSqm;
        }
      } catch {
        // Fallback to existing body data
      }
    }

    const briefing = await VoiceBriefingEngine.generateBriefing(propertyData);
    return NextResponse.json({ success: true, briefing }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Invalid briefing request' },
      { status: 400 }
    );
  }
}
