import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import '../../site-styles/properties.css';
import '../../site-styles/verified-collection.css';
import PropertiesPage from './PropertiesPage';
import VerifiedCollection from '@/components/site/VerifiedCollection';
import LeadForm from '@/components/LeadForm';
import { createClient } from '../../../utils/supabase/server';

export const metadata: Metadata = {
  title: 'Properties Catalog',
  description:
    'AI-curated rent & resale inventory across New Cairo, every unit verified on-site.',
};

// The verified rail reads live Supabase data (cookie-bound SSR client under
// the public RLS policy) — the page renders per-request.
export const dynamic = 'force-dynamic';

/**
 * PUBLIC PROPERTY SHOWCASE — sierra-estates.net/properties
 *
 * Server Component contract (Unified Command Center): the verified collection
 * rail is fetched server-side through utils/supabase/server (createServerClient
 * over cookies, running under the public RLS policy from migration 020) with
 * the command center's freshness gate:
 *
 *     status = 'active' AND publish_status = 'PUBLISHABLE'
 *     AND stale = FALSE AND freshness_score >= 90   (migration 037)
 *
 * Below the rail, the full interactive catalog (map, filters, 7,600+ units)
 * renders exactly as before, and the Private Advisory card mounts the
 * LeadForm capture component (writes public.leads via /api/leads).
 */
export default async function Page() {
  const verified = await fetchVerifiedCollection();

  return (
    <>
      <section className="vc-section" aria-label="The verified collection">
        <div className="vc-wrap">
          <div className="vc-head">
            <div>
              <p className="vc-kicker">The Verified Collection</p>
              <h2 className="vc-title">Fresh, verified, on the ground</h2>
              <p className="vc-sub">
                Every residence below passed the Sierra verification desk and carries a live
                freshness score of 90% or higher — re-verified continuously by the Curator agent.
              </p>
            </div>
            <span className="vc-freshness-badge" title="Inventory freshness discipline — target ≥ 90%">
              Freshness gate
              <span className="vc-freshness-value">≥ 90%</span>
            </span>
          </div>

          <VerifiedCollection items={verified} />

          <div className="vc-advisory">
            <div className="vc-advisory-copy">
              <p className="vc-advisory-kicker">Private Advisory</p>
              <h3 className="vc-advisory-title">
                Tell us the life you want. Sierra finds the address.
              </h3>
              <p className="vc-advisory-text">
                One brief, and our concierge desk curates a private shortlist from the verified
                inventory — matched semantically by the Sierra AI Matchmaker, never a public blast.
              </p>
              <ul className="vc-advisory-points">
                <li>Curated shortlist within one business day</li>
                <li>Access to off-market verified inventory</li>
                <li>Bilingual advisory (EN / العربية), on your channel</li>
              </ul>
            </div>
            <div className="vc-advisory-form">
              <LeadForm source="portal_properties_advisory" />
            </div>
          </div>
        </div>
      </section>
      <PropertiesPage />
    </>
  );
}

// ─── Server-side verified fetch ────────────────────────────────────────────

interface VerifiedItem {
  id: string;
  seCode: string | null;
  code: string | null;
  title: string;
  compound: string | null;
  propertyType: string | null;
  dealType: string | null;
  price: number;
  priceCurrency: string | null;
  bedrooms: number | null;
  areaSqm: number | null;
  img: string | null;
  freshnessScore: number | null;
}

async function fetchVerifiedCollection(): Promise<VerifiedItem[]> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from('listings')
      .select(
        'id,se_code,code,title,compound,property_type,deal_type,price,price_currency,bedrooms,area_sqm,img,images,freshness_score',
      )
      .eq('status', 'active')
      .eq('publish_status', 'PUBLISHABLE')
      .eq('stale', false)
      .gte('freshness_score', 90)
      .order('freshness_score', { ascending: false })
      .limit(8);

    if (error || !data) {
      // Missing migration columns (pre-037) or an unconfigured project degrade
      // to the honest empty state — never fabricated listings (§21).
      return [];
    }

    return (data as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      seCode: (row.se_code as string | null) ?? null,
      code: (row.code as string | null) ?? null,
      title: String(row.title ?? row.compound ?? 'Verified residence'),
      compound: (row.compound as string | null) ?? null,
      propertyType: (row.property_type as string | null) ?? null,
      dealType: (row.deal_type as string | null) ?? null,
      price:
        typeof row.price === 'number'
          ? (row.price as number)
          : parseFloat(String(row.price ?? '0')) || 0,
      priceCurrency: (row.price_currency as string | null) ?? 'EGP',
      bedrooms: (row.bedrooms as number | null) ?? null,
      areaSqm: (row.area_sqm as number | null) ?? null,
      img:
        (row.img as string | null) ??
        (Array.isArray(row.images) && row.images.length > 0
          ? String(row.images[0])
          : null),
      freshnessScore: (row.freshness_score as number | null) ?? null,
    }));
  } catch {
    return [];
  }
}
