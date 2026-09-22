import React from 'react';
import type { Metadata, Viewport } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import {
  Plus_Jakarta_Sans,
  Inter,
  Cairo,
  JetBrains_Mono,
  Cormorant_Garamond,
  Playfair_Display,
} from 'next/font/google';
import './globals.css';

/*
 * Self-hosted brand typography (was: render-blocking Google Fonts @import in
 * globals.css). next/font downloads the families at build time and serves
 * them from /_next/static — no external CDN dependency, no font-swap flash,
 * faster first paint on Egyptian connections. CSS variables are consumed by
 * admin-portal.css, site-styles/shared.css and inline map styles with the
 * previous family names kept as fallbacks.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-cormorant',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sierra Estates - Luxury Real Estate New Cairo',
  description: 'Discover premium properties in New Cairo with Sierra Estates',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#071523' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      dir="ltr"
      className={[
        jakarta.variable,
        inter.variable,
        cairo.variable,
        jetbrains.variable,
        cormorant.variable,
        playfair.variable,
      ].join(' ')}
      suppressHydrationWarning
    >
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
