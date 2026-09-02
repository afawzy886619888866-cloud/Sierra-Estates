/**
 * Tests: lib/server/schemas.ts — the Zod contract for public API input,
 * plus the parseRequestBody / parseQueryParams helpers that turn a validation
 * failure into a standard 400.
 */
import {
  emailSchema,
  phoneSchema,
  localeSchema,
  isoDateSchema,
  currencySchema,
  leadCreateSchema,
  viewingRequestSchema,
  detailedViewingRequestSchema,
  closerInitiateSchema,
  conciergeAnalyzeSchema,
  conciergeSendWhatsAppSchema,
  listingsQuerySchema,
  wealthPortfolioQuerySchema,
  searchIntentSchema,
  semanticSearchSchema,
  isParseFailure,
  parseRequestBody,
  parseQueryParams,
} from '../lib/server/schemas';

function jsonRequest(body) {
  return new Request('https://sierra-estates.net/api/leads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('shared primitives', () => {
  it.each(['a@b.com', 'first.last+tag@sub.domain.co.uk'])('accepts email %s', (v) => {
    expect(emailSchema.safeParse(v).success).toBe(true);
  });

  it.each(['not-an-email', '', 'a@', '@b.com'])('rejects email %s', (v) => {
    expect(emailSchema.safeParse(v).success).toBe(false);
  });

  it('rejects an email longer than 254 characters', () => {
    expect(emailSchema.safeParse(`${'a'.repeat(250)}@b.com`).success).toBe(false);
  });

  it.each(['+201061399688', '0106 139 9688', '010 613-9688', '20(10)6139968'])(
    'accepts phone %s',
    (v) => {
      expect(phoneSchema.safeParse(v).success).toBe(true);
    },
  );

  it.each([
    ['too short', '12345'],
    ['too long', '+1'.padEnd(25, '0')],
    ['letters', '+20abcdefgh'],
    ['leading symbol', '-201061399688'],
  ])('rejects phone (%s)', (_label, v) => {
    expect(phoneSchema.safeParse(v).success).toBe(false);
  });

  it('rejects a phone that opens with a bracket, e.g. US-style "(010) 613-9688"', () => {
    // The regex anchors the first character to [+\d], so brackets are only
    // allowed after position 0. Egyptian numbers are unaffected; noted here
    // because the format is common in pasted international contact details.
    expect(phoneSchema.safeParse('(010) 613-9688').success).toBe(false);
  });

  it('accepts the supported locales and treats locale as optional', () => {
    expect(localeSchema.safeParse('en').success).toBe(true);
    expect(localeSchema.safeParse('ar').success).toBe(true);
    expect(localeSchema.safeParse(undefined).success).toBe(true);
    expect(localeSchema.safeParse('fr').success).toBe(false);
  });

  it('accepts parseable ISO dates and rejects junk', () => {
    expect(isoDateSchema.safeParse('2026-08-15T12:00:00.000Z').success).toBe(true);
    expect(isoDateSchema.safeParse('2026-08-15').success).toBe(true);
    expect(isoDateSchema.safeParse('not-a-date').success).toBe(false);
    expect(isoDateSchema.safeParse('').success).toBe(false);
  });

  it('accepts the supported currencies only', () => {
    expect(currencySchema.safeParse('EGP').success).toBe(true);
    expect(currencySchema.safeParse('GBP').success).toBe(false);
  });
});

describe('leadCreateSchema', () => {
  it('accepts a minimal valid lead', () => {
    const parsed = leadCreateSchema.safeParse({ name: 'Ahmed', email: 'a@b.com' });
    expect(parsed.success).toBe(true);
  });

  it('accepts a fully populated lead', () => {
    const parsed = leadCreateSchema.safeParse({
      name: 'Ahmed',
      email: 'a@b.com',
      phone: '+201061399688',
      message: 'Interested in Hyde Park',
      locale: 'ar',
    });
    expect(parsed.success).toBe(true);
  });

  it('requires a non-empty name', () => {
    expect(leadCreateSchema.safeParse({ name: '', email: 'a@b.com' }).success).toBe(false);
  });

  it('requires an email', () => {
    expect(leadCreateSchema.safeParse({ name: 'Ahmed' }).success).toBe(false);
  });

  it('rejects an over-long message', () => {
    const parsed = leadCreateSchema.safeParse({
      name: 'Ahmed',
      email: 'a@b.com',
      message: 'x'.repeat(2001),
    });
    expect(parsed.success).toBe(false);
  });
});

describe('viewing request schemas', () => {
  it('requires leadId and unitId', () => {
    expect(viewingRequestSchema.safeParse({ leadId: 'l1', unitId: 'u1' }).success).toBe(true);
    expect(viewingRequestSchema.safeParse({ leadId: '', unitId: 'u1' }).success).toBe(false);
    expect(viewingRequestSchema.safeParse({ leadId: 'l1' }).success).toBe(false);
  });

  it('allows portfolioId to be null or omitted', () => {
    expect(
      viewingRequestSchema.safeParse({ leadId: 'l1', unitId: 'u1', portfolioId: null }).success,
    ).toBe(true);
  });

  const validDetailed = {
    propertyCode: 'HP-VL-04',
    visitorName: 'Ahmed',
    visitorEmail: 'a@b.com',
    visitorPhone: '+201061399688',
    preferredDate: '2026-09-01T10:00:00.000Z',
  };

  it('accepts a valid detailed viewing request', () => {
    expect(detailedViewingRequestSchema.safeParse(validDetailed).success).toBe(true);
  });

  it('rejects an unparseable preferredDate', () => {
    expect(
      detailedViewingRequestSchema.safeParse({ ...validDetailed, preferredDate: 'soon' }).success,
    ).toBe(false);
  });

  it('bounds numberOfPeople to 1..20', () => {
    expect(
      detailedViewingRequestSchema.safeParse({ ...validDetailed, numberOfPeople: 0 }).success,
    ).toBe(false);
    expect(
      detailedViewingRequestSchema.safeParse({ ...validDetailed, numberOfPeople: 21 }).success,
    ).toBe(false);
    expect(
      detailedViewingRequestSchema.safeParse({ ...validDetailed, numberOfPeople: 4 }).success,
    ).toBe(true);
  });

  it('rejects a non-integer numberOfPeople', () => {
    expect(
      detailedViewingRequestSchema.safeParse({ ...validDetailed, numberOfPeople: 2.5 }).success,
    ).toBe(false);
  });
});

describe('closer / concierge schemas', () => {
  it('requires a phone but not an email for closer initiate', () => {
    expect(
      closerInitiateSchema.safeParse({
        propertyCode: 'HP-VL-04',
        visitorName: 'Ahmed',
        visitorPhone: '+201061399688',
      }).success,
    ).toBe(true);

    expect(
      closerInitiateSchema.safeParse({ propertyCode: 'HP-VL-04', visitorName: 'Ahmed' }).success,
    ).toBe(false);
  });

  it('requires non-empty concierge analysis text', () => {
    expect(conciergeAnalyzeSchema.safeParse({ text: 'hello' }).success).toBe(true);
    expect(conciergeAnalyzeSchema.safeParse({ text: '' }).success).toBe(false);
    expect(conciergeAnalyzeSchema.safeParse({ text: 'x'.repeat(20001) }).success).toBe(false);
  });

  it('caps a WhatsApp message at the 4096-character single-message limit', () => {
    expect(
      conciergeSendWhatsAppSchema.safeParse({ leadId: 'l1', message: 'x'.repeat(4096) }).success,
    ).toBe(true);
    expect(
      conciergeSendWhatsAppSchema.safeParse({ leadId: 'l1', message: 'x'.repeat(4097) }).success,
    ).toBe(false);
  });
});

describe('query schemas with coercion and defaults', () => {
  it('defaults the listings limit to 12 and coerces strings to numbers', () => {
    const parsed = listingsQuerySchema.parse({});
    expect(parsed.limit).toBe(12);

    const coerced = listingsQuerySchema.parse({ limit: '25', beds: '3', minPrice: '1000000' });
    expect(coerced.limit).toBe(25);
    expect(coerced.beds).toBe(3);
    expect(coerced.minPrice).toBe(1000000);
  });

  it('bounds the listings limit to 1..100', () => {
    expect(listingsQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(listingsQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });

  it('rejects a negative minPrice', () => {
    expect(listingsQuerySchema.safeParse({ minPrice: '-1' }).success).toBe(false);
  });

  it('defaults the portfolio market to null, preserving the searchParams contract', () => {
    const parsed = wealthPortfolioQuerySchema.parse({});
    expect(parsed.count).toBe(6);
    expect(parsed.market).toBeNull();
  });

  it('accepts the supported portfolio markets', () => {
    expect(wealthPortfolioQuerySchema.parse({ market: 'uae' }).market).toBe('uae');
    expect(wealthPortfolioQuerySchema.safeParse({ market: 'ksa' }).success).toBe(false);
  });
});

describe('searchIntentSchema', () => {
  it('applies defaults for an empty intent', () => {
    const parsed = searchIntentSchema.parse({});

    expect(parsed).toMatchObject({
      offerType: 'any',
      propertyType: 'any',
      currency: 'EGP',
      compounds: [],
      districts: [],
      furnishing: 'any',
      features: [],
      detectedLocale: 'en',
    });
  });

  it('accepts a fully specified intent', () => {
    const parsed = searchIntentSchema.parse({
      offerType: 'rent',
      propertyType: 'villa',
      bedsMin: 3,
      bedsMax: 5,
      priceMax: 250000,
      currency: 'EGP',
      compounds: ['Hyde Park'],
      districts: ['New Cairo'],
      furnishing: 'furnished',
      detectedLocale: 'ar',
    });

    expect(parsed.offerType).toBe('rent');
    expect(parsed.compounds).toEqual(['Hyde Park']);
  });

  it('rejects an unknown property type', () => {
    expect(searchIntentSchema.safeParse({ propertyType: 'castle' }).success).toBe(false);
  });

  it('bounds bedroom counts to 0..20 and requires integers', () => {
    expect(searchIntentSchema.safeParse({ bedsMin: -1 }).success).toBe(false);
    expect(searchIntentSchema.safeParse({ bedsMax: 21 }).success).toBe(false);
    expect(searchIntentSchema.safeParse({ bedsMin: 2.5 }).success).toBe(false);
  });
});

describe('semanticSearchSchema', () => {
  it('applies locale, limit and offset defaults', () => {
    const parsed = semanticSearchSchema.parse({ query: 'villa in new cairo' });

    expect(parsed).toMatchObject({ locale: 'en', limit: 12, offset: 0 });
  });

  it('requires a non-empty query', () => {
    expect(semanticSearchSchema.safeParse({ query: '' }).success).toBe(false);
    expect(semanticSearchSchema.safeParse({ query: 'x'.repeat(501) }).success).toBe(false);
  });

  it('accepts a partial intent override', () => {
    const parsed = semanticSearchSchema.parse({
      query: 'rent',
      intentOverride: { offerType: 'rent' },
    });

    expect(parsed.intentOverride).toMatchObject({ offerType: 'rent' });
  });

  it('expands a partial intentOverride with every schema default', () => {
    // ⚠️ `.partial()` makes fields optional but does NOT drop their defaults,
    // so an override of one field still materialises the whole intent. A caller
    // sending `{ offerType: 'rent' }` also silently asserts propertyType 'any',
    // currency 'EGP', empty compounds/districts, etc. — which will overwrite
    // anything the AI extraction inferred for those fields rather than leaving
    // them untouched. Pinned so the behaviour is visible if it is ever fixed.
    const parsed = semanticSearchSchema.parse({
      query: 'rent',
      intentOverride: { offerType: 'rent' },
    });

    expect(parsed.intentOverride).toEqual({
      offerType: 'rent',
      propertyType: 'any',
      currency: 'EGP',
      compounds: [],
      districts: [],
      features: [],
      furnishing: 'any',
      detectedLocale: 'en',
    });
  });
});

describe('isParseFailure', () => {
  it('narrows a failure result', () => {
    const failure = { success: false , errorResponse: {}  };
    expect(isParseFailure(failure)).toBe(true);
  });

  it('returns false for a success result', () => {
    expect(isParseFailure({ success: true , data: 1 })).toBe(false);
  });
});

describe('parseRequestBody', () => {
  it('returns typed data for a valid body', async () => {
    const result = await parseRequestBody(
      jsonRequest({ name: 'Ahmed', email: 'a@b.com' }),
      leadCreateSchema,
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Ahmed');
  });

  it('returns a 400 "Invalid JSON body" when the payload is not JSON', async () => {
    const req = new Request('https://sierra-estates.net/api/leads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json{',
    });

    const result = await parseRequestBody(req, leadCreateSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorResponse.status).toBe(400);
      await expect(result.errorResponse.json()).resolves.toEqual({
        success: false,
        error: 'Invalid JSON body',
      });
    }
  });

  it('returns a 400 with per-field details when validation fails', async () => {
    const result = await parseRequestBody(
      jsonRequest({ name: '', email: 'nope' }),
      leadCreateSchema,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorResponse.status).toBe(400);
      const body = await result.errorResponse.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'name' }),
          expect.objectContaining({ path: 'email', message: 'Invalid email address' }),
        ]),
      );
    }
  });
});

describe('parseQueryParams', () => {
  it('parses and coerces search params', () => {
    const url = new URL('https://sierra-estates.net/api/listings?limit=5&beds=3');

    const result = parseQueryParams(url, listingsQuerySchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(5);
      expect(result.data.beds).toBe(3);
    }
  });

  it('applies defaults when no params are supplied', () => {
    const result = parseQueryParams(
      new URL('https://sierra-estates.net/api/listings'),
      listingsQuerySchema,
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(12);
  });

  it('returns a 400 with details for invalid params', async () => {
    const url = new URL('https://sierra-estates.net/api/listings?limit=999');

    const result = parseQueryParams(url, listingsQuerySchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorResponse.status).toBe(400);
      const body = await result.errorResponse.json();
      expect(body.error).toBe('Invalid query parameters');
      expect(body.details[0].path).toBe('limit');
    }
  });
});
