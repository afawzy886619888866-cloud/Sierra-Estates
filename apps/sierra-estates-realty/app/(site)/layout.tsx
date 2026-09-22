import type { Metadata } from 'next';
import '../site-styles/shared.css';
import '../site-styles/site-refinements.css';
import { SiteProvider } from '@/lib/site/SiteContext';

const SITE_URL = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://sierra-estates.net';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Sierra Estates · Future of Real Estate',
    template: '%s · Sierra Estates',
  },
  description:
    'AI-curated rent & resale inventory across New Cairo — 50+ compounds, 1,900+ verified listings, RERA-licensed brokers.',
  icons: { icon: '/assets/logo-mark-96.png' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'Sierra Estates',
    title: 'Sierra Estates · Luxury Real Estate, New Cairo',
    description:
      'AI-curated rent & resale inventory across New Cairo — verified compounds, live availability, investment analytics.',
    url: SITE_URL,
    locale: 'en_US',
    alternateLocale: ['ar_EG'],
    images: [
      {
        url: '/assets/logo-gold.png',
        width: 512,
        height: 512,
        alt: 'Sierra Estates — Luxury Real Estate Intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sierra Estates · Luxury Real Estate, New Cairo',
    description:
      'AI-curated rent & resale inventory across New Cairo — verified compounds, live availability, investment analytics.',
    images: ['/assets/logo-gold.png'],
  },
  alternates: {
    canonical: '/',
    languages: { 'en': SITE_URL, 'ar': `${SITE_URL}/ar` },
  },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteProvider>{children}</SiteProvider>;
}
