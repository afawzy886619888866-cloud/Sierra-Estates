import { SavedViewsService } from '../lib/services/SavedViewsService';
import { parseDSL, applyFieldVisibility, type ParsedView } from '@sierra-estates/db';

describe('Phase 4: Broker Saved Views & Sierra DSL v2', () => {
  const sampleDSL = `COLLECTION listings
VISIBILITY broker
SHOW code, compound, propertyType, price, bedrooms
FILTER compound == "Mivida"
FILTER price >= 10000000
SORT price desc`;

  it('parses DSL v2 directives correctly into structured view specification', () => {
    const parsed = parseDSL(sampleDSL, 'listings');
    expect(parsed.collectionName).toBe('listings');
    expect(parsed.visibility).toBe('broker');
    expect(parsed.showFields).toEqual(['code', 'compound', 'propertyType', 'price', 'bedrooms']);
    expect(parsed.filters).toHaveLength(2);
    expect(parsed.filters[0]).toEqual({ field: 'compound', operator: '==', value: 'Mivida' });
    expect(parsed.filters[1]).toEqual({ field: 'price', operator: '>=', value: 10000000 });
    expect(parsed.sortBy[0]).toEqual({ field: 'price', direction: 'desc' });
  });

  it('saves and retrieves a broker view with round-trip fidelity', async () => {
    const saved = await SavedViewsService.saveView({
      title: 'Mivida Broker Exclusive',
      dsl: sampleDSL,
      visibility: 'broker',
      description: 'Hand-picked luxury resale units',
      createdBy: 'broker-test-1',
    });

    expect(saved.id).toBeDefined();
    expect(saved.title).toBe('Mivida Broker Exclusive');
    expect(saved.visibility).toBe('broker');
    expect(saved.shareUrl).toBe(`/broker/views/${saved.id}`);
    expect(saved.parsedView).toBeDefined();
    expect(saved.parsedView.showFields).toContain('compound');

    const fetched = await SavedViewsService.getView(saved.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(saved.id);
    expect(fetched?.title).toBe(saved.title);
  });

  it('lists views and respects visibility filter', async () => {
    const list = await SavedViewsService.listViews({ visibility: 'broker' });
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((v) => v.visibility === 'broker')).toBe(true);
  });

  it('enforces field visibility mask (hiding non-whitelisted fields)', () => {
    const parsed: ParsedView = {
      collectionName: 'listings',
      visibility: 'broker',
      showFields: ['code', 'compound', 'price'],
      showFieldsMap: { code: true, compound: true, price: true },
      hideFields: [],
      filters: [],
      sortBy: [],
      compounds: [],
      compareFields: [],
      aiTags: [],
      wrapCells: true,
      freezeColumns: 0,
      rawLines: [],
    };

    const rawListing = {
      code: 'MIV-101',
      compound: 'Mivida',
      price: 15000000,
      ownerPhone: '+201012345678', // sensitive field
      commissionRate: 0.025,       // sensitive internal field
    };

    const formatted = applyFieldVisibility(rawListing, parsed);
    expect(formatted.code).toBe('MIV-101');
    expect(formatted.compound).toBe('Mivida');
    expect(formatted.price).toBe(15000000);
    expect((formatted as any).ownerPhone).toBeUndefined();
    expect((formatted as any).commissionRate).toBeUndefined();
  });
});
