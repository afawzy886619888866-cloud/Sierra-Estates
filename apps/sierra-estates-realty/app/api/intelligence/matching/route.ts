import { NextRequest, NextResponse } from 'next/server';
import {
  rankPropertiesForStakeholder,
  type CandidateProperty,
  type StakeholderWealthProfile,
} from '@sierra-estates/agents';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const profile: StakeholderWealthProfile = {
      id: body.profile?.id || 'investor-1',
      name: body.profile?.name || 'Private Client',
      budgetMax: Number(body.profile?.budgetMax || 25_000_000),
      budgetMin: Number(body.profile?.budgetMin || 0),
      preferredCompounds: Array.isArray(body.profile?.preferredCompounds) ? body.profile.preferredCompounds : [],
      preferredUnitTypes: Array.isArray(body.profile?.preferredUnitTypes) ? body.profile.preferredUnitTypes : [],
      investmentStrategy: body.profile?.investmentStrategy || 'balanced',
      negativeSignals: Array.isArray(body.profile?.negativeSignals) ? body.profile.negativeSignals : [],
    };

    const properties: CandidateProperty[] = Array.isArray(body.properties) ? body.properties : [];

    const matches = rankPropertiesForStakeholder(profile, properties);

    return NextResponse.json({
      success: true,
      matches,
      totalEvaluated: properties.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 400 }
    );
  }
}
