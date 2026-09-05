import { TearSheetGenerator, } from '../../../packages/agents-core/src/memo-generator';

describe('TearSheetGenerator Executive One-Pagers', () => {
  it('generates structured tear-sheet with financial milestones and WhatsApp copy', () => {
    const input = {
      referenceId: 'REF-MIV-099',
      title: 'Standalone Villa in Mivida',
      compoundName: 'Mivida',
      unitType: 'Standalone Villa',
      buaSqm: 380,
      bedrooms: 4,
      bathrooms: 4,
      finishing: 'ultra_lux',
      askingPriceEGP: 36000000,
      downPaymentPercent: 10,
      installmentTenureYears: 8,
      deliveryYear: 2026,
      brokerName: 'Karim El-Shazly',
      brokerPhone: '+201012345678',
    };

    const sheet = TearSheetGenerator.generateTearSheet(input);

    expect(sheet.compound).toBe('Mivida');
    expect(sheet.financialStructure.downPaymentEGP).toBe(3600000);
    expect(sheet.financialStructure.quarterlyInstallmentEGP).toBeGreaterThan(0);
    expect(sheet.whatsAppBroadcastCopy.ar).toContain('سييرا إستيتس');
    expect(sheet.whatsAppBroadcastCopy.en).toContain('SIERRA ESTATES');
  });
});
