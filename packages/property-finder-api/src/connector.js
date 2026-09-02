





















export class PropertyFinderConnector {
  /**
   * Sync catalog listings with transformation to Sierra schema
   */
   async syncCatalog(options = {}) {
    const started = Date.now();
    const syncId = `pf-sync-${Date.now()}`;

    // MOCK MODE: this never calls the real Property Finder API — see
    // packages/property-finder-api/src/index.ts's getAuthToken(), which is an
    // unimplemented placeholder. Callers must check result.mockMode rather than
    // assume a 'completed' status means real listings were synced.
    console.warn('[PropertyFinderConnector] MOCK MODE — returning sample data, not calling the real Property Finder API.');

    // Sample mock items matching PropertyFinder feed structure
    const sampleItems = [
      {
        id: 'pf-100291',
        reference: 'SE-HYP-VLA-0040-2026',
        title: '5 Bedroom Standalone Villa with Pool in Hyde Park',
        compound: 'Hyde Park',
        priceEgp: 35000000,
        bedrooms: 5,
        bathrooms: 6,
        areaSqm: 450,
        type: 'villa',
      },
      {
        id: 'pf-100292',
        reference: 'SE-MVD-APT-0041-2026',
        title: '3 Bedroom Modern Apartment in Mivida Gardens',
        compound: 'Mivida',
        priceEgp: 14500000,
        bedrooms: 3,
        bathrooms: 3,
        areaSqm: 195,
        type: 'apartment',
      },
      {
        id: 'pf-100293',
        reference: 'SE-UPC-PTH-0039-2026',
        title: 'Penthouse overlooking Lake in Uptown Cairo',
        compound: 'Uptown Cairo',
        priceEgp: 18500000,
        bedrooms: 4,
        bathrooms: 4,
        areaSqm: 320,
        type: 'penthouse',
      },
    ];

    const limit = options.limit || 50;
    const toSync = sampleItems.slice(0, limit);

    return {
      syncId,
      status: 'completed',
      totalFetched: toSync.length,
      totalSynced: toSync.length,
      totalErrors: 0,
      durationMs: Date.now() - started,
      mockMode: true,
      syncedListings: toSync,
    };
  }
}

export const propertyFinderConnector = new PropertyFinderConnector();
