import { NextResponse } from 'next/server';
import {
  VipConciergeEngine,


} from '@sierra-estates/agents-core';

export async function GET(_req) {
  try {
    const profile = {
      investorId: 'vip_inv_8892',
      fullName: 'Eng. Tamer Hegazy',
      tier: 'tier_1_ultra_hnw',
      totalPortfolioValueEGP: 145000000,
      assignedCloser: 'Leila Stage-9 Closer AI & Karim El-Shazly',
      conciergeWhatsAppChannel: '+201000000000',
    };

    const negotiations = [
      {
        dealId: 'deal_miv_142',
        compoundName: 'Mivida',
        unitType: 'Standalone Villa',
        askingPriceEGP: 38000000,
        currentOfferEGP: 35000000,
        status: 'contract_pending',
        lastActivityTime: new Date().toISOString(),
      },
      {
        dealId: 'deal_hp_88',
        compoundName: 'Hyde Park',
        unitType: 'Twin House',
        askingPriceEGP: 22000000,
        currentOfferEGP: 20500000,
        status: 'seller_countered',
        lastActivityTime: new Date().toISOString(),
      },
    ];

    const dashboard = VipConciergeEngine.buildDashboardState(profile, negotiations);

    return NextResponse.json({
      success: true,
      dashboard,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error ).message },
      { status: 500 }
    );
  }
}
