import {
  ContractGeneratorEngine,


} from '../../../packages/agents-core/src/contract-engine';

describe('ContractGeneratorEngine Sales & Purchase Agreements', () => {
  it('generates complete bilingual SPA and escrow milestones', () => {
    const seller = {
      name: 'Emaar Misr Developments',
      nationalIdOrPassport: 'EG-COM-88910',
      nationality: 'Egyptian',
      address: 'Uptown Cairo, Mokattam, Cairo',
      phone: '+20224148000',
    };

    const buyer = {
      name: 'Dr. Karim Mansour',
      nationalIdOrPassport: '28911010102938',
      nationality: 'Egyptian',
      address: 'Fifth Settlement, New Cairo',
      phone: '+201099887766',
    };

    const property = {
      compoundName: 'Mivida',
      unitNumber: 'Villa 142-B',
      unitType: 'Standalone Villa',
      buaSqm: 390,
      totalPriceEGP: 38000000,
      downPaymentEGP: 3800000,
      quarterlyInstallmentEGP: 1068750,
      installmentTenureYears: 8,
      deliveryDateStr: 'December 2026',
    };

    const spa = ContractGeneratorEngine.generateSPA(seller, buyer, property);

    expect(spa.contractReference).toContain('SE-SPA-');
    expect(spa.articlesAr.length).toBe(4);
    expect(spa.articlesEn.length).toBe(4);
    expect(spa.articlesAr[0].content).toContain('Mivida');
    expect(spa.escrowMilestones.length).toBe(3);
    expect(spa.escrowMilestones.reduce((s, m) => s + m.releasePercent, 0)).toBe(100);
  });
});
