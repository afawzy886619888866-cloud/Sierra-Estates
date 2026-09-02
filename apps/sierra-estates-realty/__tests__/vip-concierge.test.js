import {
  VipConciergeEngine,


} from '../../../packages/agents-core/src/vip-concierge';

describe('VipConciergeEngine State Consolidation', () => {
  it('builds comprehensive VIP investor state with briefing text', () => {
    const profile = {
      investorId: 'vip_001',
      fullName: 'Eng. Tamer Hegazy',
      tier: 'tier_1_ultra_hnw',
      totalPortfolioValueEGP: 145000000,
      assignedCloser: 'Leila Stage-9 Closer AI',
      conciergeWhatsAppChannel: '+201000000000',
    };

    const negotiations = [
      {
        dealId: 'deal_01',
        compoundName: 'Mivida',
        unitType: 'Standalone Villa',
        askingPriceEGP: 38000000,
        currentOfferEGP: 35000000,
        status: 'contract_pending',
        lastActivityTime: new Date().toISOString(),
      },
    ];

    const state = VipConciergeEngine.buildDashboardState(profile, negotiations);

    expect(state.profile.fullName).toBe('Eng. Tamer Hegazy');
    expect(state.activeNegotiations.length).toBe(1);
    expect(state.conciergeBriefingText.ar).toContain('سييرا كونسيرج');
    expect(state.conciergeBriefingText.en).toContain('Sierra VIP Concierge');
  });
});
