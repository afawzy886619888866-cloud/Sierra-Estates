import type { MetadataRoute } from 'next';
import snapshot from '@/lib/inventory/snapshot.json';
import waIngested from '@/data/whatsapp-ingested-units.json';

const SITE_URL = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://sierra-estates.net';

/**
 * Dynamic sitemap: static marketing routes + compound pages + one URL per
 * live catalog listing (from the committed snapshot, which the prebuild
 * `ensure-snapshot` step refreshes from the master sheet).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1.0, lastModified: now },
    { url: `${SITE_URL}/properties`, changeFrequency: 'hourly', priority: 0.9, lastModified: now },
    { url: `${SITE_URL}/compounds`, changeFrequency: 'daily', priority: 0.9, lastModified: now },
    { url: `${SITE_URL}/net`, changeFrequency: 'daily', priority: 0.8, lastModified: now },
    { url: `${SITE_URL}/matches`, changeFrequency: 'weekly', priority: 0.6, lastModified: now },
    { url: `${SITE_URL}/pricing`, changeFrequency: 'weekly', priority: 0.6, lastModified: now },
    { url: `${SITE_URL}/roi`, changeFrequency: 'weekly', priority: 0.6, lastModified: now },
    { url: `${SITE_URL}/advice`, changeFrequency: 'weekly', priority: 0.5, lastModified: now },
    { url: `${SITE_URL}/ai-engine`, changeFrequency: 'weekly', priority: 0.5, lastModified: now },
    { url: `${SITE_URL}/virtual-tour`, changeFrequency: 'monthly', priority: 0.4, lastModified: now },
    { url: `${SITE_URL}/explore`, changeFrequency: 'monthly', priority: 0.4, lastModified: now },
    { url: `${SITE_URL}/cairo-plaza`, changeFrequency: 'weekly', priority: 0.7, lastModified: now },
    { url: `${SITE_URL}/career`, changeFrequency: 'weekly', priority: 0.4, lastModified: now },
    { url: `${SITE_URL}/add-listing`, changeFrequency: 'monthly', priority: 0.5, lastModified: now },
    { url: `${SITE_URL}/notebookllm`, changeFrequency: 'monthly', priority: 0.3, lastModified: now },
    { url: `${SITE_URL}/ar`, changeFrequency: 'daily', priority: 0.8, lastModified: now },
    { url: `${SITE_URL}/ar/career`, changeFrequency: 'weekly', priority: 0.3, lastModified: now },
    { url: `${SITE_URL}/ar/virtual-tour`, changeFrequency: 'monthly', priority: 0.3, lastModified: now },
  ];

  // Live catalog listing pages
  const snapUnits: any[] = (snapshot as any)?.units || [];
  const waUnits: any[] = Array.isArray(waIngested) ? waIngested : [];
  const liveUnits = [
    ...waUnits.map((u) => ({ ...u, code: u.sierraCode || u.code || u.id })),
    ...snapUnits,
  ];
  const listingUrls: MetadataRoute.Sitemap = liveUnits
    .filter((u) => u && (u.code || u.id))
    .slice(0, 5000)
    .map((u) => ({
      url: `${SITE_URL}/property/${encodeURIComponent(String(u.code || u.id))}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
      lastModified: u.updatedAt || u.timestamp ? new Date(String(u.updatedAt || u.timestamp)) : now,
    }));

  return [...staticRoutes, ...listingUrls];
}
