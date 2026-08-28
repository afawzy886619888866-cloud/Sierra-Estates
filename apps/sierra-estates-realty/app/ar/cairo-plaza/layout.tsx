import type { Metadata } from 'next';
import '../../site-styles/shared.css';
import '../../site-styles/site-refinements.css';

const SITE_URL = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://sierra-estates.net';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'مشروع كايرو بلازا · Sierra Estates',
    template: '%s · كايرو بلازا · Sierra Estates',
  },
  description:
    'استكشف أدلة مشروع كايرو بلازا، الجولة التوضيحية ثلاثية الأبعاد، الملف الاستثماري الثنائي، والوحدات المتاحة أمام محطة مترو المطرية.',
  icons: { icon: '/assets/logo-mark-96.png' },
  robots: { index: true, follow: true },
};

export default function CairoPlazaArLayout({ children }: { children: React.ReactNode }) {
  return children;
}
