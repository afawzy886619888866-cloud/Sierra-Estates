jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  lookupCompoundCoordinate,
  resolveCanonicalCompoundFuzzy,
  jaroWinklerSimilarity,
} from '../lib/server/compound-gazetteer';
import { PublishGate, type PublishGateUnit } from '../lib/services/publish-gate';
import { dispatchP0InboundToWorkflowRunner } from '../lib/server/p0-inbound-dispatch';

describe('Phase 4: Fuzzy Compound Gazetteer, Photo Alert Gate & P0 Inbound Speed-to-Lead', () => {
  describe('compound-gazetteer', () => {
    it('resolves Arabic and English compound aliases while preserving strict near-miss null rules', () => {
      expect(lookupCompoundCoordinate('ميفيدا التجمع')?.name).toBe('Mivida');
      expect(lookupCompoundCoordinate('هاي سيلو')?.name).toBe('Hyde Park');
      expect(lookupCompoundCoordinate('ماونتن فيو اي سيتي')?.name).toBe('Mountain View iCity');
      // Existing strict pin rule preserved:
      expect(lookupCompoundCoordinate('Hyde Parc')).toBeNull();
      expect(lookupCompoundCoordinate('Mivid')).toBeNull();
    });

    it('resolves spelling typos via Jaro-Winkler >= 0.82 in resolveCanonicalCompoundFuzzy', () => {
      expect(jaroWinklerSimilarity('Hyde Parc', 'Hyde Park')).toBeGreaterThanOrEqual(0.82);
      expect(resolveCanonicalCompoundFuzzy('Hyde Parc')?.name).toBe('Hyde Park');
      expect(resolveCanonicalCompoundFuzzy('Mivid')?.name).toBe('Mivida');
      expect(resolveCanonicalCompoundFuzzy('ميفيدا التجمع')?.name).toBe('Mivida');
    });
  });

  describe('PublishGate.evaluateWithPhotoAlert', () => {
    it('sends a Telegram-style alert when a direct-owner unit passes price/phone/compound checks but has < 3 photos', async () => {
      const notifyFn = jest.fn().mockResolvedValue(undefined);
      const unit = {
        id: 'u-42',
        code: 'SE-SL-MVD-042',
        title: 'Apartment · Mivida',
        propertyType: 'apartment',
        category: 'residential',
        status: 'available',
        dealType: 'sale',
        price: 8_500_000,
        priceCurrency: 'EGP',
        area: 185,
        bedrooms: 3,
        bathrooms: 3,
        compound: 'ميفيدا التجمع',
        ownerType: 'owner',
        ownerPhone: '+201012345678',
        publishStatus: 'PUBLISHABLE',
        availability: 'available',
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'staff@sierra-estates.net',
        dataQualityScore: 85,
        images: [
          'https://cdn.example.com/1.webp',
          'https://cdn.example.com/2.webp',
        ],
      } as PublishGateUnit & { code: string };

      const result = await PublishGate.evaluateWithPhotoAlert(unit, notifyFn);

      expect(result.eligible).toBe(false);
      expect(result.photoAlert).toBe(
        'Unit #SE-SL-MVD-042 has 2/3 photos — upload remaining photos to publish to Property Finder',
      );
      expect(result.photoAlertSent).toBe(true);
      expect(notifyFn).toHaveBeenCalledWith(result.photoAlert);
    });
  });

  describe('P0 Inbound Speed-to-Lead', () => {
    it('dispatches priority P0_INBOUND to workflows/13-paced-outreach/run', async () => {
      const prevUrl = process.env.WORKFLOW_RUNNER_URL;
      const prevKey = process.env.RUNNER_API_KEY;
      process.env.WORKFLOW_RUNNER_URL = 'http://127.0.0.1:2786';
      process.env.RUNNER_API_KEY = 'runner-key-123';

      const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 });
      try {
        const res = await dispatchP0InboundToWorkflowRunner(
          {
            leadId: 'PF-LEAD-900',
            phone: '+201099887766',
            name: 'Ahmed Hassan',
            reference: 'SE-SL-MVD-042',
            greetingBody: 'أهلاً أحمد، تم استلام طلبك على وحدة ميفيدا',
          },
          fetchMock as unknown as typeof fetch,
        );

        expect(res.dispatched).toBe(true);
        expect(res.priority).toBe('P0_INBOUND');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:2786/api/workflows/13-paced-outreach/run');
        const init = fetchMock.mock.calls[0][1] as RequestInit;
        expect((init.headers as Record<string, string>)['X-API-Key']).toBe('runner-key-123');
        const body = JSON.parse(String(init.body));
        expect(body.priority).toBe('P0_INBOUND');
        expect(body.leadId).toBe('PF-LEAD-900');
        expect(body.phone).toBe('+201099887766');
      } finally {
        process.env.WORKFLOW_RUNNER_URL = prevUrl;
        process.env.RUNNER_API_KEY = prevKey;
      }
    });
  });
});
