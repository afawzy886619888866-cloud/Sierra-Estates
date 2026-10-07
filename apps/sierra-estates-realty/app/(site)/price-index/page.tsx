import type { Metadata } from 'next';
import { PriceIndexService } from '@/lib/services/PriceIndexService';
import PriceIndexClient from './PriceIndexClient';
import '../../site-styles/pricing.css';
import '../../site-styles/site-refinements.css';

export const revalidate = 3600; // ISR cache for 1 hour

export async function generateMetadata(): Promise<Metadata> {
  const data = await PriceIndexService.getMonthlyPriceIndex();
  const period = data.period;
  const avg = data.marketSummary.avgPricePerSqm.toLocaleString();

  return {
    title: `Sierra Price Index (${period}) · New Cairo Real Estate Benchmark`,
    description: `Official monthly real estate price index for New Cairo compounds (${period}). Average price: ${avg} EGP/m² (+${data.marketSummary.momChangePercent}% MoM). Capital appreciation and rental yields benchmarked across 50+ compounds.`,
    keywords: [
      'New Cairo price index',
      'Egypt real estate prices 2026',
      'Fifth Settlement price per meter',
      'Mivida resale price',
      'Eastown price per sqm',
      'مؤشر أسعار القاهرة الجديدة',
      'سعر المتر في التجمع الخامس',
    ],
    openGraph: {
      title: `Sierra Price Index (${period}) · New Cairo Real Estate Benchmark`,
      description: `Authoritative monthly valuation benchmarks across New Cairo. Average price: ${avg} EGP/m², with MoM appreciation and 3Y ROI projections.`,
      url: 'https://sierra-estates.net/price-index',
      type: 'website',
      images: [
        {
          url: '/assets/logo-gold.png',
          width: 512,
          height: 512,
          alt: 'Sierra Price Index',
        },
      ],
    },
    alternates: {
      canonical: '/price-index',
    },
  };
}

export default async function Page() {
  const indexData = await PriceIndexService.getMonthlyPriceIndex();
  const schemaJsonLd = PriceIndexService.generateDatasetSchema(indexData);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJsonLd) }}
      />
      <PriceIndexClient initialData={indexData} />
    </>
  );
}
