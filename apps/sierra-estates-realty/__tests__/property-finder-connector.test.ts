/**
 * PropertyFinderConnector — Unit Tests
 * Covers: syncCatalog result shape, limit enforcement, singleton export.
 */
import { PropertyFinderConnector, propertyFinderConnector } from '../../../packages/property-finder-api/src/connector';

describe('PropertyFinderConnector', () => {
  let connector: PropertyFinderConnector;

  beforeEach(() => {
    connector = new PropertyFinderConnector();
  });

  it('syncCatalog resolves to a completed status', async () => {
    const result = await connector.syncCatalog();
    expect(result.status).toBe('completed');
  });

  it('syncCatalog result has a syncId string', async () => {
    const result = await connector.syncCatalog();
    expect(typeof result.syncId).toBe('string');
    expect(result.syncId.startsWith('pf-sync-')).toBe(true);
  });

  it('syncCatalog returns totalFetched === totalSynced with 0 errors', async () => {
    const result = await connector.syncCatalog();
    expect(result.totalErrors).toBe(0);
    expect(result.totalFetched).toBe(result.totalSynced);
  });

  it('default limit returns at most 3 sample items', async () => {
    const result = await connector.syncCatalog();
    expect(result.syncedListings.length).toBeLessThanOrEqual(3);
    expect(result.syncedListings.length).toBeGreaterThan(0);
  });

  it('limit of 1 returns exactly 1 listing', async () => {
    const result = await connector.syncCatalog({ limit: 1 });
    expect(result.syncedListings).toHaveLength(1);
    expect(result.totalFetched).toBe(1);
    expect(result.totalSynced).toBe(1);
  });

  it('limit of 2 returns exactly 2 listings', async () => {
    const result = await connector.syncCatalog({ limit: 2 });
    expect(result.syncedListings).toHaveLength(2);
  });

  it('limit larger than sample size returns all items', async () => {
    const result = await connector.syncCatalog({ limit: 100 });
    // Only 3 sample items exist
    expect(result.syncedListings.length).toBe(3);
  });

  it('each listing has required schema fields', async () => {
    const result = await connector.syncCatalog();
    for (const listing of result.syncedListings) {
      expect(typeof listing.id).toBe('string');
      expect(typeof listing.reference).toBe('string');
      expect(typeof listing.title).toBe('string');
      expect(typeof listing.compound).toBe('string');
      expect(typeof listing.priceEgp).toBe('number');
      expect(typeof listing.bedrooms).toBe('number');
      expect(typeof listing.bathrooms).toBe('number');
      expect(typeof listing.areaSqm).toBe('number');
      expect(typeof listing.type).toBe('string');
    }
  });

  it('all priceEgp values are positive', async () => {
    const result = await connector.syncCatalog();
    for (const listing of result.syncedListings) {
      expect(listing.priceEgp).toBeGreaterThan(0);
    }
  });

  it('all listings have valid bedrooms count (>0)', async () => {
    const result = await connector.syncCatalog();
    for (const listing of result.syncedListings) {
      expect(listing.bedrooms).toBeGreaterThan(0);
    }
  });

  it('durationMs is a non-negative number', async () => {
    const result = await connector.syncCatalog();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('singleton export is an instance of PropertyFinderConnector', () => {
    expect(propertyFinderConnector).toBeInstanceOf(PropertyFinderConnector);
  });

  it('singleton export syncCatalog resolves successfully', async () => {
    const result = await propertyFinderConnector.syncCatalog();
    expect(result.status).toBe('completed');
  });

  it('Hyde Park villa is in the sample catalog', async () => {
    const result = await connector.syncCatalog();
    const hyde = result.syncedListings.find((l) => l.compound === 'Hyde Park');
    expect(hyde).toBeDefined();
    expect(hyde!.bedrooms).toBe(5);
    expect(hyde!.type).toBe('villa');
  });

  it('Mivida apartment is in the sample catalog', async () => {
    const result = await connector.syncCatalog();
    const mivida = result.syncedListings.find((l) => l.compound === 'Mivida');
    expect(mivida).toBeDefined();
    expect(mivida!.type).toBe('apartment');
  });

  it('scripts/sync-propertyfinder.ts exists and imports propertyFinderConnector', () => {
    const fs = require('fs');
    const path = require('path');
    const scriptPath = path.resolve(__dirname, '../../../scripts/sync-propertyfinder.ts');
    expect(fs.existsSync(scriptPath)).toBe(true);
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('propertyFinderConnector.syncCatalog');
  });
});
