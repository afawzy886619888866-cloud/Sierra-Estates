import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n-client';
import { ToastProvider } from '@/components/client/Toast';
import { AuthProvider } from '@/components/client/AuthModal';
import { SpeedInsights } from "@vercel/speed-insights/next";

const SITE_URL = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://sierra-estates.net';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Sierra Estates — Luxury Real Estate New Cairo',
    template: '%s · Sierra Estates',
  },
  description:
    'Discover premium properties in New Cairo with Sierra Estates — AI-scored listings, 52 compounds, smart matching, and ROI analytics.',
  keywords: [
    'New Cairo real estate', 'luxury properties Egypt', 'Fifth Settlement',
    'compounds New Cairo', 'property investment Cairo', 'Sierra Estates',
  ],
  icons: { icon: '/assets/logo-gold.png', apple: '/assets/logo-gold.png' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Sierra Estates',
    title: 'Sierra Estates — Luxury Real Estate New Cairo',
    description:
      'Premium properties in New Cairo: AI-scored listings, interactive compound map, smart matching, and ROI analytics.',
    images: [{ url: '/assets/logo-gold.png', width: 512, height: 512, alt: 'Sierra Estates' }],
  },
  twitter: {
    card: 'summary',
    title: 'Sierra Estates — Luxury Real Estate New Cairo',
    description: 'Premium properties in New Cairo with AI-scored listings and ROI analytics.',
    images: ['/assets/logo-gold.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the admin portal stamps data-theme/dir on <html>
    // from localStorage after hydration.
    <html lang="en" data-theme="light" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Inter:wght@300;400;500;600;700&family=Cairo:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
