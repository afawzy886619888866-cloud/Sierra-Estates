import type { Metadata } from 'next';
import '../site-styles/shared.css';
import '../site-styles/site-refinements.css';

const SITE_URL = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://sierra-estates.net';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Cairo Plaza · Sierra Estates',
    template: '%s · Cairo Plaza · Sierra Estates',
  },
  description:
    'Explore Cairo Plaza project evidence, interactive 3D tower massing, bilingual investor pack, and unit inventory in New Cairo.',
  icons: { icon: '/assets/logo-mark-96.png' },
  robots: { index: true, follow: true },
};

export default function CairoPlazaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
