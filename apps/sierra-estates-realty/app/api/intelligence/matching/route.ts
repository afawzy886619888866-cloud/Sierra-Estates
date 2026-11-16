import { NextRequest, NextResponse } from 'next/server';
import {
  rankPropertiesForStakeholder,
  type CandidateProperty,
  type StakeholderIntelligence,
} from '@sierra-estates/agents';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const profile: StakeholderIntelligence = {
      id: body.profile?.id || 'investor-1',
      name: body.profile?.name || 'Private Client',
      capitalBudget: Number(body.profile?.capitalBudget || body.profile?.budgetMax || 25_000_000),
      preferredLocations: Array.isArray(body.profile?.preferredLocations || body.profile?.preferredCompounds) ? (body.profile.preferredLocations || body.profile.preferredCompounds) : [],
      preferredPropertyTypes: Array.isArray(body.profile?.preferredPropertyTypes || body.profile?.preferredUnitTypes) ? (body.profile.preferredPropertyTypes || body.profile.preferredUnitTypes) : [],
      negativeSignals: Array.isArray(body.profile?.negativeSignals) ? body.profile.negativeSignals : [],
      investmentObjective: body.profile?.investmentObjective || 'capital_gain',
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
