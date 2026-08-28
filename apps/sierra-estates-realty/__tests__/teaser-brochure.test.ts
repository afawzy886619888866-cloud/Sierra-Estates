import { TearSheetGenerator, TearSheetListingInput } from '../../../packages/agents-core/src/memo-generator';

describe('Luxury Property Brochure & Investment Teaser Suite', () => {
  it('generates a full luxury tear sheet with 5-year growth and rental forecast', () => {
    const input: TearSheetListingInput = {
      referenceId: 'REF-HYD-042',
      title: 'Luxury Signature Villa · Prime Lake View',
      compoundName: 'Hyde Park',
      unitType: 'Standalone Villa',
      buaSqm: 420,
      landSqm: 510,
      bedrooms: 5,
      bathrooms: 5,
      finishing: 'ultra_lux',
      askingPriceEGP: 38000000,
      downPaymentPercent: 10,
      installmentTenureYears: 7,
      deliveryYear: 2026,
      brokerName: 'Sierra Elite Desk',
      brokerPhone: '+201032206443',
    };

    const sheet = TearSheetGenerator.generateTearSheet(input);

    expect(sheet.referenceId).toBe('REF-HYD-042');
    expect(sheet.compound).toBe('Hyde Park');
    expect(sheet.financialStructure.downPaymentEGP).toBe(3800000);
    expect(sheet.financialStructure.quarterlyInstallmentEGP).toBeGreaterThan(0);
    expect(sheet.fiveYearForecast.projectedAppreciationPercent).toBeGreaterThan(0);
    expect(sheet.fiveYearForecast.netRentalYieldPercent).toBeGreaterThan(0);
    expect(sheet.whatsAppBroadcastCopy.ar).toContain('سييرا إستيتس');
    expect(sheet.whatsAppBroadcastCopy.en).toContain('Hyde Park');
  });
});
