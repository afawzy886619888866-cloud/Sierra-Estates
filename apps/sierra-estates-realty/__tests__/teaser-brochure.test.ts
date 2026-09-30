import { TearSheetGenerator, TearSheetListingInput } from '../../../packages/agents-core/src/memo-generator';
<<<<<<< HEAD
=======
import { POST as postTeaserGenerate } from '../app/api/teasers/generate/route';
import { POST as postWealthTearsheet } from '../app/api/wealth/tearsheet/route';
import { NextRequest } from 'next/server';
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1

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
      brokerPhone: '+201092048333',
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
<<<<<<< HEAD
=======

  describe('§21 no-fabrication: tear-sheet routes refuse to invent listings', () => {
    const postJson = (url: string, payload: unknown) =>
      new NextRequest(url, { method: 'POST', body: JSON.stringify(payload) });

    it('teasers/generate: empty body is a 400 with an explicit missing list', async () => {
      const res = await postTeaserGenerate(
        postJson('http://localhost:3000/api/teasers/generate', {}) as unknown as Request
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.missing).toContain('referenceId');
      expect(body.missing).toContain('compoundName');
      expect(body.missing).toContain('buaSqm');
      expect(body.missing).toContain('askingPriceEGP');
      expect(body.missing).toContain('brokerName');
      expect(body.tearSheet).toBeUndefined();
    });

    it('teasers/generate: no Hyde Park 35M demo villa is invented from partial input', async () => {
      const res = await postTeaserGenerate(
        postJson('http://localhost:3000/api/teasers/generate', { lang: 'en' }) as unknown as Request
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(JSON.stringify(body)).not.toContain('Hyde Park');
      expect(JSON.stringify(body)).not.toContain('35000000');
      expect(JSON.stringify(body)).not.toContain('Sierra Elite Desk');
    });

    it('wealth/tearsheet: empty body is a 400 with an explicit missing list', async () => {
      const res = await postWealthTearsheet(
        postJson('http://localhost:3000/api/wealth/tearsheet', {})
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.missing).toContain('referenceId');
      expect(body.missing).toContain('compoundName');
      expect(body.missing).toContain('askingPriceEGP');
      expect(body.tearSheet).toBeUndefined();
    });

    it('wealth/tearsheet: no Mivida 38M demo villa is invented from an empty call', async () => {
      const res = await postWealthTearsheet(
        postJson('http://localhost:3000/api/wealth/tearsheet', {})
      );
      const body = await res.json();

      expect(JSON.stringify(body)).not.toContain('Mivida');
      expect(JSON.stringify(body)).not.toContain('38000000');
      expect(JSON.stringify(body)).not.toContain('Sierra Advisor Desk');
    });

    it('teasers/generate: fully explicit input produces a truthful sheet', async () => {
      const res = await postTeaserGenerate(
        postJson('http://localhost:3000/api/teasers/generate', {
          referenceId: 'REF-REAL-001',
          title: 'Garden Apartment · Katameya Dunes',
          compoundName: 'Katameya Dunes',
          unitType: 'Apartment',
          buaSqm: 210,
          bedrooms: 3,
          bathrooms: 3,
          finishing: 'fully_finished',
          askingPriceEGP: 12500000,
          downPaymentPercent: 15,
          installmentTenureYears: 6,
          deliveryYear: 2027,
          brokerName: 'Sierra Estates Advisory',
          brokerPhone: '+201092048333',
        }) as unknown as Request
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.tearSheet.referenceId).toBe('REF-REAL-001');
      expect(body.tearSheet.compound).toBe('Katameya Dunes');
      expect(body.tearSheet.financialStructure.downPaymentEGP).toBe(1875000);
      expect(body.tearSheet.whatsAppBroadcastCopy.en).toContain('Katameya Dunes');
    });

    it('wealth/tearsheet: fully explicit input produces a truthful sheet', async () => {
      const res = await postWealthTearsheet(
        postJson('http://localhost:3000/api/wealth/tearsheet', {
          referenceId: 'REF-REAL-002',
          title: 'Twin House · Palm Hills',
          compoundName: 'Palm Hills',
          unitType: 'Twin House',
          buaSqm: 300,
          bedrooms: 4,
          bathrooms: 4,
          finishing: 'semi_finished',
          askingPriceEGP: 22000000,
          downPaymentPercent: 10,
          installmentTenureYears: 8,
          deliveryYear: 2028,
          brokerName: 'Sierra Estates Advisory',
          brokerPhone: '+201092048333',
        })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.tearSheet.referenceId).toBe('REF-REAL-002');
      expect(body.tearSheet.compound).toBe('Palm Hills');
    });

    it('land is honestly omitted (never invented) when the caller does not state it', async () => {
      const res = await postTeaserGenerate(
        postJson('http://localhost:3000/api/teasers/generate', {
          referenceId: 'REF-REAL-003',
          title: 'Apartment · Eastown',
          compoundName: 'Eastown',
          unitType: 'Apartment',
          buaSqm: 160,
          bedrooms: 2,
          bathrooms: 2,
          finishing: 'fully_finished',
          askingPriceEGP: 7400000,
          downPaymentPercent: 10,
          installmentTenureYears: 7,
          deliveryYear: 2027,
          brokerName: 'Sierra Estates Advisory',
          brokerPhone: '+201092048333',
        }) as unknown as Request
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.tearSheet.unitSpecs.land).toBeUndefined();
      expect(body.tearSheet.unitSpecs.bua).toBe('160 m²');
    });
  });
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
});
