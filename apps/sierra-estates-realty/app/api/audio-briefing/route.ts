import { NextRequest, NextResponse } from 'next/server';
import { VoiceBriefingEngine, VoiceBriefingRequest } from '@sierra-estates/agents-core';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * §21 no-fabrication contract: a briefing is generated ONLY from property
 * data the caller actually supplies (or that exists in Supabase). The old
 * hardcoded defaults ('Mivida' / 12.5M EGP / 185 sqm / 'SE-MIV-01') invented
 * a complete property out of nothing — missing inputs now fail loudly with
 * a 400 that lists exactly what is missing.
 */
function missingBriefingFields(input: {
  compound?: string | null;
  unitType?: string | null;
  priceEGP?: number | null;
  areaSqm?: number | null;
}): string[] {
  const missing: string[] = [];
  if (!input.compound) missing.push('compound');
  if (!input.unitType) missing.push('unitType');
  if (!(Number(input.priceEGP) > 0)) missing.push('price');
  if (!(Number(input.areaSqm) > 0)) missing.push('area');
  return missing;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') || searchParams.get('propertyId') || 'UNSPECIFIED';
  const compound = searchParams.get('compound');
  const unitType = searchParams.get('unitType');
  const price = Number(searchParams.get('price'));
  const area = Number(searchParams.get('area'));
  const lang = (searchParams.get('lang') === 'en' || searchParams.get('lang') === 'en-US') ? 'en-US' : 'ar-EG';
  const investor = searchParams.get('investor') || undefined;

  const missing = missingBriefingFields({ compound, unitType, priceEGP: price, areaSqm: area });
  if (missing.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Briefing requires real property data — refusing to generate from defaults',
        missing,
      },
      { status: 400 }
    );
  }

  try {
    const payload: VoiceBriefingRequest = {
      sierraCode: code,
      compound: compound as string,
      unitType: unitType as string,
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
    // Nullable until proven present — the gate below rejects anything missing.
    const resolved: {
      sierraCode: string;
      compound: string | null;
      unitType: string | null;
      priceEGP: number | null;
      areaSqm: number | null;
      language: 'ar-EG' | 'en-US';
      investorName?: string;
    } = {
      sierraCode: body.sierraCode || body.propertyId || 'UNSPECIFIED',
      compound: body.compound || null,
      unitType: body.unitType || null,
      priceEGP: Number(body.priceEGP || body.price) || null,
      areaSqm: Number(body.areaSqm || body.area) || null,
      language: (body.language === 'en' || body.language === 'en-US') ? 'en-US' : 'ar-EG',
      investorName: body.investorName || body.name || undefined,
    };

    // If only propertyId is provided, try looking up from Supabase — the
    // record's real values fill the gaps; no value is ever invented.
    if (body.propertyId && (!body.compound || !body.price)) {
      try {
        const supabase = getSupabaseAdmin();
        const { data } = await supabase
          .from('properties')
          .select('id, title, compound, unit_type, price, area')
          .eq('id', body.propertyId)
          .maybeSingle();

        if (data) {
          resolved.sierraCode = data.id;
          resolved.compound = resolved.compound || data.compound || null;
          resolved.unitType = resolved.unitType || data.unit_type || null;
          resolved.priceEGP = resolved.priceEGP || (Number(data.price) || null);
          resolved.areaSqm = resolved.areaSqm || (Number(data.area) || null);
        }
      } catch {
        // Lookup failure surfaces through the missing-fields gate below.
      }
    }

    const missing = missingBriefingFields(resolved);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Briefing requires real property data — refusing to generate from defaults',
          missing,
        },
        { status: 400 }
      );
    }

    // The gate guarantees these are present and positive.
    const briefing = await VoiceBriefingEngine.generateBriefing({
      sierraCode: resolved.sierraCode,
      compound: resolved.compound as string,
      unitType: resolved.unitType as string,
      priceEGP: resolved.priceEGP as number,
      areaSqm: resolved.areaSqm as number,
      language: resolved.language,
      investorName: resolved.investorName,
    });
    return NextResponse.json({ success: true, briefing }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Invalid briefing request' },
      { status: 400 }
    );
  }
}
