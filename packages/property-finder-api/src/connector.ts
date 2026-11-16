import { getAuthToken, type PropertyFinderAtlasListing } from './index';

export interface SyncedPropertyFinderListing {
  id: string;
  reference: string;
  title: string;
  compound: string;
  priceEgp: number;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  type: string;
}

export interface PropertyFinderSyncResult {
  syncId: string;
  status: 'completed' | 'failed' | 'partial';
  totalFetched: number;
  totalSynced: number;
  totalErrors: number;
  totalRemoteAvailable?: number;
  durationMs: number;
  /** True when offline sample catalog is returned; false when live Atlas v1 API was queried. */
  mockMode: boolean;
  syncedListings: SyncedPropertyFinderListing[];
}

const SAMPLE_ITEMS: SyncedPropertyFinderListing[] = [
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

function extractCompoundFromTitle(title: string): string {
  const known = [
    'Hyde Park',
    'Mivida',
    'Mountain View',
    'Palm Hills',
    'Eastown',
    'Villette',
    'Madinaty',
    'Al Rehab',
    'Uptown Cairo',
    'Fifth Square',
    'Taj City',
    'Sarai',
    'Swan Lake',
    'Cairo Festival City',
    'Katameya Dunes',
    'Katameya Heights',
    'The Waterway',
    'Zed East',
    'Stone Residence',
    'Lake View',
  ];
  const lower = title.toLowerCase();
  for (const name of known) {
    if (lower.includes(name.toLowerCase())) return name;
  }
  return 'New Cairo';
}

export class PropertyFinderConnector {
  /**
   * Sync catalog listings with transformation to Sierra schema.
   * When `options.live === true` and Property Finder Enterprise Atlas credentials
   * (`PROPERTY_FINDER_API_KEY` + `PROPERTY_FINDER_API_SECRET`) are present, fetches
   * live listings from `https://atlas.propertyfinder.com/v1/listings`.
   * Otherwise returns deterministic offline sample items (`mockMode: true`).
   */
  public async syncCatalog(
    options: { limit?: number; since?: string; live?: boolean } = {},
  ): Promise<PropertyFinderSyncResult> {
    const started = Date.now();
    const syncId = `pf-sync-${Date.now()}`;
    const limit = Math.max(1, options.limit || 50);

    const hasLiveCreds = Boolean(
      process.env.PROPERTY_FINDER_API_KEY && process.env.PROPERTY_FINDER_API_SECRET,
    );

    if (options.live === true && hasLiveCreds) {
      const base = (process.env.PROPERTY_FINDER_API_GATEWAY || 'https://atlas.propertyfinder.com/v1').replace(/\/+$/, '');
      const token = await getAuthToken();
      const perPage = Math.min(100, limit);
      const res = await fetch(`${base}/listings?perPage=${perPage}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        throw new Error(`[PropertyFinderConnector] Atlas live /listings HTTP ${res.status}`);
      }

      const payload = (await res.json()) as {
        results?: PropertyFinderAtlasListing[];
        pagination?: { total?: number };
      };
      const rawResults = Array.isArray(payload.results) ? payload.results.slice(0, limit) : [];
      const syncedListings: SyncedPropertyFinderListing[] = [];
      let totalErrors = 0;

      for (const item of rawResults) {
        try {
          const titleEn = item.title?.en || item.title?.ar || `Property ${item.reference || item.id}`;
          const amounts = item.price?.amounts || {};
          const priceEgp = Number(amounts.sale ?? amounts.yearly ?? amounts.monthly ?? 0) || 0;
          const bedrooms = Math.max(0, parseInt(String(item.bedrooms ?? '0'), 10) || 0);
          const bathrooms = Math.max(0, parseInt(String(item.bathrooms ?? '0'), 10) || 0);
          const areaSqm = Math.max(0, Number(item.size ?? 0) || 0);
          syncedListings.push({
            id: String(item.id),
            reference: String(item.reference || `PF-${item.id}`),
            title: titleEn,
            compound: item.location?.name || extractCompoundFromTitle(titleEn),
            priceEgp,
            bedrooms,
            bathrooms,
            areaSqm,
            type: String(item.type || 'apartment').toLowerCase(),
          });
        } catch {
          totalErrors++;
        }
      }

      return {
        syncId,
        status: totalErrors > 0 && syncedListings.length > 0 ? 'partial' : 'completed',
        totalFetched: rawResults.length,
        totalSynced: syncedListings.length,
        totalErrors,
        totalRemoteAvailable: payload.pagination?.total ?? rawResults.length,
        durationMs: Date.now() - started,
        mockMode: false,
        syncedListings,
      };
    }

    const toSync = SAMPLE_ITEMS.slice(0, limit);

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
