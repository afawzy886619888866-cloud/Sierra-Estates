/**
 * 02-owner-search — direct-owner lead discovery (API-ONLY, evidence-based).
 *
 * PLACEHOLDER SCRAPING REMOVED (2026-10-25): the previous revision launched
 * Puppeteer against propertyfinder.eg with invented CSS selectors
 * ('.card-list .card', '.broker-name' — never the real DOM), treated every
 * extraction timeout as a SUCCESSFUL empty search, and classified a listing
 * as "owner-direct" whenever the broker field came back empty — which it
 * always did, because the selectors never matched anything. That is a
 * fabricated-success pipeline: it could only ever return "success: true,
 * leadsFound: 0" or, worse, mislabel scraped noise as owner-direct.
 *
 * The honest contract now:
 *   1. OFFICIAL API ONLY — no headless-browser scraping. Property Finder is
 *      queried through the partner API (same channel the ACTIVE production
 *      workflow workflows/02-owner-search uses), which respects the
 *      source's terms of service, access controls and rate limits.
 *   2. Extraction/access failures ARE failures. Timeout, HTTP 401/403
 *      (blocked), 429 (rate limit), non-JSON and malformed shapes each
 *      return an explicit { success: false, status } — never a successful
 *      empty search.
 *   3. Zero results from a HEALTHY response is the only "success with 0
 *      leads" case.
 *   4. OWNER-DIRECT REQUIRES POSITIVE EVIDENCE: a row is an owner lead
 *      only when the API row itself carries owner data (an owner object /
 *      owner contact). Missing broker data is NOT evidence of anything —
 *      extraction gaps never flip a listing to owner-direct.
 *   5. Unsupported platforms (olx, …) are reported as unsupported — no
 *      fake "integration pending" success.
 */

export type OwnerSearchStatus =
  | 'ok'
  | 'unconfigured'
  | 'blocked'
  | 'rate_limited'
  | 'timeout'
  | 'extraction_failed'
  | 'malformed_response'
  | 'unsupported_platform';

export interface OwnerLead {
  title: string;
  price: number | null;
  location: string;
  url: string;
  /** Positive-evidence marker recorded by the source itself. */
  ownerEvidence: 'owner_object' | 'owner_flag';
  /** Broker attribution when present (never inferred from absence). */
  broker: string | null;
}

export interface OwnerSearchResult {
  success: boolean;
  status: OwnerSearchStatus;
  leadsFound: number;
  leads: OwnerLead[];
  brokerListed: number;
  noOwnerEvidence: number;
  error?: string;
  timestamp: string;
}

const PF_API_BASE = (process.env.PROPERTY_FINDER_API_BASE || 'https://api.propertyfinder.com.eg/v3').replace(/\/+$/, '');
const PF_TOKEN = process.env.PROPERTY_FINDER_JWT_TOKEN || process.env.PROPERTY_FINDER_API_KEY || '';

type PfRow = {
  title?: string;
  price?: number | string | null;
  location?: { name?: string } | string | null;
  url?: string | null;
  owner?: { name?: string; phone?: string } | null;
  agent?: { name?: string; phone?: string } | null;
  owner_only?: boolean;
};

function priceToNumber(p: PfRow['price']): number | null {
  if (typeof p === 'number' && Number.isFinite(p)) return p;
  if (typeof p === 'string') {
    const m = p.replace(/,/g, '').match(/[\d.]+/);
    if (m) {
      const v = parseFloat(m[0]);
      if (Number.isFinite(v) && v > 0) return v;
    }
  }
  return null;
}

/**
 * Owner-direct classification from POSITIVE evidence only:
 *   · an explicit owner object with contact data, OR
 *   · the API's own owner_only flag on the row.
 * A missing/empty broker field is explicitly NOT consulted — the previous
 * "no broker ⇒ owner-direct" inference mislabeled extraction gaps as
 * ownership evidence.
 */
function ownerEvidenceOf(row: PfRow): OwnerLead['ownerEvidence'] | null {
  if (row.owner && (row.owner.phone || row.owner.name)) return 'owner_object';
  if (row.owner_only === true) return 'owner_flag';
  return null;
}

export async function runOwnerSearch(
  platform: 'propertyfinder' | 'olx',
  query: string,
  opts: { timeoutMs?: number; limit?: number } = {},
): Promise<OwnerSearchResult> {
  const timestamp = new Date().toISOString();
  const base: OwnerSearchResult = {
    success: false, status: 'ok', leadsFound: 0, leads: [], brokerListed: 0, noOwnerEvidence: 0, timestamp,
  };

  if (platform !== 'propertyfinder') {
    // No OLX integration exists — saying so beats a fake "pending" success.
    return { ...base, status: 'unsupported_platform', error: `platform '${platform}' has no authorized integration` };
  }
  if (!PF_TOKEN) {
    return { ...base, status: 'unconfigured', error: 'PROPERTY_FINDER_JWT_TOKEN / PROPERTY_FINDER_API_KEY missing' };
  }

  const params = new URLSearchParams({
    category_id: '1',
    purpose: 'sale',
    owner_only: 'true',
    q: query,
    limit: String(opts.limit ?? 50),
  });

  let res: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20000);
    try {
      res = await fetch(`${PF_API_BASE}/properties?${params.toString()}`, {
        headers: { Authorization: `Bearer ${PF_TOKEN}`, Accept: 'application/json' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error: any) {
    // Timeouts and network failures are FAILURES, not empty searches.
    const timedOut = error?.name === 'AbortError';
    return {
      ...base,
      status: timedOut ? 'timeout' : 'extraction_failed',
      error: error?.message ?? String(error),
    };
  }

  if (res.status === 401 || res.status === 403) {
    // Access restriction from the source — respect it, report it.
    return { ...base, status: 'blocked', error: `HTTP ${res.status}` };
  }
  if (res.status === 429) {
    return { ...base, status: 'rate_limited', error: 'HTTP 429' };
  }
  if (!res.ok) {
    return { ...base, status: 'extraction_failed', error: `HTTP ${res.status}` };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (error: any) {
    return { ...base, status: 'malformed_response', error: `non-JSON body: ${error?.message}` };
  }

  const rows = (data as { data?: unknown })?.data;
  if (!Array.isArray(rows)) {
    // A wrong-shaped payload is a FAILURE — the old code silently coerced
    // this to [] and reported a successful empty search.
    return { ...base, status: 'malformed_response', error: 'response .data is not an array' };
  }

  const leads: OwnerLead[] = [];
  let brokerListed = 0;
  let noOwnerEvidence = 0;

  for (const raw of rows) {
    const row = (raw ?? {}) as PfRow;
    const evidence = ownerEvidenceOf(row);
    if (!evidence) {
      // Broker-listed or unknown attribution — counted, never re-labeled.
      if (row.agent) brokerListed++;
      else noOwnerEvidence++;
      continue;
    }
    const location = typeof row.location === 'string' ? row.location : row.location?.name || '';
    leads.push({
      title: String(row.title || '').slice(0, 200),
      price: priceToNumber(row.price),
      location,
      url: row.url || '',
      ownerEvidence: evidence,
      broker: row.agent?.name || null,
    });
  }

  return { ...base, success: true, status: 'ok', leadsFound: leads.length, leads, brokerListed, noOwnerEvidence };
}

// Allow direct execution — honest smoke: unconfigured must NOT report success.
if (require.main === module) {
  runOwnerSearch('propertyfinder', 'mivida').then((res) => {
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.success ? 0 : 2);
  });
}
