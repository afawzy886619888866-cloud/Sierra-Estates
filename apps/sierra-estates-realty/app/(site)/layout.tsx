import type { Metadata } from 'next';
import '../site-styles/shared.css';
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
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteProvider>{children}</SiteProvider>;
}
